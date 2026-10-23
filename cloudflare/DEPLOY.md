# Cloudflare deployment

The frontend's Vite development proxy runs only locally. Deploy this Worker together with `dist` so `/api/*` and `/uploads/*` reach Express instead of the static asset server.

1. Host the Express backend on a public HTTPS origin. `localhost:5000` cannot be reached from Cloudflare. Keep MongoDB configured on that backend.
2. Set the Worker's runtime variable `BACKEND_ORIGIN` to that HTTPS origin, without `/api` or another path.
3. On the backend set `FRONTEND_ORIGINS` to include `https://reverse-capital-explanation-distinguished.trycloudflare.com` (comma-separated with local origins if needed), and use `NODE_ENV=production` for Secure session cookies. Restart the backend.
4. Keep frontend `VITE_API_BASE_URL=/api`, then run `npm run build` and `npx wrangler deploy` using the intended Cloudflare account. Preserve the BACKEND_ORIGIN runtime variable when configuring deployment.
5. Confirm `/api/auth/me` returns JSON with HTTP 401 when logged out. Login should return a session cookie; refresh should keep the session. Test a saved POD through `/uploads/*` too.

Do not put MongoDB credentials in frontend VITE variables or the Worker. The backend handles authentication and database access.

Reference: https://developers.cloudflare.com/workers/static-assets/binding/
