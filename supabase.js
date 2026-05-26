import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://vhmjcnmdhfsjhutrrgxq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobWpjbm1kaGZzamh1dHJyZ3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzUzMjUsImV4cCI6MjA5NTM1MTMyNX0.Isb4R-uoWLMh79gqJT-5MKyvv1ToBPQfm4_o-PGWZ2w';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Test if Supabase is reachable ──
export async function testConnection() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/', {
      headers: { apikey: SUPABASE_ANON }
    });
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Sign in with Google (popup flow) ──
export async function signInWithGooglePopup() {
  const redirectTo = window.location.origin + window.location.pathname;

  console.log('[Auth] Initiating Google popup sign-in, redirect to:', redirectTo);

  // Get the OAuth URL without redirecting the browser
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo,
      skipBrowserRedirect: true,
    }
  });

  if (error) return { error };
  if (!data?.url) return { error: { message: 'No OAuth URL returned from Supabase' } };

  // Open Google sign-in in a popup window
  const width  = 500;
  const height = 600;
  const left   = Math.round((screen.width  - width)  / 2);
  const top    = Math.round((screen.height - height) / 2);

  const popup = window.open(
    data.url,
    'google-signin',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
  );

  if (!popup) {
    return { error: { message: 'Popup blocked! Please allow popups for this site and try again.' } };
  }

  // Wait for the popup to redirect back and close
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      try {
        // Check if popup closed manually
        if (popup.closed) {
          clearInterval(interval);
          resolve({ error: { message: 'Sign-in popup was closed before completing.' } });
          return;
        }

        // Check if popup redirected back to our origin (same-origin check)
        const popupUrl = popup.location.href;
        if (popupUrl.startsWith(window.location.origin)) {
          clearInterval(interval);

          // Extract hash fragment from popup URL and apply to main window
          const hash = popup.location.hash;
          const search = popup.location.search;

          popup.close();

          if (hash && hash.includes('access_token')) {
            // Apply the auth tokens from popup to our main Supabase client
            window.location.hash = hash;
            // Let onAuthStateChange handle it — refresh to apply session
            window.location.reload();
          } else if (hash && hash.includes('error')) {
            const params = new URLSearchParams(hash.substring(1));
            resolve({ error: { message: params.get('error_description') || params.get('error') || 'OAuth error' } });
          } else {
            // No hash tokens — try reload to pick up session via cookie
            window.location.reload();
          }
        }
      } catch (e) {
        // Cross-origin error means popup is still on Google's domain — keep waiting
      }
    }, 500);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      resolve({ error: { message: 'Sign-in timed out. Please try again.' } });
    }, 120000);
  });
}

// ── Sign in with Google (redirect flow — fallback) ──
export async function signInWithGoogleRedirect() {
  const redirectTo = window.location.origin + window.location.pathname;

  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo,
    }
  });

  return { error };
}

// ── Sign in (tries popup first, falls back to redirect) ──
export async function signInWithGoogle() {
  return await signInWithGooglePopup();
}

export async function signOut() {
  await db.auth.signOut();
  window.location.reload();
}

export async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}
