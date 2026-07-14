# Study Buddy Finder — Code Review Presentation Script

> **Use this tomorrow** during your code review.  
> Estimated time: **20–30 minutes** (+ demo + Q&A)  
> Pair with: `docs/PERSONAL_UNDERSTANDING_GUIDE.md` for deeper prep.

---

## Opening (1 min)

**Say:**

> "Study Buddy Finder is a full-stack web app for Sri Lankan O/L and A/L students to find study partners, chat, run online video sessions, and keep notes and files organized.  
> Frontend is **React + Vite**, backend is **Django REST Framework + PostgreSQL**, realtime chat uses **Django Channels**, and video uses **Daily.co**.  
> I'll walk through architecture, the main user flows, and where the important code lives."

---

## Slide 1 — Architecture (3 min)

**Show this diagram (draw on board or screen):**

```
React (Client)  ──HTTP/REST──►  Django API (Server)  ──►  PostgreSQL
       │                              │
       └── WebSocket (/ws/chat/) ─────┘
       
External: Daily.co (video) | OpenAI (summaries) | Google (login)
```

**Key points:**

| Layer | Folder | Role |
|-------|--------|------|
| UI | `Client/src/pages/` | Screens users see |
| API clients | `Client/src/services/` | HTTP calls + token |
| Business logic | `Server/*/` Django apps | Rules, DB, integrations |
| Config | `Server/studybuddy/settings.py` | Auth, DB, CORS |

**Files to mention if asked:**
- Routes: `Client/src/App.jsx`
- API root: `Server/studybuddy/urls.py`

---

## Slide 2 — Auth (2 min)

**Say:**

> "We use **JWT**. Login returns an access token stored in localStorage. Every API request adds `Authorization: Bearer …` via an Axios interceptor. If the server returns 401, we log the user out. WebSockets pass the same token as a query parameter."

**Demo path:** Login → open DevTools → Application → localStorage → show `accessToken`

**Files:**
- `Client/src/services/api.js` — interceptor
- `Client/src/contexts/AuthContext.jsx` — session state
- `Server/users/views.py` — login/register
- `Server/chat/middleware.py` — WebSocket JWT

**If asked about security:**
- Passwords hashed, not stored plain
- DRF default permission: `IsAuthenticated`
- CORS restricted to known frontend origins

---

## Slide 3 — Matching (3 min)

**Say:**

> "Matching is a scoring engine, not random. We filter candidates by grade band, stream, shared subjects, and blocks. Then we score compatibility up to 100 based on subject overlap, strength/weakness complementarity, availability, exam year, medium, and learning style."

**Flow to narrate:**

```
Profile setup (subjects, strengths, availability)
    → GET /api/matches/recommendations/
    → matching.py scores all eligible users
    → User sends request → POST /api/matches/
    → Recipient accepts → can chat + invite to sessions
```

**Files:**
- `Server/matches/matching.py` — core algorithm
- `Server/matches/views.py` — API
- `Client/src/pages/student/MatchRecommendations.jsx` — UI

**Talking point:** Mentor mode allows cross-grade pairing for older students helping younger ones.

---

## Slide 4 — Chat (3 min)

**Say:**

> "We have two chat modes. **Direct messages** only work between accepted study buddies. **Group chat** is auto-created per study session. REST handles send/history; **WebSockets** push new messages instantly."

**Architecture:**

```
Send message → POST /api/messages/ → save to DB
              → push via Channels to recipient's socket group "user_{id}"
              → create notification
```

**Files:**
- DM: `Server/chat/views.py`
- Group: `Server/chat/room_views.py`, `Server/chat/group_chat.py`
- WebSocket: `Server/chat/consumers.py`, `Client/src/hooks/useChatSocket.js`

**Demo suggestion:** Open two browsers (Sarah + Amara), send message, show instant delivery.

**Honest note:** Notifications poll every 30s — not WebSocket yet.

---

## Slide 5 — Sessions & Video (4 min)

**Say:**

> "A session has a schedule, participants (max 5), a Daily.co video room, and a linked group chat. When the organizer starts the call, we record to Daily cloud. When they end it, we sync the recording and archive everything into the group chat."

**Lifecycle:**

| Step | API | What happens |
|------|-----|--------------|
| Create | `POST /sessions/` | DB row + Daily room + group chat + invites |
| Join video | `GET /sessions/{id}/video/` | Room URL + token |
| Start | `POST /sessions/{id}/start_meeting/` | `started_at` + cloud recording |
| End | `POST /sessions/{id}/end_meeting/` | Complete + stop recording + archive chat |
| Sync recording | `POST /sessions/{id}/sync_recording/` | Fetch from Daily API |

**Files:**
- `Server/study_sessions/views.py` — session endpoints
- `Server/study_sessions/video.py` — Daily.co integration
- `Server/study_sessions/recording_service.py` — save + post to chat
- `Client/src/components/sessions/SessionVideoModal.jsx` — video UI

**Demo suggestion:** Show Sessions page → session detail → group chat link → recording tab in chat info.

**Bug we fixed:** `timezone.utc` crash prevented recording sync — now backfilled from Daily.

---

## Slide 6 — Session Summary (3 min) ⭐ Often asked

**Say:**

> "Summary is **not automatic**. After a session, participants write pre/post notes. The organizer or any participant clicks **Generate Summary**. The backend collects all notes and the agenda, then either calls **OpenAI GPT-4o-mini** if an API key is set, or builds a **rule-based** summary from templates."

**Flow:**

```
Notes + Agenda  →  summary_service.generate_session_summary()
                        ├─ OPENAI_API_KEY + notes? → AI bullets + action items
                        └─ else → rule-based text
                  →  saved to SessionSummary table
                  →  shown in SessionLifecyclePanel
                  →  copied to group chat when session finalizes
```

**Files:**
- `Server/study_sessions/summary_service.py` — AI + fallback
- `Server/study_sessions/views.py` — `summary` action (~line 412)
- `Client/src/components/sessions/SessionLifecyclePanel.jsx` — Generate button

**If asked "why not auto?":**
> "Design choice — summary quality depends on notes being written first. Auto-generating on empty notes would produce useless output."

---

## Slide 7 — Vault & Files (2 min)

**Say:**

> "Subject Vault is personal file storage by subject. Users upload PDFs, notes, images. Click to preview in a full-screen overlay. They can rename, delete, or share directly into a DM or group chat."

**Files:**
- `Client/src/pages/student/SubjectVaultPage.jsx`
- `Client/src/components/vault/VaultPreviewPanel.jsx`
- `Server/study_sessions/views.py` — vault endpoints + preview stream

---

## Slide 8 — Notifications & Admin (2 min)

**Notifications:** Created on buddy events, session invites, new messages, recording ready. Stored in DB, polled by frontend.

**Admin:** Separate routes under `/admin` — user list, reports, stats. Role check: `user.role === 'ADMIN'`.

**Files:**
- `Server/notifications/services.py`
- `Client/src/contexts/NotificationContext.jsx`
- `Client/src/pages/admin/`

---

## Slide 9 — CI/CD & Hosting (3 min)

**Say:**

> "On every push to main, GitHub Actions runs backend checks with Postgres and frontend lint + build. Frontend deploys to **GitHub Pages**. Backend deploys to **Render** via Docker using `render.yaml`."

| Component | Platform |
|-----------|----------|
| Frontend | GitHub Pages (`/StudyBuddyFinder/`) |
| API + DB | Render (free tier) |
| CI | `.github/workflows/ci.yml` |
| Pages deploy | `.github/workflows/pages.yml` |

**Env vars:** Set on Render (API keys, CORS) and GitHub secrets (`VITE_API_URL` for build).

**Demo:** Show GitHub Actions green checkmarks if available.

---

## Slide 10 — Database overview (2 min)

**Say one line per group:**

- **users** — accounts, Sri Lankan curriculum fields, JSON for subjects/availability
- **matches** — buddy requests with compatibility score
- **study_sessions** — sessions, participants, notes, agenda, summary, recordings, vault
- **chat** — DMs + group rooms/messages
- **notifications** — in-app alerts
- **reports** — moderation

**File:** `Server/study_sessions/models.py` for session-related models.

---

## Live Demo Script (5–8 min) — pick 3–4

Run as **sarah@gmail.com** if seeded:

1. **Dashboard** → show overview
2. **Find Buddies** → explain compatibility score on a card
3. **Messages** → DM + open **group chat** for session #10
4. **Chat Info → Recordings tab** → play recording (session 5 or 7)
5. **Sessions** → open past session → lifecycle panel → show notes/summary section
6. **Subject Vault** → click PDF/txt → full-screen preview
7. **(Optional)** Join video on an upcoming session — mention Daily.co

---

## Closing (1 min)

**Say:**

> "In summary: React frontend, Django API, Postgres database, WebSockets for chat, Daily.co for video and recordings, optional OpenAI for summaries. The codebase is split by feature — users, matches, sessions, chat, notifications — with clear service layers on the frontend. Main areas for future work: Redis for multi-instance WebSockets, JWT refresh flow, and auto-summary after notes are submitted."

---

## Q&A Cheat Sheet

| Question | Short answer |
|----------|--------------|
| Why Django not Node? | Mature ORM, admin, Channels for WebSocket, team familiarity |
| How is compatibility calculated? | Weighted score in `matching.py` — subjects, strengths/weaknesses, availability, etc. |
| Is chat encrypted? | HTTPS/WSS in production; messages stored in DB |
| Max session size? | 5 participants (product choice; Daily supports more) |
| What if Daily is down? | Falls back to Jitsi URL — no cloud recording |
| Is summary always AI? | Only if `OPENAI_API_KEY` set and notes exist; else rule-based |
| Where are files stored? | `Server/media/` on disk (Render persistent disk) |
| How do parents view progress? | Token link `/parent/:token` — read-only dashboard |
| WebSocket scale? | In-memory channel layer — single instance OK; Redis needed for horizontal scale |
| Tests? | CI runs Django check + migrate + frontend build/lint |

---

## Files to have open during review

```
Client/src/App.jsx                          ← all routes
Client/src/services/api.js                  ← auth interceptor
Server/studybuddy/urls.py                   ← API map
Server/matches/matching.py                  ← matching algorithm
Server/study_sessions/summary_service.py    ← summary logic
Server/study_sessions/recording_service.py  ← recordings
Server/chat/group_chat.py                   ← session → group chat
.github/workflows/ci.yml                    ← CI pipeline
render.yaml                                 ← production hosting
```

---

## Presentation checklist (night before)

- [ ] Backend running: `python manage.py runserver`
- [ ] Frontend running: `npm run dev`
- [ ] Test login works (Sarah demo account)
- [ ] Confirm at least one vault file previews (PDF + txt)
- [ ] Confirm recording visible in chat (session 5 or 7)
- [ ] Skim `PERSONAL_UNDERSTANDING_GUIDE.md` sections 8 and 16
- [ ] GitHub Actions status green on `main`
- [ ] `.env` secrets NOT shared on screen

---

## One-paragraph elevator pitch (memorize)

> Study Buddy Finder connects Sri Lankan O/L and A/L students with compatible study partners using a weighted matching algorithm based on subjects, learning styles, and availability. Once matched, they chat in real time over WebSockets, schedule small group video sessions through Daily.co with automatic cloud recording, write collaborative notes, generate AI or rule-based session summaries, and store revision materials in a subject vault. The React frontend talks to a Django REST API backed by PostgreSQL, deployed on GitHub Pages and Render with GitHub Actions CI/CD.

---

*Good luck tomorrow. Speak slowly, demo one flow end-to-end, and point to files when you mention features.*
