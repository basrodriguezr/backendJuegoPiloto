import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import client from "prom-client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { query } from "./db.js";
import { buildConfig, buildPackOutcome, buildPlayOutcome } from "./stubs/game.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev-secret";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using dev-secret.");
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry });
const httpHistogram = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
metricsRegistry.registerMetric(httpHistogram);

app.use((req, res, next) => {
  const end = httpHistogram.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path ?? "unknown";
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDeep(base, override) {
  if (!isPlainObject(base)) {
    if (isPlainObject(override)) return { ...override };
    if (Array.isArray(override)) return [...override];
    return override;
  }

  const result = { ...base };
  if (!isPlainObject(override)) {
    return result;
  }

  Object.entries(override).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = [...value];
      return;
    }
    if (isPlainObject(value)) {
      result[key] = mergeDeep(result[key], value);
      return;
    }
    result[key] = value;
  });

  return result;
}

async function loadGameConfig({ clientCode = "demo", companyCode = "demo", gameCode = "e-instant" }) {
  const fallback = buildConfig({ clientCode, companyCode, gameCode });
  const result = await query(
    "SELECT config_json FROM game_configs WHERE client_code = $1 AND company_code = $2 AND game_code = $3 ORDER BY updated_at DESC LIMIT 1",
    [clientCode, companyCode, gameCode]
  );
  if (result.rowCount > 0) {
    const stored = result.rows[0].config_json ?? {};
    const merged = mergeDeep(fallback, stored);
    merged.clientCode = clientCode;
    merged.companyCode = companyCode;
    merged.gameCode = gameCode;
    return merged;
  }
  return fallback;
}

async function createPlay({ mode, bet, sessionId, clientCode, companyCode, gameCode }) {
  if (!mode || !bet) {
    throw createError(400, "Invalid payload");
  }
  const config = await loadGameConfig({
    clientCode: clientCode || "demo",
    companyCode: companyCode || "demo",
    gameCode: gameCode || "e-instant"
  });
  const outcome = buildPlayOutcome({ mode, bet, gameConfig: config });
  await query(
    "INSERT INTO plays (session_id, client_code, company_code, mode, bet, outcome_json) VALUES ($1, $2, $3, $4, $5, $6)",
    [sessionId || null, clientCode || null, companyCode || null, mode, bet, outcome]
  );
  return outcome;
}

async function createPackPlay({ mode, bet, packSize, packLevel, sessionId, clientCode, companyCode, gameCode }) {
  if (!mode || !bet || !packSize) {
    throw createError(400, "Invalid payload");
  }
  const resolvedLevel = packLevel || "nivel1";
  const config = await loadGameConfig({
    clientCode: clientCode || "demo",
    companyCode: companyCode || "demo",
    gameCode: gameCode || "e-instant"
  });
  const outcome = buildPackOutcome({ mode, bet, packSize, packLevel: resolvedLevel, gameConfig: config });
  await query(
    "INSERT INTO pack_plays (session_id, client_code, company_code, mode, pack_level, bet, pack_size, outcome_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [sessionId || null, clientCode || null, companyCode || null, mode, resolvedLevel, bet, packSize, outcome]
  );
  return outcome;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "8h" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.post("/api/v1/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ message: "User already exists" });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [email, hash]
  );
  const user = result.rows[0];
  const token = signToken(user);
  return res.status(201).json({ user, token });
});

app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  const result = await query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = signToken(user);
  return res.json({ user: { id: user.id, email: user.email }, token });
});

app.get("/api/v1/auth/me", authMiddleware, async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Invalid token" });
  }
  const result = await query("SELECT id, email, created_at FROM users WHERE id = $1", [userId]);
  return res.json({ user: result.rows[0] });
});

app.get("/api/v1/game-config", async (req, res) => {
  try {
    const config = await loadGameConfig({
      clientCode: req.query.clientCode || "demo",
      companyCode: req.query.companyCode || "demo",
      gameCode: req.query.gameCode || "e-instant"
    });
    return res.json(config);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || "Server error" });
  }
});

app.get("/api/v1/admin/game-config", authMiddleware, async (req, res) => {
  try {
    const clientCode = req.query.clientCode || "demo";
    const companyCode = req.query.companyCode || "demo";
    const gameCode = req.query.gameCode || "e-instant";
    const config = await loadGameConfig({ clientCode, companyCode, gameCode });
    return res.json(config);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || "Server error" });
  }
});

app.put("/api/v1/admin/game-config", authMiddleware, async (req, res) => {
  try {
    const clientCode = req.body?.clientCode || "demo";
    const companyCode = req.body?.companyCode || "demo";
    const gameCode = req.body?.gameCode || "e-instant";
    const config = req.body?.config;

    if (!isPlainObject(config)) {
      return res.status(400).json({ message: "config must be a JSON object" });
    }

    await query(
      "INSERT INTO game_configs (client_code, company_code, game_code, config_json) VALUES ($1, $2, $3, $4)",
      [clientCode, companyCode, gameCode, config]
    );

    const saved = await loadGameConfig({ clientCode, companyCode, gameCode });
    return res.json({ ok: true, config: saved });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || "Server error" });
  }
});

app.post("/api/v1/play", async (req, res) => {
  try {
    const outcome = await createPlay(req.body ?? {});
    return res.json(outcome);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || "Server error" });
  }
});

app.post("/api/v1/pack-play", async (req, res) => {
  try {
    const outcome = await createPackPlay(req.body ?? {});
    return res.json(outcome);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || "Server error" });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function sendWs(socket, payload) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(payload));
}

const wsHandlers = {
  "config.get": async (payload) => loadGameConfig(payload ?? {}),
  "play.single": async (payload) => createPlay(payload ?? {}),
  "play.pack": async (payload) => createPackPlay(payload ?? {})
};

wss.on("connection", (socket) => {
  sendWs(socket, { type: "ready", ts: Date.now() });

  socket.on("message", async (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (err) {
      sendWs(socket, { type: "response", ok: false, error: { message: "Invalid JSON" } });
      return;
    }

    const { type, requestId, payload } = message ?? {};
    const handler = wsHandlers[type];
    if (!handler) {
      sendWs(socket, {
        type: "response",
        requestId,
        ok: false,
        error: { message: `Unknown message type ${type || ""}`.trim(), status: 400 }
      });
      return;
    }

    try {
      const result = await handler(payload);
      sendWs(socket, { type: "response", requestId, ok: true, data: result });
    } catch (err) {
      sendWs(socket, {
        type: "response",
        requestId,
        ok: false,
        error: { message: err?.message || "Server error", status: err?.status || 500 }
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
