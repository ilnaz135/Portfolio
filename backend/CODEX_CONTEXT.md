# Codex Backend Context

## Purpose

This file is a fast-start context for future backend tasks in this repo.
Use it to avoid re-analyzing the whole backend from scratch.

## Stack

- FastAPI app
- SQLAlchemy 2.x async ORM
- SQLite database at `backend/portfolio.db`
- Pydantic v2 schemas

## Entry Points

- App entry: `backend/main.py`
- App factory: `create_application()`
- Global API prefix: `/api/v1`
- Main router package: `backend/app/routes`

## Route Layout

- `POST /api/v1/setup`
  Creates tables and applies lightweight schema migration logic.
- `GET /api/v1/health`
  Health check.
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/{user_id}`
- `PUT /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`
- `POST /api/v1/users/login`
- `POST /api/v1/users/login/email`
- `POST /api/v1/users/check-username`
- `POST /api/v1/users/check-email`
- Nested user routes also exist for directions, courses, achievements, and stacks.

## Important Backend Files

- `backend/app/models/__init__.py`
  SQLAlchemy models.
- `backend/app/schemas/__init__.py`
  Pydantic request/response schemas.
- `backend/app/services/user_service.py`
  Main business logic for users.
- `backend/app/core/database.py`
  Engine, sessions, and schema/migration helper.
- `backend/app/core/exceptions.py`
  Custom API exceptions.
- `backend/seed_data.py`
  Seed script for demo/test data.

## Current User Model

`UserModel` currently includes:

- `id`
- `username`
- `password`
- `email`
- `user_directions`
- `first_name`
- `last_name`
- `patronymic`
- `cloude_storage`
- `academic_direction`
- `class_` mapped to DB column `class`
- `avg_score`
- `created_at`

Relations:

- `directions`
- `courses`
- `scientific_achievements`
- `stacks`

## Email Sync Rule

Email was added after the DB already existed, so schema sync matters.

- `backend/app/core/database.py` contains `ensure_database_schema()`
- It calls `ensure_users_email_schema()`
- If `users.email` is missing, it adds the column
- Existing rows are backfilled with `lower(username) + '@portfolio.local'`
- A unique index on `users(email)` is created if missing

This helper is used by:

- `POST /api/v1/setup`
- `backend/seed_data.py`

If the backend starts against an older DB, run setup or call the helper path before assuming schema is current.

## API / Schema Notes

- `UserCreateSchema` requires `email`
- `UserUpdateSchema` supports updating `email`
- `UserSchema` returns `email`
- `UserEmailLoginSchema` is used for `email + password` login check
- `UsernameCheckSchema` is used to check whether a username is already taken
- `EmailCheckSchema` is used to check whether an email is already taken
- account check endpoints return user `id` on success and `-1` on failure
- on `POST /api/v1/users`, if `academic_direction == ""`, `user_directions == ""`, `class == ""`, and `avg_score == 0.0`, the backend auto-generates replacement values before save
- `UserSchema` also currently returns `password`
  This is current behavior, not a recommendation. It is a security smell and should be changed if API hardening is requested.

## User Service Notes

`backend/app/services/user_service.py` already handles:

- unique username check
- unique email check
- proper API error for duplicate email
- eager loading for related collections in read endpoints
- login check by username/password
- login check by email/password
- both login checks now return user id instead of boolean
- username existence check
- email existence check
- random fallback generation for empty create-user profile fields

Important implementation detail:

- After `create_user()` and `update_user()`, the service re-reads the user with relations loaded before returning it.
- This was done to avoid FastAPI response serialization failures with async lazy-loading (`MissingGreenlet` on `directions/courses/scientific_achievements/stacks`).

## Known Gotchas

- `settings.debug` in `backend/app/core/config.py` is typed as `bool`
- If environment provides `DEBUG=release`, app import fails with a Pydantic validation error
- Safe values are boolean-like ones such as `true` / `false`

- PowerShell output may show mojibake for Russian text if console encoding is not UTF-8
- Source files themselves are UTF-8; do not treat garbled terminal output as file corruption by default

- `js/script.js` fetches `http://localhost:8000/api/v1/users`
- Frontend currently expects the users endpoint to return a list and then indexes it with `currentAccountId = 3`
- `GET /api/v1/users` is ordered by `created_at DESC`, so changing ordering may change which profile the frontend shows

## Seed Data Notes

- `backend/seed_data.py` now includes `email` for each seeded user
- Seed emails use `@portfolio.local`
- The script also ensures schema before seeding

## Quick Checks

From `backend`:

```bash
python main.py
```

```bash
python seed_data.py
```

```bash
curl http://localhost:8000/api/v1/users
```

```bash
curl -X POST http://localhost:8000/api/v1/setup
```

## Last Important State

- `email` is fully wired through model, schemas, service, seed data, README, and SQLite DB
- local `backend/portfolio.db` already contains `users.email`
- existing users were backfilled with `username@portfolio.local`
- duplicate email now returns HTTP 400 with a dedicated email error message
