# Ascent

A small self-hosted tracker for day streaks.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000`.

For local development with automatic restarts after source changes:

```sh
npm run dev
```

On its first run, Ascent loads the sample counters from `data/counters.example.json`. Once you make a change, it stores your counters in `data/counters.json`. Set `DATA_DIR` to keep data elsewhere.

## Docker

```sh
docker compose up --build -d
```

The Compose setup exposes Ascent at `http://localhost:3001` and persists counters in the local `data` directory. Change the host-side port in `docker-compose.yml` if that port is already used on the home server.
