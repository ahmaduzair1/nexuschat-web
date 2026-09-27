# Nexus Chat Web

React (JSX) + Vite + Tailwind CSS web client for **Nexus Chat**, sharing the same Firebase project as the Flutter app (`nexus-chat-1705c`).

## Features

- Email/password auth (+ phone OTP when enabled in Firebase)
- Chats / Status / Calls / Settings shell (bottom nav)
- Realtime chat list, messages, typing, read receipts, mute & pin
- New chat (email / phoneLast10 / name search) + group create
- 24h status with privacy modes
- Call history from Firestore (`calls` collection)
- Profile & privacy settings
- Media via Firestore `media` docs + `nexus://media/{id}` (no Storage billing)

## Quick start

```bash
cd "D:\webs\nexus chat web"
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

## Firebase Console steps

1. **Web app** — Project already has **Nexus Chat Web** (`1:916385935730:web:ee42b310f9636632086deb`). `src/firebase.js` uses that Web config (not the Android appId).
2. **Authentication → Sign-in method**: enable Email/Password; optionally enable Phone.
3. **Authentication → Settings → Authorized domains**: ensure `localhost` is listed (default for Firebase). Add your production domain when you deploy.
4. Ensure **Firestore** rules allow authenticated users (same rules as the Flutter app).
5. Phone OTP on web needs reCAPTCHA (invisible container is included on the login page).

### Dev server

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Open **http://127.0.0.1:5173** (preferred over `localhost` on some Windows setups).

## Project structure

```
src/
  firebase.js          # Firebase init (nexus-chat-1705c)
  context/AuthContext  # Auth + profile stream
  services/database.js # Firestore schema-compatible API
  pages/               # Chats, Status, Calls, Settings, …
  components/          # Avatar, bubbles, bottom nav, …
  lib/                 # chat ids, privacy, media helpers
```

## Theme

Exact Nexus tokens: emerald `#00C896` / `#00FFB2`, navy `#0A0E1A`, graphite surfaces, gold `#FFD700`, silver text scale. Fonts: **Plus Jakarta Sans** + **Space Grotesk**.
