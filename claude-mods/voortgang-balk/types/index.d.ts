export type Voortgang = { pct: number; tekst: string; bezig: boolean; stappen: number; nu: string }
export type Limiet = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'voortgang-balk': { voortgang: Voortgang; limieten: Limiet[] }
  }
}
