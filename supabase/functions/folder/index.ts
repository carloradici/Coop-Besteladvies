import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/folder.js';
start(createClient, Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_X_oyYWBNmGl1_tMI-R3wnw_LAi45_me');
