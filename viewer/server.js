import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const DATA_FILE = path.join(DATA_DIR, "counters.json");
const EXAMPLE_DATA_FILE = path.join(DATA_DIR, "counters.example.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 3000);

fs.mkdirSync(DATA_DIR, { recursive: true });

function emptyStore() {
  return { counters: [] };
}

function loadStore() {
  if (!fs.existsSync(DATA_FILE)) {
    if (!fs.existsSync(EXAMPLE_DATA_FILE)) return emptyStore();
    try {
      const example = JSON.parse(fs.readFileSync(EXAMPLE_DATA_FILE, "utf8"));
      return Array.isArray(example?.counters) ? example : emptyStore();
    } catch (error) {
      console.error("Could not read example counters:", error.message);
      return emptyStore();
    }
  }
  try {
    const value = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(value?.counters) ? value : emptyStore();
  } catch (error) {
    console.error("Could not read counters:", error.message);
    return emptyStore();
  }
}

function saveStore() {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(store, null, 2)}\n`);
  fs.renameSync(temporaryFile, DATA_FILE);
}

function normalizeHistory(counter) {
  let changed = false;
  if (typeof counter.recordsSuccess !== "boolean") {
    counter.recordsSuccess = counter.kind === "streak";
    changed = true;
  }
  if (!Array.isArray(counter.history)) {
    counter.history = [{ type: "created", date: counter.kind === "since" ? counter.startedAt : dateKey(new Date(counter.createdAt || Date.now())) }];
    changed = true;
  }
  if (counter.kind === "streak" && counter.lastCheckIn && !counter.history.some((event) => event.type === "check-in" && event.date === counter.lastCheckIn)) {
    counter.history.push({ type: "check-in", date: counter.lastCheckIn, migrated: true });
    changed = true;
  }
  const migration = counter.history.find((event) => event.type === "check-in" && event.migrated);
  if (counter.kind === "streak" && migration && counter.streak > 1) {
    const lastCheckIn = new Date(`${counter.lastCheckIn}T00:00:00Z`);
    for (let offset = 1; offset < counter.streak; offset++) {
      const date = new Date(lastCheckIn);
      date.setUTCDate(date.getUTCDate() - offset);
      const key = dateKey(date);
      if (!counter.history.some((event) => event.type === "check-in" && event.date === key)) {
        counter.history.push({ type: "check-in", date: key, migrated: true });
        changed = true;
      }
    }
  }
  return changed;
}

let store = loadStore();
let historyMigrated = false;
for (const counter of store.counters) {
  historyMigrated = normalizeHistory(counter) || historyMigrated;
}
if (historyMigrated) saveStore();

function record(counter, type, extras = {}) {
  normalizeHistory(counter);
  counter.history.push({ type, date: todayKey(), ...extras });
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

function streakPeriods(counter) {
  const checkIns = [...new Set((counter.history || []).filter((event) => event.type === "check-in" && validDateKey(event.date)).map((event) => event.date))].sort();
  const periods = [];
  for (const date of checkIns) {
    const previous = periods.at(-1);
    if (previous && dayDistance(previous.end, date) === 1) { previous.end = date; previous.days += 1; }
    else periods.push({ start: date, end: date, days: 1 });
  }
  const active = counter.lastCheckIn === todayKey() || counter.lastCheckIn === dateKey(new Date(Date.now() - 86400000));
  return periods.map((period, index) => ({ ...period, current: active && index === periods.length - 1 }));
}

function sincePeriods(counter) {
  let start = (counter.history || []).find((event) => event.type === "created")?.date || counter.startedAt;
  const periods = [];
  for (const event of counter.history || []) {
    if ((event.type === "reset" || event.type === "start-date-changed") && validDateKey(event.to) && validDateKey(event.date)) {
      periods.push({ start, end: event.date, days: dayDistance(start, event.date), current: false });
      start = event.to;
    }
  }
  periods.push({ start, end: todayKey(), days: dayDistance(start), current: true });
  return periods;
}

function present(counter) {
  if (counter.kind === "since") {
    return { ...counter, value: dayDistance(counter.startedAt), unit: "day streak", periods: sincePeriods(counter), recordsSuccess: false };
  }
  const current = counter.lastCheckIn === todayKey() || counter.lastCheckIn === dateKey(new Date(Date.now() - 86400000));
  return { ...counter, value: current ? counter.streak : 0, unit: "day streak", checkedInToday: counter.lastCheckIn === todayKey(), periods: streakPeriods(counter), recordsSuccess: true };
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
    startedAt: kind === "since" && startedAt ? startedAt : todayKey(), streak: 0, lastCheckIn: null, recordsSuccess: kind === "streak",
    history: [{ type: "created", date: kind === "since" && startedAt ? startedAt : todayKey() }],
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
    if (counter.startedAt !== req.body.startedAt) {
      record(counter, "start-date-changed", { from: counter.startedAt, to: req.body.startedAt });
      counter.startedAt = req.body.startedAt;
    }
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
    record(counter, "check-in");
    saveStore();
  }
  res.json({ counter: present(counter) });
});

app.post("/api/counters/:id/record", (req, res) => {
  const counter = store.counters.find((item) => item.id === req.params.id);
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  if (counter.recordsSuccess) {
    const today = todayKey();
    if (counter.lastCheckIn !== today) {
      counter.streak = counter.lastCheckIn === dateKey(new Date(Date.now() - 86400000)) ? counter.streak + 1 : 1;
      counter.lastCheckIn = today;
      record(counter, "check-in");
      saveStore();
    }
  } else if (counter.startedAt !== todayKey()) {
    record(counter, "reset", { from: counter.startedAt, to: todayKey() });
    counter.startedAt = todayKey();
    saveStore();
  }
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

const server = app.listen(PORT, () => {
  // Keep the HTTP listener attached to the Node event loop in every shell environment.
  server.ref();
  console.log(`Ascent running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Ascent server failed:", error.message);
  process.exitCode = 1;
});
