import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/face.js';
import { geheimeSleutel } from '../_shared/stuur-push.js';
start(createClient, Deno.env.get('SUPABASE_URL'), geheimeSleutel());
