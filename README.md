# Twinkle Crew — Delivery App

A mobile app for the Twinkle delivery crew to run their day: load stops, advance status through the lifecycle, capture proof-of-setup photos, and keep working even when the signal drops.

[Watch the demo](demo/Twinkle-crew-demo-1080.mov)

---

## How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Mock Server

The app talks to a local [json-server](https://github.com/typicode/json-server) that persists data to `mock-server/db.json`. Every `POST / PATCH / PUT / DELETE` is written to disk so changes survive restarts.

> **Note:** Because this is a localhost server, the backend will not work on a physical device — use the iOS Simulator or an Android Emulator.

```bash
npm run server
# Runs on http://localhost:3001
```

All responses are delayed by **600 ms** to surface realistic network behaviour during demos (see `mock-server/server.js`). This makes the offline / pending-sync flow easy to observe — status changes appear in the UI immediately while the amber dot shows the sync is still in flight.

### 3. Expo

Open a second terminal and start the app:

```bash
npx expo start
```

Then press `i` for iOS Simulator or `a` for Android Emulator.

### 4. Tests

```bash
npm test
```

---

## Backend & Caching Logic

### "Server database" — json-server

`mock-server/db.json` acts as the mutable backend. `json-server` exposes it as a REST API:

| Endpoint | Method | Purpose |
|---|---|---|
| `/stops` | `GET` | Fetch all stops for the day |
| `/stops/:id` | `GET` | Fetch a single stop |
| `/stops/:id` | `PATCH` | Update status, reason, photo URL, notes |
| `/reset` | `POST` | Restore all stops to the initial seed state (dev only) |

Changes made through the app (status transitions, proof photos) are `PATCH`-ed to this server and written through to `db.json`, so they survive a server restart.

### Cache + Offline Outbox — expo-sqlite

The app creates a local SQLite database (`twinkle.db`) with two tables, each with a single job:

**Table 1 — `stops` (read cache)**

Hydrated from the server on startup and on every reconnect. When the device is offline the app reads from this table instead, so the crew always sees their run even with no signal.

```
stops: id, slot, customer, area, address, lat, lng, items_json,
       must_finish_by, status, notes, proof_photo_uri, failed_reason, fetched_at
```

**Table 2 — `outbox` (pending writes)**

Every status change is written here immediately — before any network call — so it survives an app kill or a sudden loss of signal. On reconnect the outbox is drained FIFO: each row is `PATCH`-ed to the server, then removed on success or marked `failed` after 3 consecutive errors.

```
outbox: id, stop_id, type, payload_json, sync_state ('pending'|'failed'), retry_count, created_at
```

**The rule:** a status update is never lost. The crew taps once — that tap is durable immediately, regardless of connectivity. The UI reflects the change instantly (optimistic update). The amber dot on a stop card means there is at least one row in the outbox for that stop that has not yet synced.

---

## App Logic

### Sorting orders

Stops are always split into two groups — **Afternoon** (12:00–16:00) on top, **Evening** (16:00–20:00) below — matching how the crew reads their day. Within each slot, stops are sorted by `must_finish_by` ascending (earliest deadline first) so the most urgent job is always at the top. Completed and failed stops sink to the bottom of their slot so active stops stay visible without scrolling.

### UX under pressure

The primary action button (Mark En Route / Mark Arrived / Mark Complete) is large, full-width, and strongly coloured so it can be tapped one-handed while the crew member is standing at a door. A single tap advances the status — no confirmation dialog for forward moves. Destructive moves (Mark Failed) require a typed reason so they cannot be triggered accidentally.

### Restart demo

Open **Settings → Reset Demo** to `POST /reset`, which rewrites `db.json` to the original seed and clears both SQLite tables. The UI reloads immediately.

---

## Complete Lifecycle

```
Launch app
      │
      ▼
Load cached stops from SQLite
      │
      ▼
Show UI immediately
      │
      ├── Offline? ──── Keep reading from cache
      │
      ▼
Online?
      │
      ▼
Fetch latest stops from server
      │
      ▼
Upsert into SQLite
      │
      ▼
Re-render UI with fresh data

──────────────────────────────────────────

User taps a status button

      ▼
Apply optimistic update to React state
      ▼
Upsert stop in SQLite
      ▼
Append row to outbox (sync_state = 'pending')
      ▼
Amber dot appears on stop card

──────────────────────────────────────────

Internet returns  (or: was online already)

      ▼
Drain outbox FIFO
      ▼
PATCH each change to the server
      ▼
On success → remove row from outbox
On error   → increment retry_count
             (sync_state flips to 'failed' after 3 attempts)
      ▼
Refresh stops from server
      ▼
Rebuild pendingStopIds
      ▼
Amber dots disappear for synced stops
```

---

## Tests

Run with `npm test`. Four test suites cover the logic that must never break:

### `src/constants/__tests__/status.test.ts`

Pure data assertions — no mocking required.

- Every `StopStatus` value (`loaded`, `en_route`, `arrived`, `completed`, `failed`) has an entry in `STATUS_CONFIG` with a label, colour, and background
- `NEXT_STATUS` covers all non-terminal statuses and maps them in the correct forward order
- Terminal statuses (`completed`, `failed`) have no `NEXT_STATUS` entry
- The state machine has no cycles

### `src/db/__tests__/outboxDao.test.ts`

Uses a stateful in-memory mock for `getDb()` that mirrors the SQL semantics without a native SQLite module.

- `enqueue` creates a row with `sync_state = 'pending'` and `retry_count = 0`
- `getPending` returns only pending rows, in FIFO (created\_at ascending) order
- `getPendingStopIds` deduplicates stop IDs correctly
- `markFailed` state machine — stays `pending` after 1st and 2nd failure, flips to `failed` on the 3rd (the critical boundary: a direct SQL-string assertion verifies the query contains `retry_count + 1 >= 3` so an off-by-one change fails immediately)
- `remove` deletes only the targeted entry, leaves others intact
- `clearAll` wipes every row

### `src/services/__tests__/syncService.test.ts`

All three imported modules (`outboxDao`, `stopsDao`, `stopsService`) are replaced with `jest.fn()` mocks. Tests verify the JavaScript orchestration logic:

- Empty outbox → no API call made
- Success path: `updateStopStatus` is called, then `upsertOne`, then `remove` — in that order (data is confirmed before the outbox row is deleted)
- Error path: `markFailed` is called; `remove` and `upsertOne` are not
- A batch where one entry fails and one succeeds: the failure gets `markFailed`, the success gets removed
- Entries are processed in the order `getPending` returns them (FIFO)
- All payload fields (`failedReason`, `photoUri`, `notes`) are forwarded to `updateStopStatus`
- `refreshStops` calls `fetchStops` then `upsertAll`

### `src/context/__tests__/StopsContext.test.tsx`

Mocks all DAOs and services. Uses `renderHook` from `@testing-library/react-native` to drive the context.

- Online startup: fresh stops from the API are loaded into state
- Offline startup: cached SQLite data is loaded; `refreshStops` is never called
- `enqueueUpdate` always calls `stopsDao.upsertOne` and `outboxDao.enqueue`, regardless of connectivity
- `enqueueUpdate` reflects the new status in React state immediately (optimistic), before the outbox drain completes
- `enqueueUpdate` calls `syncService.drainOutbox` when online, skips it when offline
- A non-existent stop ID is a no-op (no write, no enqueue)
- Reconnect (false → true): `drainOutbox` and `refreshStops` are both called

---

## Things to Consider

### Lateness awareness

The requirements call for a calm warning when a stop is at risk of running late (still `en_route` with little margin before `must_finish_by`). This was deliberately kept out of scope to avoid false alarms while the UX is still being validated.

**How this would work technically:**
- A `useLateness(stop)` hook calculates `minutesLeft = must_finish_by - now()` on a 30-second interval using `setInterval`
- When `minutesLeft < threshold` (e.g., < 20 min) and `status === 'en_route'`, it returns a `{ isAtRisk: true, minutesLeft }` flag
- The stop card and detail screen surface a quiet amber banner: *"15 min to must-finish — consider calling ahead"*
- No sound, no vibration — a visual-only signal that the crew can choose to act on

The threshold would be configurable per slot and potentially per area (a villa compound takes longer to access than an apartment block).

### Distance to stop

Showing distance or estimated drive time to each stop would help the crew sequence their day. This was skipped to avoid requesting location permission on first launch — a permission prompt that crew members might deny, leaving the feature permanently broken for them.

**If it were added:** `expo-location` with `requestForegroundPermissionsAsync`, Haversine distance against each stop's `lat/lng`, and `react-native-maps` already in the project for the turn-by-turn deeplink. Background location was ruled out entirely — battery cost on a 10-hour shift is unacceptable.

### Day summary & handoff

An end-of-day screen would close the loop: how many stops delivered on time, which ones failed and why, what is still pending sync.

**Technical sketch:**

On the client, a `useDaySummary()` hook aggregates the local SQLite state — `SELECT status, COUNT(*) FROM stops GROUP BY status` — and the `outbox` table for any still-pending rows. This gives the crew an immediate local picture without a network call.

**Toward a live back-office dashboard:**

The json-server `events` table (already in the seed) is the hook for this. Every status change the app PATCHes could also `POST /events` with a payload of `{ stop_id, from_status, to_status, timestamp, crew_id }`. A lightweight websocket relay (e.g., Ably or a simple `EventSource` endpoint) would let a browser dashboard subscribe to those events and show the fleet's position in real time — each stop dot on a map changing colour as the crew advances through the day. `must_finish_by` + current status + last-event timestamp gives a naive ETA that could be surfaced to the back-office team without requiring GPS.
