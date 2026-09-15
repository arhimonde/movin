# B1/B3 implementation notes

## B1 — upload endpoint

The local Node server in `api/server.ts` exposes `GET /api/photos`, `POST /api/photos`, and `POST /api/photos/:id/confirm`. It validates metadata, creates an `awaiting_upload` record, returns a local upload URL, and makes confirmation idempotent. The current adapter is intentionally in-memory for a self-contained demo; restarting the process clears records. It now scopes records by the `x-movin-user` header, expires abandoned `awaiting_upload` records after 30 minutes, and makes confirmation idempotent. Production should replace the map with MongoDB and the local URL with an S3-compatible presigned PUT URL. Server-side object metadata/size verification should happen before moving a record to `uploaded`, and an expiry job should delete abandoned `awaiting_upload` records.

## B3 — confirmation screen

The Vite/React screen in `web/` consumes the normalized Roboflow fixture and presents Spanish, mobile-first inventory review. It supports loading, empty-room, review badges, quantity editing, manual additions with volume entered in cm³ or calculated from length × width × height in cm, deletion with confirmation and undo, live total recalculation, and confirmation. The conversion is `m³ = cm³ / 1,000,000`; for example, `100 × 50 × 40 cm = 200,000 cm³ = 0.20 m³`. The current confirmation is local UI state; production should POST the edited inventory to an API and persist an audit record.

## Manual acceptance checklist

- Open `http://127.0.0.1:5173/` at a narrow phone width.
- Confirm room grouping and empty `Baño` state.
- Change a quantity and verify the total changes.
- Add an object with a positive volume, e.g. `Tetera` / `20,000 cm³` (the total should increase by `0.02 m³`).
- Try a blank or zero volume and verify it cannot be submitted.
- Delete an item, confirm, then use `Deshacer`.
- Confirm the inventory and verify the success state.
