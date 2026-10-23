const failure = (message, status) => Response.json({ success: false, message }, { status, headers: { 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!/^\/(api|uploads)(\/|$)/.test(url.pathname)) return env.ASSETS.fetch(request);
    let backend;
    try {
      backend = new URL(env.BACKEND_ORIGIN);
      if (backend.protocol !== 'https:' || backend.origin === url.origin || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash || ['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname)) throw new Error();
    } catch {
      return failure('The API backend is not configured. Set BACKEND_ORIGIN to the public HTTPS backend origin in Cloudflare.', 503);
    }
    backend.pathname = url.pathname;
    backend.search = url.search;
    const headers = new Headers(request.headers);
    headers.delete('host');
    // Preserve Origin, session cookies, user ID, request bodies, and Set-Cookie responses.
    // The backend must allow the deployed frontend in FRONTEND_ORIGINS.
    try {
      const response = await fetch(new Request(backend, request), { headers, redirect: 'manual' });
      const result = new Response(response.body, response);
      result.headers.set('Cache-Control', 'no-store');
      return result;
    } catch { return failure('The backend is unavailable. Please try again shortly.', 502); }
  },
};
