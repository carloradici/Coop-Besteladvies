import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'
import type { Voortgang, Limiet } from '../types'

const LEEG: Voortgang = { pct: 0, tekst: '', bezig: false, stappen: 0, nu: '' }
const voortgang = atom({ plugin: 'voortgang-balk', key: 'voortgang' } as const, LEEG)
const limieten = atom({ plugin: 'voortgang-balk', key: 'limieten' } as const, [] as Limiet[])

const TOOL = 'mcp__voortgang-balk__voortgang'
const UITLEG = `Voortgangsbalk: de gebruiker ziet live een balk boven het tekstveld. Roep bij werk van meer dan één stap de tool ${TOOL} aan (stil, de gebruiker ziet de aanroep niet): meteen aan het begin met je inschatting, en daarna bij elke nieuwe fase (lezen, bouwen, testen, opleveren) met een oplopend percentage en 2-4 woorden over wat je nu doet. Schrijf daarnaast ook korte "⏳ xx% · wat"-regels in je tekst (niet elke app toont de balk).`

const NAAM: Record<string, string> = { five_hour: '5u', seven_day: 'wk', spend_limit: '€' }
const BEZIG: Record<string, string> = { Read: 'lezen', Grep: 'zoeken', Glob: 'zoeken', Edit: 'aanpassen', Write: 'schrijven', Bash: 'uitvoeren', Agent: 'hulpje', WebSearch: 'opzoeken', WebFetch: 'opzoeken', Skill: 'voorbereiden' }

function wanneer(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const min = Math.round((t - Date.now()) / 60000)
  if (min <= 0) return ''
  if (min < 60) return ` (${min}m)`
  if (min < 48 * 60) return ` (${Math.round(min / 60)}u)`
  return ` (${Math.round(min / 1440)}d)`
}

async function zetLimieten($: EngineInterface, rl: readonly Limiet[] | undefined) {
  if (rl && rl.length) await update($, limieten, () => rl.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.tool.register({
      name: 'voortgang',
      description: 'Zet de voortgangsbalk van de gebruiker: pct (0-100) en wat (2-4 woorden, Nederlands). Stil: geeft niets terug om te melden.',
      inputSchema: { type: 'object', properties: { pct: { type: 'number' }, wat: { type: 'string' } }, required: ['pct'] },
      isDeferred: false,
    })
    try { await zetLimieten($, (await $.session.usage()).rateLimits) } catch {}
    return r
  })

  on('tool.run', { tool: TOOL }, async ($, e) => {
    const inp = ((e as { input?: unknown }).input ?? e) as { pct?: unknown; wat?: unknown }
    const pct = Math.max(0, Math.min(100, Math.round(Number(inp.pct) || 0)))
    const wat = typeof inp.wat === 'string' ? inp.wat.slice(0, 40) : ''
    await update($, voortgang, v => ({ ...v, pct, tekst: wat || v.tekst, nu: wat || v.nu, bezig: true }))
    return { result: 'ok', text: 'ok' }
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return { sections: [...r.sections, { id: 'voortgang-balk:uitleg', text: UITLEG, scope: 'session' as const }] }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, voortgang, () => ({ ...LEEG, bezig: true, nu: 'denken' }))
    return next(e)
  })

  // Live: elke actie telt mee en schuift de balk een stukje op (nooit verder dan het volgende ijkpunt).
  on('tool.call', async ($, e, next) => {
    if (e.tool !== TOOL) {
      const nu = BEZIG[e.tool] || (e.tool.startsWith('mcp__') ? 'koppeling' : e.tool.toLowerCase())
      await update($, voortgang, v => ({ ...v, bezig: true, stappen: v.stappen + 1, nu, pct: Math.min(95, v.pct + (v.pct < 90 ? 1 : 0)) }))
    }
    return next(e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => (e.props.tool === TOOL ? <></> : next(e)))

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await update($, voortgang, v => ({ ...v, pct: 100, tekst: 'klaar', bezig: false, nu: '' }))
    return r
  })

  on('session.measure', async ($, e, next) => {
    await zetLimieten($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const v = await read($, voortgang)
    const rl = await read($, limieten)
    const { Box, Text } = $.ui.resolve(e)
    const vol = Math.round((v.pct / 100) * 8)
    const balk = '▰'.repeat(vol) + '▱'.repeat(8 - vol)
    const gebruik = rl.length
      ? rl.map(l => `${NAAM[l.kind] || l.kind} ${Math.max(0, Math.round(100 - l.percentUsed))}%${wanneer(l.resetsAt)}`).join(' · ')
      : 'gebruik ?'
    const wat = (v.bezig && v.nu ? v.nu : v.tekst).slice(0, 18)
    const links = v.bezig || v.pct ? `${v.bezig ? '⏳' : '✅'} ${balk} ${v.pct}%${wat ? ' ' + wat : ''}` : '💤 klaar voor opdracht'
    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text color={v.bezig ? 'yellow' : 'green'} wrap="truncate-end">{links}</Text>
        <Text dimColor wrap="truncate-end">🔋 {gebruik}</Text>
      </Box>
    )
  })
}
