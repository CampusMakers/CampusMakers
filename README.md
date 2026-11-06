# Campus Makers _ CSC3100

### Roles
* **Scrum Master:** Sai Deekshitha
* **Product Manager:** Celeste
* **Lead Engineer:** Jarek
* **Tester:** Hunter

## Run authentication locally

Use Node 22 or newer. Install frontend dependencies with `cd frontend && npm install`.
Copy each `.env.example` to `.env` and fill in the Supabase project URL and **publishable** key (local files are already configured for Campus Makers). Never use a service-role or secret key in the frontend.

Start these in separate terminals from the repository root:

```sh
cd backend
npm run dev
```

```sh
cd frontend
npm run dev
```

Open the Vite URL and select Log in or Profile. Create an account, confirm the email Supabase sends, then return to the app and log in. Supabase manages passwords, persisted sessions, and token refresh. The frontend sends its access token to `/api/auth/me`; the backend validates it with Supabase Auth and requires a confirmed email. Settings → Log Out ends the session on this device. Confirmed `.edu` addresses qualify for seller access; browser role selections and metadata do not grant permissions.

Email confirmation links use the project's configured Supabase Site URL. Set it to your frontend URL in Authentication → URL Configuration for the environment you deploy. You can also confirm the email and manually return to the local app to sign in. Production hosting must proxy `/api` to the backend over HTTPS (the Vite development proxy is already configured). Auth endpoints and account verification are connected; listings, messages, and purchases still require their own backend implementation and authorization policies. Profile display edits remain local and are scoped to each account.

Checks: `cd backend && npm test`; `cd frontend && npm run build`.
