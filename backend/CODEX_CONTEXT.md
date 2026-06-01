# Codex Project Context

This file is the fast-start context for future Codex work in this repo. It now covers
the whole project, even though it lives under `backend/`.

## Project Shape

- Product: student digital portfolio for UrFU / IRIT-RTF.
- Frontend: static HTML/CSS/vanilla JS pages in the repository root, `js/`, and
  `styles/`.
- Backend: FastAPI application in `backend/`.
- Database: SQLite at `backend/portfolio.db` in local/dev environments.
- Deployment snippet: `deploy/nginx/api.aix-team.tech.conf` proxies
  `api.aix-team.tech` to backend port `8001`.

## Important Files

- `index.html`
  Main authenticated profile/dashboard page.
- `loginindex.html`
  Login/register page.
- `achievementsindex.html`
  Authenticated scientific achievements page with tabbed tables and PDF export.
- `projectsindex.html`
  Authenticated projects workspace. Uses client-side mock projects, not a backend
  projects API.
- `studentsindex.html`
  Authenticated student list. Has large inline CSS/JS and generated mock students.
- `js/auth.js`
  Shared frontend auth/API client.
- `js/login.js`
  Login/register forms, validation, username/email availability checks.
- `js/script.js`
  Main profile page rendering and course add form.
- `js/achievements.js`
  Achievements tabs, API loading, and PDF export.
- `js/projects.js`
  Projects UI and mock project state.
- `js/global-search.js`
  Header student search/filter dropdown. Uses generated mock students.
- `js/stack-icons.js`
  Shared stack-to-Font-Awesome icon mapping.
- `js/theme.js`
  Shared dark/light theme toggle where `#themeToggle` exists.
- `styles/style.css`
  Main shared page/profile/header/footer/global search styles.
- `styles/login.css`
  Login/register page styles.
- `styles/achievements.css`
  Achievements page styles.
- `styles/projects.css`
  Projects workspace and course-form styles.
- `styles/global.css`
  Small global body reset/background.

## Frontend Runtime Notes

- Main pages set:
  `window.PORTFOLIO_API_BASE = "https://90.156.210.4/api/v1"`.
- `js/auth.js` uses that value first. If it is absent, it falls back to
  `${window.location.origin}/api/v1`, then `/api/v1`.
- For local backend testing, remember that the hard-coded API base can keep the
  frontend pointed at the remote IP unless it is changed or overridden.
- `loginindex.html` uses absolute asset paths like `/styles/login.css` and
  `/js/auth.js`; most other pages use relative paths. Serve from repository root
  when testing the static frontend.
- Frontend auth state is stored under `portfolio_auth_session`.
- `remember_me: true` stores auth in `localStorage`; otherwise it uses
  `sessionStorage`.
- `AuthClient.fetchWithAuth()` attaches a Bearer access token, refreshes once on
  HTTP 401 through `/auth/refresh`, and clears storage if refresh fails.
- `AuthClient.requireAuth()` redirects to `loginindex.html` when no valid session
  exists.

## Frontend Page Behavior

- `index.html`:
  - Requires auth.
  - Renders the current user from `/auth/me` by default.
  - Supports readonly foreign-profile view through
    `index.html?profileUserId={id}`. Project cards save a
    `portfolioProfilePreview` object in `sessionStorage` before navigating, so
    the profile page can render mock project people even without a public users
    API.
  - Renders profile, first two scientific achievement summaries, stacks, and courses.
  - Adding a course calls `POST /users/{id}/courses`.
  - The profile edit modal only changes the DOM locally; it does not call
    `PUT /users/{id}`.
- `loginindex.html`:
  - Redirects to `index.html` if already authenticated.
  - Login calls `POST /auth/login` with `login`, `password`, and `remember_me`.
  - Register calls `POST /auth/register`; it splits full name into
    `last_name`, `first_name`, and `patronymic`.
  - Username/email availability checks use public `/users/check-username` and
    `/users/check-email`.
- `achievementsindex.html`:
  - Requires auth.
  - Calls `GET /users/{id}/achievements`.
  - Supports `?profileUserId={id}` for readonly foreign-profile achievements:
    title becomes `Научные достижения у {username}`, a right-side back button
    returns to `index.html?profileUserId={id}`, and `portfolioProfilePreview`
    is used as fallback if the API does not allow loading another user's data.
  - Renders tab-specific tables for publications, events, grants, intellectual
    property, innovations, scholarships, internships, plus an "all" view.
  - Uses `html2pdf.js` from CDN for PDF export.
- `projectsindex.html`:
  - Requires a stored session.
  - Calls `/auth/me`; if that fetch fails despite a session, it falls back to a
    demo user.
  - Uses `marked` from CDN for Markdown preview.
  - In the "Список проектов" view, owner and Team Lead names are profile links.
    Clicking them stores `portfolioProfilePreview`, then opens
    `index.html?profileUserId={id}`. The card click still opens project details.
  - Project create/edit/filter/member changes are in-memory only.
- `studentsindex.html`:
  - Requires auth, but data is generated on the client.
  - Generates 187 students with deterministic pseudo-random data.
  - Student cards link to `index.html?profileUserId={id}` and save
    `portfolioProfilePreview` to `sessionStorage` before navigation, so the
    profile page opens the selected mock student in readonly mode.
  - Includes duplicated theme, settings, filters, score range, pagination, and
    rendering logic inline instead of using shared JS modules.
- `js/global-search.js`:
  - Also generates 187 mock students independently of `studentsindex.html`.
  - The profile filter is currently a no-op (`matchProfile = !profile || true`).

## Backend Stack

- FastAPI app.
- SQLAlchemy 2.x async ORM.
- SQLite via `aiosqlite`.
- Pydantic v2 / `pydantic-settings`.
- Server entry: `backend/main.py`.
- App factory: `create_application()`.
- Global API prefix: `/api/v1`.
- Main router package: `backend/app/routes`.
- Default port: `8001`.

## Backend Settings

- Settings live in `backend/app/core/config.py`.
- `.env` is supported.
- `DEBUG=debug`, `dev`, `development`, etc. parse as true.
- `DEBUG=release`, `prod`, `production`, etc. parse as false.
- `cors_origins` can be JSON list or comma-separated string.
- Defaults include `cors_origins=["*"]` and `cors_allow_credentials=True`.
- Password hashing uses a configurable `password_pepper`, defaulting to
  `portfolio-pepper`.

## Backend Auth

- Auth routes are under `/api/v1/auth`.
- Tokens are random server-side tokens, not JWTs.
- Only token hashes are stored in `auth_sessions`.
- Access token TTL default: 15 minutes.
- Refresh token TTL default: 7 days, or 30 days with remember-me.
- Passwords use scrypt with pepper from settings.
- Legacy `users.password` is retained for SQLite/schema compatibility, but new
  writes store `__legacy_hidden__` there and use `password_hash`.
- `AuthClient` should use the returned `access_token` as a Bearer token.

## Public Backend Endpoints

- `POST /api/v1/setup`
  Ensures tables and lightweight schema migrations.
- `GET /api/v1/health`
  Health check.
- `POST /api/v1/auth/register`
  Creates user and returns auth session.
- `POST /api/v1/auth/login`
  Login by username or email and returns auth session.
- `POST /api/v1/auth/refresh`
  Rotates access/refresh tokens from a refresh token body.
- `POST /api/v1/users`
  Legacy public user creation route.
- `POST /api/v1/users/check-username`
  Returns boolean.
- `POST /api/v1/users/check-email`
  Returns boolean.

## Protected Backend Endpoints

All routes below require Bearer auth unless noted otherwise by future changes.

- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
  Admin only.
- `GET /api/v1/users/{user_id}`
  Same user or admin.
- `PUT /api/v1/users/{user_id}`
  Same user or admin.
- `DELETE /api/v1/users/{user_id}`
  Same user or admin.
- `POST /api/v1/users/{user_id}/directions`
- `GET /api/v1/users/{user_id}/directions`
- `DELETE /api/v1/users/directions/{direction_id}`
- `POST /api/v1/users/{user_id}/courses`
- `GET /api/v1/users/{user_id}/courses`
- `DELETE /api/v1/users/courses/{course_id}`
- `POST /api/v1/users/{user_id}/stacks`
- `GET /api/v1/users/{user_id}/stacks`
- `DELETE /api/v1/users/{user_id}/stacks/{stack_id}`
- `GET /api/v1/users/{user_id}/achievements`
- `GET/POST /api/v1/users/{user_id}/achievements/publications`
- `DELETE /api/v1/users/achievements/publications/{publication_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/events`
- `DELETE /api/v1/users/achievements/events/{event_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/grants`
- `DELETE /api/v1/users/achievements/grants/{grant_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/intellectual`
- `DELETE /api/v1/users/achievements/intellectual/{intellectual_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/innovation`
- `DELETE /api/v1/users/achievements/innovation/{innovation_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/scholarships`
- `DELETE /api/v1/users/achievements/scholarships/{scholarship_id}`
- `GET/POST /api/v1/users/{user_id}/achievements/internships`
- `DELETE /api/v1/users/achievements/internships/{internship_id}`

## Backend Models

Defined in `backend/app/models/__init__.py`:

- `UserModel`
  Main profile. Includes username, legacy password, password_hash, email, profile
  fields, role, is_active, last_login_at, created_at.
- `AuthSessionModel`
  Server-side access/refresh sessions.
- `UserDirectionModel`
- `UserCourseModel`
- `UserPublicationModel`
- `UserEventModel`
- `UserGrantModel`
- `UserIntellectualPropertyModel`
- `UserInnovationModel`
- `UserScholarshipModel`
- `UserInternshipModel`
- `UserStackModel`

`UserModel.scientific_achievements` is a compatibility property. It aggregates
publication/event/grant/intellectual/innovation/scholarship/internship rows into
a flat list sorted by achievement date descending.

## Backend Schemas

- Schemas live in `backend/app/schemas/__init__.py`.
- `UserCreateSchema` requires `username`, `password`, `email`, name fields,
  `academic_direction`, `class`, and `avg_score`.
- `UserUpdateSchema` supports `password`, `email`, profile fields, `class`, and
  `avg_score`.
- `UserSchema` currently returns profile data, role/auth state, related
  directions/courses/stacks, tab-specific achievements, and the flat
  `scientific_achievements` summary.
- `UserSchema` does not expose `password`.
- `AuthSessionSchema` returns token data plus `user`.
- Achievement schemas are split by tab/category.

## Database Schema Sync

`backend/app/core/database.py` contains `ensure_database_schema()`.

It runs on FastAPI lifespan startup and from `POST /setup` and `seed_data.py`.
It creates all metadata tables and applies lightweight migrations:

- Adds/backfills `users.email` if missing.
- Creates a unique email index if missing.
- Adds `users.password_hash`, `users.role`, `users.is_active`, and
  `users.last_login_at` if missing.
- Backfills `password_hash` from legacy `password` where possible.
- Hides legacy plaintext passwords by replacing them with `__legacy_hidden__`
  once a hash exists.
- Backfills blank roles as `user` and null active flags as true.

## Services

- `backend/app/services/user_service.py`
  User CRUD, duplicate username/email checks, profile default generation,
  password hashing, eager loading of related collections.
- `backend/app/services/auth_service.py`
  Register, login, refresh, logout current session, logout all user sessions.
- `backend/app/services/stack_service.py`
  Stack CRUD helpers and duplicate stack check.

Important user service behavior:

- New/updated users are re-read with relationships loaded before response to
  avoid async lazy-loading serialization failures.
- If create payload has empty `academic_direction`, empty `user_directions`,
  empty `class`, and `avg_score == 0.0`, random profile defaults are generated.
- Email is normalized to lowercase.

## Seed Data

- `backend/seed_data.py` ensures schema before seeding.
- It creates 8 demo users.
- First seeded user has `role="admin"`; all others are `user`.
- Demo password is `password123`.
- Demo emails use `@portfolio.local`.
- It also creates:
  - 25 stack rows.
  - 16 direction rows.
  - 16 course rows.
  - 112 achievement rows across 7 achievement categories.
- The seed script does not clear existing rows first. Re-running against an
  already seeded database can hit unique username/email constraints.

## Local Run

From repository root:

```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```

Backend should listen at `http://localhost:8001`.

Optional seed:

```bash
cd backend
python seed_data.py
```

Useful checks:

```bash
curl http://localhost:8001/api/v1/health
curl -X POST http://localhost:8001/api/v1/setup
```

For authenticated routes, login first:

```bash
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ivan_petrov_1","password":"password123","remember_me":true}'
```

## Known Gotchas And Mismatches

- PowerShell output may show mojibake for Russian text. Source files are UTF-8;
  do not assume file corruption from garbled terminal output.
- The top-level and backend README files are partially stale and may show old
  paths without `/api/v1`.
- Most authenticated frontend pages point to `https://90.156.210.4/api/v1`, not
  local backend, because they set `window.PORTFOLIO_API_BASE`.
- `GET /api/v1/users` is admin-only now. Old assumptions that the profile page
  can fetch the public users list are obsolete.
- `js/script.js` course creation persists through the API, but then calls
  `fetchCurrentUser()` without `{ force: true }`. Because `AuthClient` caches the
  current user, the newly added course may not show until the cache is refreshed.
- `js/script.js` profile edit modal does not persist changes to the backend.
- `js/script.js` links scientific achievement titles to
  `ux-ui/achievementsindex.html`, while the actual page is
  `achievementsindex.html`.
- `js/script.js` randomizes course progress/complexity on render because the
  backend course schema does not contain those fields.
- `projectsindex.html` and `js/projects.js` do not use a backend projects API.
  Project changes are lost on page reload.
- `studentsindex.html` and `js/global-search.js` each generate mock students
  independently, so search/list data can diverge from real backend users.
- `login.js` frontend password validation allows only Latin letters and digits.
  Backend only enforces length.
- Backend email validation is length-only; it does not use `EmailStr`.
- `styles/style.css` contains shared header/footer/global-search CSS plus many
  profile-specific rules. Changes there can affect several pages.
- `studentsindex.html` is an outlier: it embeds most styles and scripts inline
  instead of using the shared `styles/` and `js/` modules.

## Current Important State

- Backend auth is token/session based and wired through frontend `AuthClient`.
- User responses no longer expose passwords.
- Achievements are split into seven persisted categories and also exposed as a
  flat compatibility summary.
- There is no persistent backend implementation for projects or the student
  directory/search pages yet.
- There are no automated tests in the repository at this time.
