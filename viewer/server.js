import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const DATA_FILE = path.join(DATA_DIR, "counters.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 3000);

fs.mkdirSync(DATA_DIR, { recursive: true });

function emptyStore() {
  return { counters: [] };
}

function loadStore() {
  if (!fs.existsSync(DATA_FILE)) return emptyStore();
  try {
    const value = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(value?.counters) ? value : emptyStore();
  } catch (error) {
    console.error("Could not read counters:", error.message);
    return emptyStore();
  }
}

let store = loadStore();

function saveStore() {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(store, null, 2)}\n`);
  fs.renameSync(temporaryFile, DATA_FILE);
}

function validName(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && dateKey(date) === value;
}

function asDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
}

function todayKey() {
  return dateKey(new Date());
}

function dayDistance(from, to = todayKey()) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function present(counter) {
  if (counter.kind === "since") {
    return { ...counter, value: dayDistance(counter.startedAt), unit: "days since" };
  }
  const current = counter.lastCheckIn === todayKey() || counter.lastCheckIn === dateKey(new Date(Date.now() - 86400000));
  return { ...counter, value: current ? counter.streak : 0, unit: "day streak", checkedInToday: counter.lastCheckIn === todayKey() };
}

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use("/fonts/geist-sans", express.static(path.join(__dirname, "../node_modules/geist/dist/fonts/geist-sans")));
app.use("/fonts/geist-pixel", express.static(path.join(__dirname, "../node_modules/geist/dist/fonts/geist-pixel")));
app.use("/fonts/material-symbols", express.static(path.join(__dirname, "../node_modules/material-symbols")));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/counters", (_req, res) => res.json({ counters: store.counters.map(present) }));

app.post("/api/counters", (req, res) => {
  const { name, kind, startedAt } = req.body || {};
  if (!validName(name) || !["streak", "since"].includes(kind)) {
    return res.status(400).json({ error: "A name and counter type are required." });
  }
  if (kind === "since" && startedAt && (!validDateKey(startedAt) || startedAt > todayKey())) {
    return res.status(400).json({ error: "Choose a valid start date that is not in the future." });
  }
  const now = new Date().toISOString();
  const counter = {
    id: crypto.randomUUID(), name: name.trim(), kind, createdAt: now,
    startedAt: kind === "since" && startedAt ? startedAt : todayKey(), streak: 0, lastCheckIn: null,
  };
  store.counters.push(counter);
  saveStore();
  res.status(201).json({ counter: present(counter) });
});

app.put("/api/counters/:id", (req, res) => {
  const counter = store.counters.find((item) => item.id === req.params.id);
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  if (!validName(req.body?.name)) return res.status(400).json({ error: "A name is required." });
  if (counter.kind === "since" && req.body?.startedAt !== undefined) {
    if (!validDateKey(req.body.startedAt) || req.body.startedAt > todayKey()) {
      return res.status(400).json({ error: "Choose a valid start date that is not in the future." });
    }
    counter.startedAt = req.body.startedAt;
  }
  counter.name = req.body.name.trim();
  saveStore();
  res.json({ counter: present(counter) });
});

app.post("/api/counters/:id/check-in", (req, res) => {
  const counter = store.counters.find((item) => item.id === req.params.id);
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  if (counter.kind !== "streak") return res.status(400).json({ error: "Only streaks can be checked in." });
  const today = todayKey();
  if (counter.lastCheckIn !== today) {
    counter.streak = counter.lastCheckIn === dateKey(new Date(Date.now() - 86400000)) ? counter.streak + 1 : 1;
    counter.lastCheckIn = today;
    saveStore();
  }
  res.json({ counter: present(counter) });
});

app.post("/api/counters/:id/reset", (req, res) => {
  const counter = store.counters.find((item) => item.id === req.params.id);
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  if (counter.kind === "since") counter.startedAt = todayKey();
  else { counter.streak = 0; counter.lastCheckIn = null; }
  saveStore();
  res.json({ counter: present(counter) });
});

app.delete("/api/counters/:id", (req, res) => {
  const initialLength = store.counters.length;
  store.counters = store.counters.filter((item) => item.id !== req.params.id);
  if (store.counters.length === initialLength) return res.status(404).json({ error: "Counter not found." });
  saveStore();
  res.status(204).end();
});

app.get("*splat", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.listen(PORT, () => console.log(`Ascent running at http://localhost:${PORT}`));
