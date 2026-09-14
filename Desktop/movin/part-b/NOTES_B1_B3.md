# B1/B3 implementation notes

## B1 — upload endpoint

The local Node server in `api/server.ts` exposes `GET /api/photos`, `POST /api/photos`, and `POST /api/photos/:id/confirm`. It validates metadata, creates an `awaiting_upload` record, returns a local upload URL, and makes confirmation idempotent. The current adapter is intentionally in-memory for a self-contained demo; restarting the process clears records. Production should replace the map with MongoDB and the local URL with an S3-compatible presigned PUT URL. Server-side object metadata/size verification should happen before moving a record to `uploaded`, and an expiry job should delete abandoned `awaiting_upload` records.

## B3 — confirmation screen

The Vite/React screen in `web/` consumes the normalized Roboflow fixture and presents Spanish, mobile-first inventory review. It supports loading, empty-room, review badges, quantity editing, manual additions with an explicit volume in m³, deletion with confirmation and undo, live total recalculation, and confirmation. The current confirmation is local UI state; production should POST the edited inventory to an API and persist an audit record.

## Manual acceptance checklist

- Open `http://127.0.0.1:5173/` at a narrow phone width.
- Confirm room grouping and empty `Baño` state.
- Change a quantity and verify the total changes.
- Add an object with a positive volume, e.g. `Tetera` / `0.02`.
- Try a blank or zero volume and verify it cannot be submitted.
- Delete an item, confirm, then use `Deshacer`.
- Confirm the inventory and verify the success state.
