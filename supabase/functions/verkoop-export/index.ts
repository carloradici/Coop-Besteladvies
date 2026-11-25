import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/verkoop-export.js';
// koppelcode staat als geheim in Supabase (Edge Functions › Secrets), niet in de openbare repo
start(createClient, Deno.env.get('VERKOOP_SLEUTEL'));
