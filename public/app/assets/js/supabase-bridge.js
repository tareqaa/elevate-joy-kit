/* ============================================================
   GX STORE — SUPABASE BRIDGE (static pages)
   Loads @supabase/supabase-js from CDN and creates a global
   `gxSupabase` client used by the storefront to save orders and
   read the current user's auth state.
   ============================================================ */

(function () {
  const SUPABASE_URL = 'https://pvwsktauvvxvmdpdzqrb.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d3NrdGF1dnZ4dm1kcGR6cXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjM1NjUsImV4cCI6MjEwMDkzOTU2NX0.iqwL3MJAcKJsmPceBm0ZyFEQa4m3wjcsisv31I9sgO4';

  function isNewSupabaseApiKey(value) {
    return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
  }

  function createSupabaseFetch(supabaseKey) {
    return (input, init) => {
      const headers = new Headers(
        typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
      );

      if (init && init.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }

      if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
        headers.delete('Authorization');
      }

      headers.set('apikey', supabaseKey);
      return fetch(input, Object.assign({}, init, { headers }));
    };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  window.gxSupabaseReady = loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js')
    .then(() => {
      window.gxSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { fetch: createSupabaseFetch(SUPABASE_KEY) },
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return window.gxSupabase;
    })
    .catch((e) => {
      console.warn('[GX] Supabase bridge failed to load:', e);
    });
})();
