# Study Buddy Finder — Personal Understanding Guide

> **How to read this:** Each section walks through one feature like a story — what the user does, what code runs, which file does it, and what gets saved in the database.  
> All paths start from the project folder: `studybuddyfinder/`

---

## The big picture (30 seconds)

You have two main parts:

- **`Client/`** — the website in the browser (React)
- **`Server/`** — the API + database logic (Django + PostgreSQL)

The browser **never** talks to the database directly. It always goes:

```
User clicks something
  → React page/component
  → *Service.js (HTTP request)
  → Django view
  → Model (database table)
  → JSON back to React
  → screen updates
```

---

## 1. Login & authentication (your example)

### What the user sees

User opens `/login`, types email + password, clicks **Sign In**.

### Step-by-step — what happens in code

**Step 1 — User types in the form**  
File: `Client/src/pages/auth/LoginPage.jsx`  
- Formik holds `email` and `password` in React state  
- On submit, it calls `login()` from AuthContext

**Step 2 — App-wide auth handler**  
File: `Client/src/contexts/AuthContext.jsx` → function `login()`  
- Calls `authService.login(email, password)`

**Step 3 — HTTP request is built**  
File: `Client/src/services/authService.js` → function `login()`  
- Sends `POST` to `/auth/login` with `{ email, password }`

**Step 4 — Axios adds base URL + (later) token**  
File: `Client/src/services/api.js`  
- Base URL comes from `Client/src/config/env.js` → `getApiUrl()`  
- Local dev: `http://127.0.0.1:8000/api`  
- So full URL: `POST http://127.0.0.1:8000/api/auth/login`

**Step 5 — Django receives the request**  
File: `Server/studybuddy/urls.py`  
- Routes `/api/auth/` → `Server/users/urls.py`  
- `urls.py` maps `login` → `views.login`

**Step 6 — Backend checks password**  
File: `Server/users/views.py` → function `login()`  
- Reads email/password from request body  
- Looks up user in DB: `User.objects.get(email=...)`  
- Django's `authenticate(username, password)` checks the **hashed** password  
- Password is **not** stored plain text — it's hashed in `users_user` table

**Step 7 — Token is created (NOT stored as a row in DB)**  
Same file: `RefreshToken.for_user(user)`  
- Uses `rest_framework_simplejwt` (configured in `Server/studybuddy/settings.py`)  
- Creates a signed **JWT access token** (and refresh token)  
- Token is like a temporary ID card — signed with `SECRET_KEY`, not a database row

**Step 8 — User info + token sent back as JSON**  
Response shape:
```json
{
  "user": { "id", "name", "email", "role", ... },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```
User data comes from `Server/users/serializers.py` → `UserSerializer`

**Step 9 — Browser saves the token**  
File: `Client/src/contexts/AuthContext.jsx`  
- `localStorage.setItem('accessToken', response.access_token)`  
- `localStorage.setItem('user', JSON.stringify(response.user))`  
- Token lives in **browser storage**, not in PostgreSQL

**Step 10 — Redirect**  
Same file — based on user:
- Admin → `/admin`
- Profile incomplete → `/profile/setup`
- Else → `/dashboard`

### Every request after login

**Step 1** — Any service calls `api.get(...)` or `api.post(...)`  
File: `Client/src/services/api.js`  
- Interceptor reads `localStorage.accessToken`  
- Adds header: `Authorization: Bearer eyJ...`

**Step 2** — Django validates token  
File: `Server/studybuddy/settings.py` → `JWTAuthentication`  
- If invalid/expired → **401**  
- `api.js` catches 401 → clears storage → redirects to login (`Client/src/config/env.js` → `getLoginPath()`)

### What is stored in the database for auth?

| What | Where |
|------|--------|
| Email, hashed password, profile | Table `users_user` — model in `Server/users/models.py` |
| JWT token | **Not in DB** — only in browser `localStorage` |
| Last active time | Updated on login in `Server/users/views.py` → `last_active_at` |

### Google login (same idea, different start)

**Step 1** — User clicks Google button  
File: `Client/src/components/auth/GoogleAuthBlock.jsx`  
- Google returns a `credential` (ID token)

**Step 2** — Sent to backend  
File: `Client/src/services/authService.js` → `googleLogin()`  
- `POST /api/auth/google`

**Step 3** — Verified and user created/found  
Files: `Server/users/views.py`, `Server/users/google_auth.py`  
- Same JWT response as email login

### WebSocket auth (chat)

File: `Client/src/hooks/useChatSocket.js`  
- Connects to `ws://127.0.0.1:8000/ws/chat/?token=eyJ...`  
File: `Server/chat/middleware.py`  
- Reads token from URL, validates JWT, attaches user to socket

---

## 2. Registration & profile setup

### Register

**User** fills form on `Client/src/pages/auth/RegisterPage.jsx`  
→ `AuthContext.register()`  
→ `Client/src/services/authService.js` → `POST /api/auth/register`  
→ `Server/users/views.py` → `register()`  
→ `Server/users/serializers.py` → `UserRegisterSerializer` creates row in **`users_user`**  
→ JWT returned, user sent to profile setup

### Profile setup (subjects, grade, availability)

**User** fills steps on `Client/src/pages/student/ProfileSetup.jsx`  
→ uses `Client/src/components/profile/ProfileFormSteps.jsx` for the form UI  
→ curriculum options from `Client/src/constants/curriculum/sl.js`  
→ `authService.updateProfile()` → `PATCH /api/auth/profile`  
→ `Server/users/views.py` → `update_profile()`  
→ Saves to **`users_user`**: grade, stream, medium, and JSON fields like `courses`, `study_preferences`, `availability`

**Why JSON in one column?**  
Subjects and availability are lists/objects — stored as JSON text in PostgreSQL, parsed in `Server/matches/matching.py` when matching.

---

## 3. Finding study buddies (matching)

### What the user sees

Opens **Find Buddies** — sees cards with compatibility scores.

### Step-by-step

**Step 1 — Page loads**  
File: `Client/src/pages/student/MatchRecommendations.jsx`  
→ calls `matchService.getRecommendations(...)`

**Step 2 — API call**  
File: `Client/src/services/matchService.js`  
→ `GET /api/matches/recommendations/?matchType=partner&sort=compatibility`  
(token attached automatically by `api.js`)

**Step 3 — Django view**  
File: `Server/matches/views.py` → action `recommendations()`  
→ calls matching engine

**Step 4 — Matching engine runs**  
File: `Server/matches/matching.py`  
1. Loads **your** profile from `users_user` (subjects, strengths, weaknesses, availability…)  
2. Loads **every other** eligible student  
3. **Filters out** people who: wrong grade/stream, no shared subject, blocked, already have a pending match  
4. **Scores** each remaining person (0–100): shared subjects, complementing strengths/weaknesses, same exam year, overlapping free times, etc.  
5. Returns sorted list

**Step 5 — JSON back to React**  
File: `Server/matches/serializers.py` → `RecommendationSerializer`  
→ cards render with name, score, subjects

### Nothing new is saved yet

Matching **reads** the database only. No new row until someone sends a request.

---

## 4. Sending & accepting a buddy request

### Send request

**User** clicks "Connect" on a card  
→ `Client/src/pages/student/MatchRecommendations.jsx`  
→ `matchService.sendMatchRequest(buddyId, message)`  
→ `POST /api/matches/` with `{ user2: buddyId, message }`  
→ `Server/matches/views.py` → `create()`  
→ Creates row in **`matches_match`**: `user1` = you, `user2` = them, `status` = `PENDING`, `compatibility_score`  
→ `Server/notifications/services.py` → `create_notification()` — row in **`notifications`** for recipient  
→ Buddy sees it on **Requests** page: `Client/src/pages/student/RequestsPage.jsx`

### Accept request

**User** clicks Accept  
→ `matchService.acceptMatch(id)`  
→ `POST /api/matches/{id}/accept/`  
→ `Server/matches/views.py` → updates **`matches_match.status`** to `ACCEPTED`  
→ Notification created for the other person  
→ **Now they can chat** — chat checks for `ACCEPTED` match before allowing messages

---

## 5. Direct messages (1-to-1 chat)

### Opening a chat

**User** clicks a buddy in sidebar  
File: `Client/src/pages/student/ChatPage.jsx`  
→ `chatService.getMessages(buddyId)`  
→ `GET /api/messages/with/{buddyId}/`  
→ `Server/chat/views.py`  
→ Reads from **`chat_message`** where sender/recipient are you and buddy

### Sending a text message

**Step 1** — User types and hits Send  
File: `Client/src/pages/student/ChatPage.jsx`

**Step 2** — API call  
File: `Client/src/services/chatService.js` → `sendMessage(recipientId, content)`  
→ `POST /api/messages/` with `{ recipient_id, content }`

**Step 3** — Backend saves message  
File: `Server/chat/views.py` → `create()`  
- Checks `_are_buddies()` — must have `ACCEPTED` match  
- Creates row in **`chat_message`**: sender, recipient, content, `message_type=TEXT`

**Step 4** — Real-time push to other person's browser  
File: `Server/chat/views.py` → `_notify_and_push()`  
→ `Server/chat/realtime.py` → `push_chat_message(recipient_id, payload)`  
→ Django Channels sends to WebSocket group `user_{recipient_id}`  
→ `Client/src/hooks/useChatSocket.js` receives event → UI updates without refresh

**Step 5** — Notification  
Same flow → `Server/notifications/services.py` → row in **`notifications`**

### Sending a file in chat

Same path, but multipart upload  
→ message saved with `message_type=FILE`  
→ file stored on disk: `Server/media/chat/...`  
→ path in **`chat_message.attachment`**  
→ displayed by `Client/src/components/chat/ChatMessage.jsx`

---

## 6. Group chat (session room)

### When is a group chat created?

**When a session is created** (see section 7)  
File: `Server/chat/group_chat.py` → `ensure_session_chat_room(session)`  
→ Creates **`chat_chatroom`** linked to session  
→ Adds members to **`chat_chatroommember`** (organizer + participants)

### Opening group chat

**User** goes to `/chat/room/1`  
File: `Client/src/pages/student/GroupChatPage.jsx`  
→ `chatService.getRoomMessages(roomId)`  
→ `GET /api/messages/rooms/{id}/messages/`  
→ `Server/chat/room_views.py`  
→ Reads **`chat_chatroommessage`**

### Sending in group chat

→ `POST /api/messages/rooms/{id}/send/`  
→ `Server/chat/room_views.py`  
→ saves **`chat_chatroommessage`**  
→ pushes via `Server/chat/realtime.py` → `push_room_message()`

### After session ends — archive messages

File: `Server/chat/group_chat.py` → `finalize_session_chat(session)`  
Called from `Server/study_sessions/views.py` → `end_meeting()`  
Posts system messages into the group: completed notice, agenda, notes, summary, recording link, vault files.

---

## 7. Creating a study session

### What the user does

Clicks **Create session**, fills title, subject, date, time, invites buddies.

### Step-by-step

**Step 1** — Modal form  
File: `Client/src/components/sessions/CreateSessionModal.jsx`

**Step 2** — Submit  
File: `Client/src/services/sessionService.js` → `createSession()`  
→ `POST /api/sessions/`

**Step 3** — Backend creates session  
File: `Server/study_sessions/views.py` → `create()`  
File: `Server/study_sessions/serializers.py` → `StudySessionCreateSerializer`

Creates in database:
- Row in **`study_sessions`**: title, course, scheduled time, status, max participants
- Row in **`session_participant`**: organizer + each invited buddy (status `invited` or `accepted`)
- Optional row in **`session_agenda`**: topics, goals

**Step 4** — Video room created  
File: `Server/study_sessions/video.py` → `create_video_room(session)`  
- If `DAILY_API_KEY` in `Server/.env`: creates room on Daily.co  
- Saves URL in **`study_sessions.video_room_url`**

**Step 5** — Group chat created  
File: `Server/chat/group_chat.py` → posts "session planned" message

**Step 6** — Notifications  
Each invitee gets row in **`notifications`** (`session_invite`)

**Step 7** — User sees session  
File: `Client/src/pages/student/StudySessionPage.jsx`  
→ `sessionService.getSessions('upcoming')`

---

## 8. Joining video & recordings

### Join video

**User** clicks Join Video on session card  
→ `sessionService.getVideoSession(sessionId)`  
→ `GET /api/sessions/{id}/video/`  
→ `Server/study_sessions/views.py` → returns `videoRoomUrl` + `meetingToken`  
→ `Client/src/components/sessions/SessionVideoModal.jsx` embeds Daily.co iframe

### Start call (organizer)

When modal opens → `sessionService.startMeeting(sessionId)`  
→ `POST /api/sessions/{id}/start_meeting/`  
→ Sets **`study_sessions.started_at`**  
→ `Server/study_sessions/video.py` → `start_cloud_recording()` tells Daily to record

### End call

User closes modal → `sessionService.endMeeting(sessionId)`  
→ `POST /api/sessions/{id}/end_meeting/`  
→ Sets **`study_sessions.ended_at`**, **`status=COMPLETED`**  
→ Stops recording on Daily  
→ `Server/study_sessions/recording_service.py` → fetches recording from Daily API  
→ Saves row in **`session_recording`**: download URL, duration  
→ Posts RECORDING message to chat (DM + group)  
→ `finalize_session_chat()` archives session to group

### Viewing recording in chat

File: `Client/src/components/chat/ChatMessage.jsx`  
- Message type `RECORDING`  
- Reads `metadata.recordingUrl` or `metadata.downloadUrl`  
- Shows `<video>` player

---

## 9. Session notes & summary

### Writing notes

**User** opens session detail → lifecycle panel  
File: `Client/src/components/sessions/SessionLifecyclePanel.jsx`  
→ `sessionService.saveNote(sessionId, note)`  
→ `POST /api/sessions/{id}/notes/`  
→ `Server/study_sessions/views.py`  
→ Saves **`session_note`**: pre/post text, weak topics, per user

### Generating summary (manual — not automatic)

**User** clicks **Generate summary**

**Step 1** — Frontend  
File: `Client/src/components/sessions/SessionLifecyclePanel.jsx`  
→ `sessionService.generateSummary(sessionId)`

**Step 2** — API  
→ `POST /api/sessions/{id}/summary/`  
→ `Server/study_sessions/views.py` → `summary()` action

**Step 3** — Load inputs from DB  
- All **`session_note`** rows for this session  
- **`session_agenda`** if exists

**Step 4** — Generate text  
File: `Server/study_sessions/summary_service.py` → `generate_session_summary()`  
- If `OPENAI_API_KEY` in env **and** notes exist → calls GPT-4o-mini → bullet summary + action items  
- Else → builds simple rule-based text from notes + agenda

**Step 5** — Save  
→ Row in **`session_summary`**: `summary_text`, `action_items`, `ai_generated` flag

**Step 6** — Show on screen  
Back to `SessionLifecyclePanel.jsx`

When session ends, summary is also copied into group chat by `finalize_session_chat()`.

---

## 10. Subject Vault (files)

### Upload

**User** picks subject + file on vault page  
File: `Client/src/pages/student/SubjectVaultPage.jsx`  
→ `sessionService.uploadVaultFileStandalone(file, { subject, title })`  
→ `POST /api/sessions/vault_all/` (multipart)  
→ `Server/study_sessions/views.py` → `vault_all()`  
→ File saved to disk: **`Server/media/vault/...`**  
→ Row in **`subject_vault_file`**: title, subject, file path, user id

### Preview

**User** clicks file tile  
File: `Client/src/components/vault/VaultFileTile.jsx` → opens  
File: `Client/src/components/vault/VaultPreviewPanel.jsx`  
→ fetches blob via `GET /api/sessions/vault_files/{id}/preview/`  
→ `Server/study_sessions/views.py` → streams file with login required

### Share to chat

→ `POST /api/sessions/vault_files/{id}/share/` with `{ buddyId }` or `{ roomId }`  
→ `Server/study_sessions/vault_share.py`  
→ Copies file into chat attachment  
→ New row in **`chat_message`** or **`chat_chatroommessage`** as FILE type

---

## 11. Notifications (bell icon)

### How they appear

File: `Client/src/contexts/NotificationContext.jsx`  
- Every **30 seconds** polls `GET /api/notifications/`  
- (Not WebSocket — polling only)

### How they are created

Something happens (buddy request, new message, session invite…)  
→ code calls `Server/notifications/services.py` → `create_notification(user, type, title, message, link)`  
→ Checks user preferences in their profile JSON  
→ Inserts row in **`notifications`**  
→ User sees it in `Client/src/components/common/NotificationDropdown.jsx`

---

## 12. Where is everything in the database?

View locally with **pgAdmin 4** (installed with PostgreSQL 18):

```
C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\pgAdmin4.exe
```

Connect to database **`studybuddy_db`** (credentials in `Server/.env`).

| Table | What it stores | Model file |
|-------|----------------|------------|
| `users_user` | Accounts, profiles, hashed passwords | `Server/users/models.py` |
| `matches_match` | Buddy requests | `Server/matches/models.py` |
| `study_sessions` | Sessions | `Server/study_sessions/models.py` |
| `session_participant` | Who's invited | same |
| `session_note` | Pre/post notes | same |
| `session_agenda` | Session plan | same |
| `session_summary` | Generated summary | same |
| `session_recording` | Video recording URLs | same |
| `subject_vault_file` | Uploaded files metadata | same |
| `chat_message` | 1-to-1 DMs | `Server/chat/models.py` |
| `chat_chatroom` | Group rooms | same |
| `chat_chatroommessage` | Group messages | same |
| `notifications` | Bell alerts | `Server/notifications/models.py` |

**JWT tokens are NOT in the database** — only in browser `localStorage`.

---

## 13. Hosting — where things run

| What | Where | Config file |
|------|-------|-------------|
| Website (React) | GitHub Pages | `.github/workflows/pages.yml` |
| API (Django) | Render | `render.yaml`, `Server/Dockerfile` |
| Database (production) | Render Postgres | `render.yaml` |
| Database (your PC) | PostgreSQL 18 local | `Server/.env` → `DATABASE_URL` |

**Local dev:**
```powershell
# Terminal 1 — API
cd Server
..\.venv\Scripts\python.exe manage.py runserver

# Terminal 2 — Website
cd Client
npm run dev
```

- Website: `http://localhost:3000`  
- API: `http://127.0.0.1:8000/api`  
- Django admin: `http://127.0.0.1:8000/admin/`

---

## 14. One full story (everything connected)

```
Sarah logs in
  → LoginPage.jsx → AuthContext → authService → users/views.py
  → password checked in users_user → JWT to localStorage

Sarah opens Find Buddies
  → MatchRecommendations.jsx → matching.py scores candidates

Sarah sends request to Amara
  → matches_match row PENDING → notification

Amara accepts
  → matches_match ACCEPTED

Sarah messages Amara
  → chat_message row → WebSocket push → Amara's screen updates

Sarah creates Geography session, invites Amara + Nina
  → study_sessions + session_participant + chat_chatroom + Daily room

They join video
  → SessionVideoModal.jsx + video.py

Sarah ends call
  → session_recording saved → recording message in chat

They write post-session notes
  → session_note rows

Sarah clicks Generate Summary
  → summary_service.py → session_summary row

Session archives to group chat
  → group_chat.py finalize_session_chat

Sarah uploads PDF to vault
  → subject_vault_file + file on disk

Sarah shares PDF to group chat
  → vault_share.py → chat_roommessage FILE
```

That one story uses **every major part** of the system.

---

## 15. Quick debug — "where do I look?"

| Problem | Start here |
|---------|------------|
| Login fails | `Client/src/pages/auth/LoginPage.jsx` → `Server/users/views.py` |
| Token not sent | `Client/src/services/api.js` |
| No buddy results | `Server/matches/matching.py` + check profile has subjects |
| Can't message someone | Need `ACCEPTED` match — `Server/chat/views.py` `_are_buddies()` |
| Chat not instant | `Client/src/hooks/useChatSocket.js` + `Server/chat/consumers.py` |
| Video won't start | `Server/.env` `DAILY_API_KEY` + `SessionVideoModal.jsx` |
| No recording | `Server/study_sessions/recording_service.py` |
| Summary empty | Write notes first; optional `OPENAI_API_KEY` |
| Can't see DB | pgAdmin or `python manage.py dbshell` in `Server/` |

---

*Last updated: July 2026 — narrative guide with file paths at each step.*
