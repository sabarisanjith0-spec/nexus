# NEXUS — Community OS

NEXUS is a futuristic, real-time community communication platform built for fast conversations, communities and collaboration.

## Product stack

- Frontend: semantic HTML + CSS + JavaScript modules
- Auth: Supabase Auth (email/password)
- Database: Supabase Postgres
- Live chat: Supabase Realtime / Postgres Changes
- Presence + typing: Supabase Realtime Presence/Broadcast
- Deployment: GitHub Pages via GitHub Actions
- PWA: Web App Manifest

## Production setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run [`supabase.sql`](./supabase.sql).
3. Put your Supabase Project URL and **Publishable Key** in [`supabase-config.js`](./supabase-config.js).
4. Enable email/password authentication in Supabase Auth.
5. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.
6. Push to `main`, or manually run **Deploy NEXUS** from Actions.
7. Add your deployed URL to Supabase Auth's allowed redirect/site URL settings.

Only a publishable/anon key belongs in the browser. Never expose a `service_role` or secret key.

## Included product features

- Real account signup/sign-in/sign-out
- Persistent multi-channel chat
- Cross-browser realtime message delivery
- Live presence and typing indicators
- Search and keyboard command shortcuts
- Draft persistence per channel
- Responsive desktop/mobile layout
- PWA install metadata and app icon
- Futuristic HUD/glass visual system
- Member presence panel
- Discovery, direct-message and voice-room UI foundations
- GitHub Pages deployment workflow

## Important deployment note

The repository contains the production frontend and backend schema, but the Supabase project itself is account-owned infrastructure. Add your own Supabase URL/key before the deployed app can authenticate users and persist chat data.

## Security

RLS is enabled for exposed application tables. Keep authorization rules in database policies rather than trusting browser-controlled metadata.
