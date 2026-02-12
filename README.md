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
- `GET /api/v1/admin/game-config` (requiere JWT)
- `PUT /api/v1/admin/game-config` (requiere JWT)
- `POST /api/v1/play`
- `POST /api/v1/pack-play`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Backoffice / Engine configurable

La configuracion del motor de juego se guarda en `game_configs.config_json` e incluye `engine` con reglas por nivel:

- `engine.levels.nivel1`
- `engine.levels.nivel2`

Campos principales:
- `rows`, `cols`
- `includeDiagonals`
- `fillMode` (`replace`/`cascade`)
- `maxCascades`
- `matchMinCluster`
- `excludedSymbols`
- `bonus` (`triggerSymbol`, `triggerCount`, `prizeMultipliers`, `maxRounds`, `endCode`)
- `modes[].weights` para pesos de simbolos

Los endpoints de play (`/play`, `/pack-play`) leen esta config al vuelo, por lo que cambios guardados en backoffice afectan jugadas nuevas inmediatamente.

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
