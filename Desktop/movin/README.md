# MOVIN — Internship project

This repository contains the computer-vision evaluation work (Part A) and the inventory/quote product slice (Part B).

## Start the local demo

```bash
cd part-b
npm install
npm test
npm run quote
npm run web:install
cd web
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`. The confirmation UI is Spanish and uses the normalized fixture generated from real Roboflow output.

To start the local upload API in a second terminal:

```bash
cd part-b
npm run api
```

Read `part-b/README.md` and `part-b/NOTES_B1_B3.md` for the API/UI boundaries and acceptance checklist. Read `part-a/README.md` for the evaluation and Roboflow scripts.

## Data and credentials

Raw Roboflow responses are stored in `part-b/fixtures/roboflow_raw/`; the normalized fixture is `part-b/fixtures/detections.json`. API keys are entered interactively and must never be committed. `.env.example` documents optional local settings.

## Production boundary

The B1 API currently uses in-memory storage. Production deployment still requires a persistent database, S3-compatible object storage, environment variables, and a public hosting setup. The local implementation is intentionally self-contained for review and testing.
