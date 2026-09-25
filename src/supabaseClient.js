// Optional shared backend. If these env vars aren't set (e.g. local dev
// before Supabase is configured), `supabase` is null and storage.js falls
// back to plain localStorage.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
