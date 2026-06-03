# Study Buddy Finder

Web app for matching students with compatible study partners, scheduling sessions, real-time chat, and video calls.

**Stack:** React (Vite) · Django REST Framework · PostgreSQL · Django Channels · Daily.co (optional)

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL

## Local setup

### 1. Database

Create a PostgreSQL database named `studybuddy_db` (or set `DATABASE_URL` / `DB_*` in `Server/.env`).

### 2. Backend

```bash
cd Server
python -m venv venv
venv\Scripts\activate         
pip install -r requirements.txt
pip install -r requirements-dev.txt   
copy .env.example .env          
python manage.py migrate
python manage.py runserver
```

API runs at `http://127.0.0.1:8000/api`

Create an admin user:

```bash
python scripts/create_admin.py
```

### 3. Frontend

```bash
cd Client
npm install
copy .env.example .env
npm run dev
```

App runs at `http://localhost:3000`

## Features

- Student profiles, compatibility matching, buddy requests
- Real-time 1:1 chat (WebSocket)
- Study session scheduling and video calls
- Admin dashboard for users and reports

## Project structure

```
Client/                 React frontend
Server/                 Django API + WebSocket
.github/workflows/      CI/CD
render.yaml             Render Blueprint
```

## License

Individual Academic project — University of Moratuwa, IS 3920.
