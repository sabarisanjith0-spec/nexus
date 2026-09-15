# NEXUS

NEXUS is a futuristic real-time community chat web app.

## Current stack

- Static frontend: HTML + CSS + JavaScript
- Authentication: Supabase Auth
- Database: Supabase Postgres
- Realtime chat: Supabase Realtime / Postgres Changes

## Make the chat live

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run [`supabase.sql`](./supabase.sql).
3. Copy your Supabase Project URL and **Publishable Key** into [`supabase-config.js`](./supabase-config.js).
4. Enable email/password authentication in Supabase Auth.
5. Open `index.html` through a web host such as GitHub Pages.

The browser must only use the publishable/anon key. Never put a `service_role` or secret key in `supabase-config.js`.

## What works after setup

- Account signup and sign-in
- Persistent channels
- Persistent messages
- Cross-browser realtime message delivery
- Live member list
- Channel switching
- Search
- Sign out
- Responsive futuristic UI

Supabase's current JavaScript client supports email/password auth and Realtime database subscriptions. See the official documentation for current setup details.
