import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wqnvisznrqlrcnbdutmi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxbnZpc3pucnFscmNuYmR1dG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDM0NTYsImV4cCI6MjA5MDA3OTQ1Nn0.zuncAxuJthKcBEPZAGznMOFzn_UIC4uqUP83ipHaHaQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
