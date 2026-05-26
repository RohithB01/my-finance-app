const SUPABASE_URL  = 'https://vhmjcnmdhfsjhutrrg xq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobWpjbm1kaGZzamh1dHJyZ3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzUzMjUsImV4cCI6MjA5NTM1MTMyNX0.Isb4R-uoWLMh79gqJT-5MKyvv1ToBPQfm4_o-PGWZ2w';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
export const db = createClient(SUPABASE_URL, SUPABASE_ANON);

export async function signInWithGoogle() {
  await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

export async function signOut() {
  await db.auth.signOut();
  window.location.reload();
}

export async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}