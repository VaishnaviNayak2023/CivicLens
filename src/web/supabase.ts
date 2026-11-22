import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A browser-safe public client. Supabase persists its user session in localStorage.
// Never place a service-role key in VITE_* variables.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
