# SITREP — Creator Ops Deck (LuvMyMotion)

This is a real, hosted web app version of your Creator Ops Deck. Unlike the
in-chat prototype, this one has an actual backend, a real database, and can
automatically pull your posted YouTube videos (and, once you connect it,
your TikTok posts) instead of you pasting them in by hand.

I wrote and tested all of the code. A handful of steps below need **your**
logins (Google, TikTok, Vercel) — nobody, including an AI, can create
accounts or generate secret API keys on your behalf. Follow these in order;
it's about 20–30 minutes total, mostly clicking through account setup
screens.

---

## 0. What you need before you start
- A GitHub account (free) — vercel deploys from a git repo
- A Vercel account (free) — sign up at vercel.com with your GitHub account
- A Google account (for the YouTube API key)
- Your TikTok account (for the TikTok developer app)

---

## 1. Push this project to GitHub

```bash
cd sitrep-app
npm install
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on github.com (no README/license), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sitrep-app.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy to Vercel

1. Go to vercel.com → **Add New** → **Project**.
2. Import the `sitrep-app` GitHub repo you just pushed.
3. Leave all settings default → click **Deploy**.
4. It will deploy successfully but the app won't fully work yet — you still
   need to add the database and API keys below. Note your deployed URL,
   e.g. `https://sitrep-app-yourname.vercel.app`. You'll need it in step 4.

---

## 3. Add a real database (Redis via Upstash)

1. In your Vercel project → **Storage** tab → **Create Database**.
2. Choose **Redis** (powered by Upstash) from the marketplace.
3. Follow the prompts, then click **Connect** to link it to this project.
4. This automatically adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your
   project's environment variables — you don't need to type these in
   yourself.

---

## 4. Set your environment variables

In your Vercel project → **Settings** → **Environment Variables**, add each
of these (see `.env.example` in this project for the full list):

| Variable | Value |
|---|---|
| `APP_PASSWORD` | Any password you choose — this locks your dashboard so strangers can't see it |
| `YOUTUBE_API_KEY` | From step 5 below |
| `YOUTUBE_CHANNEL_HANDLE` | `LuvMyMotion` |
| `TIKTOK_CLIENT_KEY` | From step 6 below |
| `TIKTOK_CLIENT_SECRET` | From step 6 below |
| `TIKTOK_REDIRECT_URI` | `https://YOUR-VERCEL-URL/api/auth/tiktok/callback` (use your real deployed URL from step 2) |

After adding these, go to **Deployments** → click the **⋯** menu on the
latest deployment → **Redeploy**, so the new env vars take effect.

---

## 5. Get a YouTube Data API key (public data — no OAuth needed)

1. Go to console.cloud.google.com.
2. Create a new project (top-left project dropdown → **New Project**), any name.
3. In the search bar, search **"YouTube Data API v3"** → open it → click **Enable**.
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** →
   **API key**.
5. Copy the key. (Optional but recommended: click **Restrict Key** →
   restrict it to "YouTube Data API v3" only.)
6. Paste it into Vercel as `YOUTUBE_API_KEY`.

This key can only read public information (your channel's public video
list) — it cannot post, delete, or modify anything.

---

## 6. Register a TikTok developer app (needed for TikTok sync)

1. Go to developers.tiktok.com → **Manage Apps** → **Create an app**.
2. Fill in the basic app info (name, category — anything reasonable works).
3. Under **Products**, add **Login Kit**.
4. In the Login Kit settings, set the **Redirect URI** to exactly:
   `https://YOUR-VERCEL-URL/api/auth/tiktok/callback`
   (must match `TIKTOK_REDIRECT_URI` in Vercel exactly, including https://)
5. Under **Scopes**, make sure `user.info.basic` and `video.list` are
   enabled.
6. On the app's **Basic Information** page, copy the **Client Key** and
   **Client Secret** into Vercel as `TIKTOK_CLIENT_KEY` and
   `TIKTOK_CLIENT_SECRET`.

Note: new TikTok apps start in a sandbox/development mode. For syncing just
your own account, you can add your TikTok account as an authorized test
user in the app's dashboard without waiting for full app review — that's
enough for this to work for you personally.

---

## 7. Use the app

1. Visit your Vercel URL. Log in with the `APP_PASSWORD` you set.
2. Go to the **Pipeline** tab.
3. Click **🔄 Sync YouTube Now** — it'll pull every public video from your
   channel and drop them into your Published column.
4. Click **🔗 Connect TikTok** — you'll be sent to TikTok to approve access,
   then redirected back. After that, click **🔄 Sync TikTok Now** any time
   to pull your latest posts.
5. YouTube also auto-syncs once a day on its own (see `vercel.json` — you
   can change the schedule there). TikTok requires you to click sync
   manually since its tokens need periodic refreshing.

---

## Project structure

```
app/
  page.js                        redirects "/" to the dashboard
  login/page.js                  password login screen
  api/
    login/route.js               checks APP_PASSWORD, sets session cookie
    data/route.js                GET/PUT your app's data (profile, sessions, clips, videos)
    sync/youtube/route.js        pulls your public YouTube uploads
    sync/tiktok/route.js         pulls your posted TikToks (needs a connected account)
    auth/tiktok/login/route.js   starts the TikTok OAuth flow
    auth/tiktok/callback/route.js finishes the TikTok OAuth flow
    auth/tiktok/status/route.js  tells the frontend if TikTok is connected
public/
  dashboard.html                 the whole frontend (Directive, Pipeline, Repurposing, QC, Potential Score, Profile)
lib/
  kv.js                          Redis read/write helpers
  youtube.js                     YouTube Data API v3 calls
  tiktok.js                      TikTok OAuth + Display API calls
middleware.js                    password-gates every route
vercel.json                      daily YouTube auto-sync schedule
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Visit http://localhost:3000
