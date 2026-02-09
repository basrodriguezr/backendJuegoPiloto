# Backend (Express + Postgres)

API en Express con JWT, Postgres y stubs de negocio.

## Requisitos

- Node.js 18+
- Postgres 14+

## Variables de entorno

Copia `backend/.env.example` a `.env` y ajusta:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/piloto
JWT_SECRET=change-me
PORT=4000
```

## Instalacion

```bash
npm install
```

## Migraciones y seeds

```bash
npm run migrate
npm run seed
```

## Desarrollo

```bash
npm run dev
```

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/game-config`
- `POST /api/v1/play`
- `POST /api/v1/pack-play`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## WebSocket

El backend expone `ws://HOST:4000/ws` con mensajes JSON:

- `config.get` -> retorna `GameConfig`
- `play.single` -> retorna `PlayOutcome`
- `play.pack` -> retorna `PackOutcome`

Formato de respuesta:

```
{ "type": "response", "requestId": "...", "ok": true, "data": { ... } }
```

## Docker

```bash
docker build -t piloto-backend .
docker run -d --name piloto-backend -p 4000:4000 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/piloto \
  -e JWT_SECRET=change-me \
  piloto-backend
```
