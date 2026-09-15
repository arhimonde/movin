# MOVIN — Parts A and B

## Run the existing quote logic

```bash
cd part-b
npm install
npm test
npm run quote
```

## Run the mobile confirmation screen (B3)

```bash
cd part-b
npm run web:install
npm run web:build
cd web
npm run dev
```

Open the local URL shown by Vite. The screen uses the B2 fixture and supports loading, empty rooms, confidence/review flags, quantity edits, add, delete/undo, live totals, and confirmation. The profile button in the header opens a Spanish profile form for `Nombre`, `Número de almacén`, and a photo from the device/camera. On first use, the profile form is mandatory before the inventory is shown. Profile data is persisted locally in the browser until a backend account service is connected. The profile panel supports multiple local users, switching, adding, and deletion with protection for the final user. Manual inventory additions can include an optional photo thumbnail; the confirmation screen offers edit, new-inventory reset, and user-switch actions. Manual objects use the 🧊 dimensions control: enter length, width, and height in centimeters. For example, `100 × 50 × 40 cm = 200,000 cm³ = 0.20 m³`; the app performs the `cm³ / 1,000,000` conversion automatically.

## Run the local upload API (B1)

In another terminal:

```bash
cd part-b
npm run api
```

The local API exposes `GET /api/photos`, `POST /api/photos`, and `POST /api/photos/:id/confirm`. It uses in-memory storage for development. Production MongoDB/S3 adapters still require credentials and deployment configuration.

## Roboflow

The Roboflow script is at `part-a/scripts/fetch_roboflow.py`. It uses the public model `furniture-o6003/2` through `https://serverless.roboflow.com` and prompts for the key without displaying it. Raw responses are retained in `fixtures/roboflow_raw/`. Do not commit API keys.

## Checks before submission

```bash
cd part-b
npm test
npm run quote
npm run web:build
cd ../part-a/scripts
python3 -m unittest -q
```

See `NOTES_B1_B3.md` for the B1/B3 production boundary and the manual acceptance checklist.
