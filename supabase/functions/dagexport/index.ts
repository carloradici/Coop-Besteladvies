import * as XLSX from 'npm:xlsx@0.18.5';
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/dagexport.js';
start(XLSX, webpush, createClient);
