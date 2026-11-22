# Vidit — MVP видеоплатформы

Видеоплатформа в стиле Reddit: лента постов, голосование, вложенные комментарии,
подписки на авторов, теги, жалобы и модерация. Видео загружается напрямую в
S3-совместимое хранилище, транскодируется в 720p H.264 и раздаётся через CDN/S3.
Интерфейс на русском и английском.

## Стек

| Слой | Технологии |
| --- | --- |
| Web | Next.js 14 (App Router), React 18, Tailwind CSS, SWR, i18next |
| API | NestJS 10, Prisma 6, PostgreSQL 16, JWT + Google OAuth |
| Очередь | BullMQ + Redis 7 |
| Worker | Node.js, ffmpeg/ffprobe, AWS SDK v3, `pg` |
| Хранилище | S3-совместимое (MinIO локально, Selectel/Yandex/AWS в проде) |
| Монорепо | pnpm workspaces + Turborepo, общие типы в `@vp/shared` |

## Структура

```
apps/
  api/      NestJS API (REST, Prisma, OAuth, presigned upload, очередь)
  web/      Next.js клиент
  worker/   обработчик очереди transcode (ffmpeg)
packages/
  shared/   общие типы, константы, лимиты
docker-compose.yml   Postgres, Redis, MinIO (+ worker profile)
```

## Быстрый старт

Требования: Node.js >= 20 (рекомендуется LTS 20/22), pnpm 9.15.4, Docker,
`ffmpeg` в `PATH` (нужен worker'у для локального транскодинга).

```bash
# 1. Зависимости
npm install -g pnpm@9.15.4
pnpm install

# 2. Конфигурация
# Windows PowerShell:
Copy-Item .env.example .env
# macOS/Linux:
# cp .env.example .env

# 3. Инфраструктура (Postgres, Redis, MinIO + публичный бакет)
docker compose up -d

# 4. Схема БД (применит apps/api/prisma/migrations/0001_init)
pnpm db:migrate

# 5. Запуск web (3000), api (4000) и worker
pnpm dev
```

Откройте http://localhost:3000. MinIO-консоль — http://localhost:9001
(`minioadmin` / `minioadmin`).

### Google OAuth

1. В Google Cloud Console создайте OAuth Client (Web application).
2. Authorized redirect URI: `http://localhost:4000/auth/google/callback`.
3. Заполните `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в `.env`.
4. Перезапустите API.

Для продакшена redirect URI должен совпадать с `GOOGLE_CALLBACK_URL`
(например, `https://api.example.com/auth/google/callback`).

### Роли и админка

- Первый ADMIN: укажите свой Google-email в `ADMIN_EMAILS` до первого входа —
  роль выдаётся при логине.
- Дальше роли можно менять через `pnpm db:studio` (Prisma Studio).
- Админка: http://localhost:3000/admin — жалобы, очередь премодерации,
  удаление постов, бан пользователей.
- `PREMODERATION=true` скрывает новые посты до одобрения модератором.

### Worker локально

`pnpm dev` собирает и запускает worker. Ему нужны `ffmpeg`/`ffprobe` в `PATH`.
Без них посты получат статус `REJECTED` с причиной. Альтернатива — worker в
Docker (ffmpeg уже внутри):

```bash
docker compose --profile worker up -d --build
```

## Переменные окружения

Все переменные описаны в `.env.example`. Ключевые:

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (для Vercel — pooled URL) |
| `REDIS_URL` | Redis для BullMQ |
| `JWT_ACCESS_SECRET` | >= 32 символов, `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL_DAYS` | Время жизни токенов |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | OAuth |
| `WEB_URL` / `API_URL` | Публичные адреса (CORS, redirect) |
| `COOKIE_DOMAIN` / `COOKIE_SECURE` | Общая cookie для поддоменов / HTTPS |
| `S3_*` | Endpoint, бакет и ключи хранилища |
| `PUBLIC_S3_BASE_URL` | Публичный URL бакета (иначе presigned GET) |
| `PREMODERATION` / `ADMIN_EMAILS` | Модерация и админы |
| `NEXT_PUBLIC_API_URL` | Адрес API для браузера |
| `WORKER_CONCURRENCY` | Параллелизм транскодинга |

API валидирует обязательные переменные при старте и упадёт с понятной ошибкой,
если чего-то не хватает.

## Скрипты

| Команда | Действие |
| --- | --- |
| `pnpm dev` | web + api + worker в dev-режиме |
| `pnpm build` | production-сборка всех пакетов |
| `pnpm typecheck` | Проверка типов |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:deploy` | `prisma migrate deploy` (прод) |
| `pnpm db:studio` | Prisma Studio |

## Как работает загрузка видео

1. `POST /upload/presign` проверяет MIME/размер и возвращает presigned POST
   (ключ `videos/{userId}/{uuid}.{ext}`, лимит 100 МБ).
2. Браузер загружает файл напрямую в S3 с прогрессом.
3. `POST /posts` проверяет ключ (префикс пользователя + `HeadObject`) и создаёт
   пост в статусе `PENDING`.
4. API ставит job в очередь `transcode` (BullMQ/Redis).
5. Worker: `ffprobe` (не более 120 с) → `ffmpeg` 720p H.264/AAC, faststart →
   thumbnail → загрузка `videos/{authorId}/{postId}/720.mp4` и `thumb.jpg` →
   статус `READY`, исходник удаляется. При ошибке — `REJECTED` + причина.
6. Лента показывает только `approved` + `READY` посты; автор видит свой пост
   со статусом обработки (страница поста опрашивает API).

## Основные маршруты API

- `GET /health`
- `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/refresh`,
  `POST /auth/logout`
- `GET /users/me`, `GET /users/:id`
- `GET /posts` (`sort=new|top|hot`, `q`, `tags`, `feed=subs`, `authorId`,
  `cursor`, `limit`), `POST /posts`, `GET /posts/:id`, `DELETE /posts/:id`
- `GET|POST /posts/:postId/comments`, `PATCH|DELETE /comments/:id`
- `POST /votes` (`POST`/`COMMENT`, `-1|0|1`)
- `GET|POST /subscriptions`, `DELETE /subscriptions/:targetId`
- `POST /reports`
- `POST /upload/presign`
- `GET /tags`
- Админ: `GET /admin/reports`, `PATCH /admin/reports/:id`,
  `GET /admin/posts/pending`, `PATCH /admin/posts/:id/approve`,
  `POST /admin/users/:id/ban`

Аутентификация: access JWT (15 мин) в заголовке `Authorization: Bearer`,
refresh — httpOnly cookie с ротацией и хранением SHA-256 хэша в БД.

## Деплой

### Web — Vercel

- Root Directory: `apps/web`.
- Env: `NEXT_PUBLIC_API_URL=https://api.example.com`.
- Framework: Next.js (настройки по умолчанию).

### API — Vercel

- Root Directory: `apps/api`.
- `apps/api/vercel.json` уже задаёт сборку (`prisma generate && nest build`),
  includeFiles для `dist`/Prisma и rewrite всех путей на `/api`.
- Env: `DATABASE_URL` (pooled, `sslmode=require`), `REDIS_URL` (TCP-провайдер,
  например Upstash), `JWT_ACCESS_SECRET`, `GOOGLE_*`, `WEB_URL`, `API_URL`,
  `COOKIE_DOMAIN` (например `.example.com`), `COOKIE_SECURE=true`, `S3_*`,
  `PUBLIC_S3_BASE_URL`, `PREMODERATION`, `ADMIN_EMAILS`.
- Миграции: выполните `pnpm db:deploy` против прод-базы (локально или в CI).
- Важно: web и api должны быть на одном сайте (поддомены одного домена),
  иначе браузер не отправит refresh-cookie. Для разных доменов потребуется
  другая схема хранения токенов.
- Если Vercel не находит Prisma engine, проверьте `includeFiles`/tracing или
  разместите API на постоянно работающем хосте (Railway/Render/VPS).

### Worker — Railway / Render / VPS

```bash
docker build -f apps/worker/Dockerfile -t vidit-worker .
docker run --env-file .env vidit-worker
```

Нужны доступные `DATABASE_URL`, `REDIS_URL`, `S3_*` и `WORKER_CONCURRENCY`.
В образе уже установлен ffmpeg. Воркер не должен работать на Vercel.

### S3 в продакшене

MinIO подходит только локально. В проде используйте Selectel/Yandex/AWS:
создайте бакет, настройте публичное чтение видео (или CDN) и задайте
`PUBLIC_S3_BASE_URL`; ключи с правом записи храните только на сервере.
Ограничьте CORS бакета доменом web-приложения (POST + GET).

## Ограничения MVP

- Просмотры инкрементируются при каждом GET поста (без дедупликации).
- Hot-score пересчитывается при голосовании, а не по расписанию.
- Жалобы и модерация базовые; нет уведомлений и email.
- Нет антивирусной проверки загруженных файлов и DRM.
- Один регион, один воркер-пул; масштабирование — горизонтальное по очереди.

## Проверка

```bash
pnpm typecheck
pnpm build
```

Обе команды должны проходить без ошибок. Для e2e нужны запущенные
Postgres/Redis/MinIO и Google OAuth credentials.
