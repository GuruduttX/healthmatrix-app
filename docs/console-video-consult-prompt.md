# Prompt for the doctor console: Twilio video consults

Paste everything below the line into the coding agent working in `healthmatrix-console-main`.

---

Add real one-on-one video calls to consults using **Twilio Video**. The patient side is already built in the HealthMatrix mobile app, which shares this MongoDB. Your job is the doctor's side: see who is waiting, start the consult, and run the call. Follow the contract below exactly. The app depends on every name and value in it.

## How the flow works end to end

1. From 5 minutes before the slot, the patient taps **Join call** in the app and enters a waiting room.
2. While they wait, the app calls its server every 4 seconds. Each call sets `consults.memberLobbyAt` to the current time. When the patient closes the waiting room, the app `$unset`s the field.
3. The doctor opens the consult in this console and sees **"<Patient> is waiting"**, then clicks **Start consult**.
4. Starting sets `status: "in_progress"` and `startedAt`, as `startConsult` already does. On its next check the app sees `in_progress`, gets a Twilio token from its own server, and joins the room. The patient moves from the waiting room to the call by themselves.
5. Doctor and patient talk in a two-person Twilio **group** room. Both sides can mute the mic, stop the camera, and end the call.
6. The doctor clicks **End consult**, which sets `status: "completed"` and `endedAt` as today, and **also completes the Twilio room**. Completing the room disconnects the patient at once, and the app shows "Consult complete".

If the patient leaves the call, they can rejoin while the consult is `in_progress`. If the doctor reloads the page during a call, the console should rejoin the same room.

## Shared contract (do not change these)

| Item | Value |
|---|---|
| Room name (Twilio `UniqueName`) | `consult-<consultId>` (the consult's Mongo `_id` as a hex string) |
| Doctor identity in the room | `doctor-<doctorId>` |
| Patient identity in the room | `member-<memberId>` (set by the app; use it to recognise the patient's participant) |
| Room type | `Type=group`, `MaxParticipants=2`, `MediaRegion=in1`, `EmptyRoomTimeout=10`, `UnusedRoomTimeout=10` |
| "Patient is waiting" | `status === "scheduled"` and `memberLobbyAt` less than **15 seconds** old |
| Consult statuses | unchanged: `scheduled`, `in_progress`, `completed`, `cancelled` |

**Either side may open the room first.** The app opens it when the patient joins a consult that is `in_progress`, and the console opens it when the doctor starts. Opening must be idempotent and work the same way on both sides:

1. `GET https://video.twilio.com/v1/Rooms/consult-<id>`. If this returns 200, use that room. A lookup by name finds only an in-progress room.
2. Otherwise `POST https://video.twilio.com/v1/Rooms` with the parameters in the table.
3. If the create fails, repeat the GET once, because the other side may have created it at the same moment. Only throw if that also fails.

Authenticate REST calls with HTTP Basic using `TWILIO_API_KEY_SID:TWILIO_API_KEY_SECRET`.

## What to build

### 1. Environment

Add these to `.env.example`, with a comment, and read them in a server-only module. The values are the same as the app's:

```
# Twilio Video for consults (console.twilio.com > Account > API keys & tokens). Same values as the app.
TWILIO_ACCOUNT_SID=AC...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
```

If any of the three is missing, the call area should say "Video calls are not set up" instead of crashing.

### 2. Packages

- `twilio-video` (browser SDK, latest 2.x) for the call UI. Import it only on the client, inside an effect (`await import("twilio-video")`), because it touches `window`.
- `twilio` (server SDK) for `jwt.AccessToken` with a `VideoGrant`. You may sign the JWT by hand instead, but the token must be a standard Twilio access token with header `cty: "twilio-fpa;v=1"`, `iss` = the API key SID, `sub` = the account SID, and `grants: { identity, video: { room } }`.

### 3. Model

In `src/models/consult.model.ts`, add the field the app writes, next to `startedAt`/`endedAt`:

```ts
/** When the member's app last checked in from the consult's waiting room (every ~4 s). */
memberLobbyAt: Date,
```

### 4. Server: `src/lib/video.ts` (new, server-only)

- `roomNameFor(consultId)` returns `consult-${consultId}`. `doctorIdentity(doctorId)` returns `doctor-${doctorId}`.
- `ensureRoom(consultId)`: the idempotent open described in the shared contract.
- `completeRoom(consultId)`: `POST /v1/Rooms/consult-<id>` with `Status=completed`. A 404 is not an error; it means the room was already closed.
- `videoToken(identity, roomName)`: an access token with a 4-hour TTL.

### 5. Server actions and route (in `src/lib/console-actions.ts` and a route handler)

- **`startConsult`**: call `ensureRoom(consultId)`, then run the existing `updateOne` to `in_progress`. If Twilio fails, still start the consult, because the app retries opening the room, but report the error to the stage.
- **`endConsult`**: after the existing `updateOne` to `completed`, call `completeRoom(consultId)`. Log failures and don't throw.
- **New `getConsultCall(consultId)` server action**: require the signed-in doctor who owns the consult and `status === "in_progress"`. Call `ensureRoom`, then return `{ roomName, token }` with the identity `doctor-<doctorId>`. Otherwise throw a clear error.
- **New route `GET /api/consults/[id]/lobby`** (doctor session required, own consult only) returns `{ status, patientWaiting: boolean, memberLobbyAt?: string }`. The stage polls it every 3 seconds while the consult is `scheduled`. Use a route handler, not a server action, because it is polled.

### 6. UI: rework `src/components/consult/consult-stage.tsx`

Keep the existing look (dark `from-ink-mid to-ink` stage, round buttons, `lucide-react` icons, brand colours) and the `ended` card. Replace the placeholder with a real call.

**Lobby (`scheduled`)**
- Poll `/api/consults/[id]/lobby` every 3 s.
- If `patientWaiting`: a green pulsing dot and "**<First name> is waiting**". Make the button prominent with the label **"Admit & start consult"**.
- Otherwise: "<First name> hasn't joined yet. They'll join automatically once you start." The button reads **Start consult** and stays enabled: a doctor may start first, and the patient is pulled in when they open the app.
- Before starting, show a small self-preview from `createLocalVideoTrack` so the doctor can check their camera. If camera or mic permission is refused, show "Allow camera and microphone for this site" with the browser's `NotAllowedError` handled. Stop the preview track before connecting.

**Live (`in_progress`)**
- Call `getConsultCall`, then `connect(token, { name: roomName, audio: true, video: { width: 1280, height: 720 }, networkQuality: { local: 1, remote: 1 }, dominantSpeaker: false })`.
- The patient's video fills the stage (`object-cover`), and the doctor's own video is a picture-in-picture in the corner. Attach tracks for participants already in the room on connect, and on `participantConnected` / `trackSubscribed`. Detach on `trackUnsubscribed` / `participantDisconnected`.
- States to show on the stage:
  - "Waiting for <first name> to join the call…" when no remote participant is present.
  - "<First name>'s camera is off" with their initials when their video track is disabled. Listen to `track.on("disabled"/"enabled")`.
  - A "Muted" chip when their audio track is disabled.
  - "Reconnecting…" on the room's `reconnecting` event, cleared on `reconnected`.
  - A weak-connection chip when local `networkQualityLevel <= 1`.
- Controls:
  - **Mic**: `localParticipant.audioTracks.forEach(p => p.track.disable()/enable())`.
  - **Camera**: same pattern on the video tracks, showing the existing `VideoOff` placeholder in the PiP.
  - **End consult**: confirm first using the existing `confirm-dialog.tsx`, then `room.disconnect()`, then `endConsult`.
- Keep the call timer counting from `startedAt`, as it does now.
- Clean up on unmount and on `pagehide`: `room.disconnect()` and stop all local tracks.
- If the page loads with the consult already `in_progress`, connect straight away.
- If the room disconnects without the doctor ending the call, show "Call dropped" with a **Rejoin** button that calls `getConsultCall` again.

### 7. Lists: show who's waiting

- In `src/components/consult-row.tsx`, and wherever Today/Schedule list consults, add a success-tone chip **"Waiting in lobby"** when the patient is waiting under the same 15-second rule. Add `patientWaiting?: boolean` to the `Consult` type in `src/lib/types.ts`, computed in `toConsults` in `console-data.ts`.
- On the Today page, refresh the data every 15 seconds (`router.refresh()` in a small client component) so the chip appears without a manual check.

## Don't

- Don't change `src/lib/schedule.ts`. It must stay byte-identical with the app's copy.
- Don't rename statuses or add new ones.
- Don't write `memberLobbyAt`. Only the app writes it.
- Don't make rooms of any type other than `group` (Twilio deprecated `go`, `peer-to-peer` and `group-small`).
- Don't expose the API key secret to the client. Only tokens go to the browser.

## Done when

- `npm run lint` and `npm run build` pass.
- Manual test with the app on a phone, using a consult booked for now:
  1. The patient joins the waiting room, and within a few seconds the console shows them as waiting, both on the consult page and on Today.
  2. The doctor clicks Admit & start, and the patient's phone switches to the call within about 5 seconds. Both see and hear each other.
  3. Mute and camera on either side update the other side's indicators.
  4. The patient leaves and rejoins, and the console shows the state change each time.
  5. The doctor reloads the page mid-call and rejoins the same room.
  6. The doctor ends the consult, and the patient's app immediately shows "Consult complete".
