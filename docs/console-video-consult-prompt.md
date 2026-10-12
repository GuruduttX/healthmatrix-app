# Prompt for the doctor console: Twilio video consults with a waiting room and Admit

Paste everything below the line into the coding agent working in `healthmatrix-console-main`.

---

Add one-on-one video consults to the console using **Twilio Video**. The patient side is already built in the HealthMatrix app, which shares this MongoDB. The patient waits in a waiting room. The doctor sees them there **in real time**, with an **Admit** button on the consult's video screen. Pressing Admit connects the call. Nothing polls: presence comes from the Twilio room itself.

**If you built an earlier version of this feature** (a `memberLobbyAt` field, a polled `GET /api/consults/[id]/lobby` route, or a "Start consult" button that the app picked up by polling), replace it with what follows. Delete the lobby route and any reads of `memberLobbyAt`; the app no longer writes it.

## How it works end to end

1. From 5 minutes before the slot, the patient taps **Join call**. The app asks its server **once** for a Twilio token and joins the consult's room **without camera or mic**. The patient is in the room, but nothing from their camera or mic leaves their phone.
2. The doctor has the consult page open, so the console is also connected to the same room **without publishing camera or mic**. Twilio fires `participantConnected` for the patient straight away. The console shows **"<Patient> is in the waiting room"** and a big **Admit** button over the video area.
3. The doctor clicks **Admit**. The console:
   - (a) marks the consult started (`status: "in_progress"`, `startedAt`), then
   - (b) **publishes the doctor's camera and mic** to the room.
4. **The doctor's published audio or video track is the app's admit signal.** As soon as the patient's app receives it, the app leaves the waiting room, publishes the patient's own camera and mic, and shows the call.
5. They talk. Either side can mute, stop video, or leave.
6. The doctor clicks **End consult**. The console marks the consult `completed` and **completes the Twilio room**. This disconnects the patient, whose app then shows "Consult complete".

Other cases the app already handles:
- If the patient leaves and rejoins while the consult is `in_progress`, the app skips the waiting room and joins with media at once. The console just sees them reconnect.
- If the doctor opens or reloads the page while the consult is `in_progress`, the console publishes media immediately, with no Admit step.
- If the doctor cancels while the patient waits, completing the room sends the patient's app to "You can't join this consult" with the reason.

## Shared contract (do not change these)

| Item | Value |
|---|---|
| Room name (Twilio `UniqueName`) | `consult-<consultId>` (the consult's Mongo `_id` as hex) |
| Doctor identity | `doctor-<doctorId>` |
| Patient identity | `member-<memberId>`, set by the app. A participant whose identity starts with `member-` is the patient. |
| Room settings | `Type=group`, `MaxParticipants=2`, `MediaRegion=in1`, `EmptyRoomTimeout=10`, `UnusedRoomTimeout=10` |
| Patient is waiting | Patient participant is connected **and** the consult is `scheduled` |
| **Admit signal** | The doctor's participant publishes an **audio or video** track. Data tracks don't count. |
| Statuses | unchanged: `scheduled`, `in_progress`, `completed`, `cancelled` |

**Rules that follow from the admit signal:**
- **Never publish the doctor's camera or mic before Admit** while the consult is `scheduled`. Doing so would pull the patient into the call early. Use an unpublished local preview track for the doctor's self-view instead.
- Set `in_progress` **before** publishing, so a patient who rejoins after Admit is sent straight into the call.
- The patient publishes no tracks while waiting. In the waiting-room view, show their name and initials, not video.

**Opening the room is idempotent, and either side may do it first** (the app opens it when the patient joins):
1. `GET https://video.twilio.com/v1/Rooms/consult-<id>`. A 200 means use it; a lookup by name only finds in-progress rooms.
2. Otherwise `POST https://video.twilio.com/v1/Rooms` with the settings above.
3. If the create fails, repeat the GET once (the other side may have just created it). Throw only if that fails too.

Authenticate REST calls with HTTP Basic using `TWILIO_API_KEY_SID:TWILIO_API_KEY_SECRET`.

## What to build

### 1. Environment

Add these to `.env.example` and read them in a server-only module. Use the same values as the app:

```
# Twilio Video for consults (console.twilio.com > Account > API keys & tokens). Same values as the app.
TWILIO_ACCOUNT_SID=AC...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
```

If any of the three is missing, the video area says "Video calls are not set up" instead of crashing.

### 2. Packages

- `twilio-video@2.36.0` (browser SDK). Import it only on the client, inside an effect (`await import("twilio-video")`), because it touches `window`.
- `twilio` (server SDK) for `jwt.AccessToken` and `VideoGrant`. A hand-signed JWT is fine too: header `cty: "twilio-fpa;v=1"`, `iss` = API key SID, `sub` = account SID, `grants: { identity, video: { room } }`, 4-hour TTL.

### 3. Server: `src/lib/video.ts` (new, server-only)

- `roomNameFor(consultId)` returns `consult-${consultId}`. `doctorIdentity(doctorId)` returns `doctor-${doctorId}`.
- `ensureRoom(consultId)`: the idempotent open from the contract.
- `completeRoom(consultId)`: `POST /v1/Rooms/consult-<id>` with `Status=completed`. A 404 means it's already closed, so it isn't an error.
- `videoToken(identity, roomName)`.
- `patientInRoom(consultId)`: `GET /v1/Rooms/consult-<id>/Participants?Status=connected` returns true when a `member-` identity is connected. A 404 means false. Used only for the lists in step 6.

### 4. Server actions (`src/lib/console-actions.ts`)

- **`getConsultRoom(consultId)`** (new): requires the signed-in doctor who owns the consult, with status `scheduled` or `in_progress`. Calls `ensureRoom`, then returns `{ roomName, token, status }` using identity `doctor-<doctorId>`. Otherwise it throws a clear error.
- **`admitPatient(consultId)`** (new, replacing `startConsult` for video consults): the same `updateOne` that `startConsult` does (`scheduled` to `in_progress`, `startedAt: new Date()`). Return the updated status. If the consult wasn't `scheduled`, return the current status and don't throw; the stage then publishes if it's `in_progress`.
- **`endConsult`**: keep the `updateOne` to `completed`, then call `completeRoom`. Log failures; don't throw.
- **Cancelling a consult** (`cancel-consult`): after cancelling, call `completeRoom` too, so a waiting patient is told at once.

### 5. UI: rewrite `src/components/consult/consult-stage.tsx`

Keep the current look: the dark `from-ink-mid to-ink` stage, round buttons, `lucide-react` icons, brand colours, the call timer from `startedAt`, and the existing "Consult ended" card.

**On load** (consult `scheduled` or `in_progress`): call `getConsultRoom`, then `connect(token, { name: roomName, tracks: [], networkQuality: { local: 1, remote: 1 } })`. This is the **listening connection**: no media is published. Disconnect on unmount and on `pagehide`.

**Waiting view (consult `scheduled`)**

- *Patient not in the room:* show their initials, "<First name> hasn't joined yet. You'll see them here the moment they open the waiting room.", and a small self-preview from `createLocalVideoTrack()`, attached to a `<video>` and **not published**.
- *Patient in the room* (from `room.participants` on connect, or `participantConnected`):
  - Over the stage, show their avatar with a soft pulsing ring, "**<Patient> is in the waiting room**", and the time they arrived ("waiting 2 min", counted on the client from the arrival event).
  - Show a large primary button, **Admit**, with a `UserCheck` icon in brand colour.
  - Keep the doctor's self-preview in the corner, so they can check how they look before admitting.
  - On `participantDisconnected`, go back to "hasn't joined yet" right away.
- *Admit pressed:*
  1. Disable the button and show "Admitting…".
  2. Call `admitPatient`.
  3. If the result is `in_progress`: `createLocalTracks({ audio: true, video: { width: 1280, height: 720 } })`, reusing the preview video track if one exists, and `room.localParticipant.publishTrack(...)` for each.
  4. Switch to the live view.
  - If camera or mic permission is refused (`NotAllowedError`), show "Allow camera and microphone for this site to admit <name>" and don't call `admitPatient`. Check permission first by creating the tracks **before** calling `admitPatient`, without publishing them yet.

**Live view (consult `in_progress`)**

- If the page loads while the consult is `in_progress`, publish camera and mic straight after connecting.
- The patient's video fills the stage (`object-cover`); the doctor's own video is a picture-in-picture in the corner. Attach tracks for participants already in the room on connect, and on `trackSubscribed`; detach on `trackUnsubscribed` and `participantDisconnected`.
- States:
  - "Waiting for <first name> to rejoin…" when the patient isn't connected.
  - "<First name>'s camera is off", with initials, when their video track is disabled or not published (`track.on("disabled"/"enabled")`).
  - A "Muted" chip when their audio is disabled or not published.
  - "Reconnecting…" between the `reconnecting` and `reconnected` events.
  - A weak-connection chip when local `networkQualityLevel <= 1`.
- Controls:
  - **Mic** and **Camera** toggle: `enable()`/`disable()` on the published tracks.
  - **End consult**: confirm with the existing `confirm-dialog.tsx`, then stop local tracks, `room.disconnect()`, and call `endConsult`.
- If the room disconnects without the doctor ending the call, show "Call dropped" with **Rejoin**, which runs `getConsultRoom` and connects again. The consult is `in_progress`, so publish straight away.

### 6. Lists: who's waiting (Today and Schedule)

- Add `patientWaiting?: boolean` to `Consult` in `src/lib/types.ts`. In `toConsults` (`console-data.ts`), set it by calling `patientInRoom` for consults that are `scheduled` and in their join window (5 minutes before the slot to 30 minutes after it ends). Run these calls in parallel, and treat errors as `false`.
- In `consult-row.tsx`, add a success-tone chip, **"In waiting room"**, and give that row's action button the label **Admit** and brand styling. It links to the consult page, where the Admit button is.
- These lists refresh with the page's existing refresh. Don't add a polling loop; the consult page is real-time through the room.

## Don't

- Don't publish the doctor's camera or mic before Admit while the consult is `scheduled`.
- Don't add polling or heartbeat fields, and don't read `memberLobbyAt`.
- Don't publish data tracks, which the app ignores, or rename identities, room names or statuses.
- Don't change `src/lib/schedule.ts`; it must stay byte-identical with the app's copy.
- Don't make rooms of any other type: `go`, `peer-to-peer` and `group-small` are deprecated.
- Don't send the API key secret to the browser; only tokens go to the client.

## Done when

- `npm run lint` and `npm run build` pass.
- Manual test, with the patient on the HealthMatrix web app at `http://localhost:8081` (or a phone dev build) and a consult booked for now:
  1. The doctor opens the consult and sees "hasn't joined yet" with a self-preview. No camera or mic is published (check `room.localParticipant.tracks` is empty).
  2. The patient taps Join call. Within about a second, the console shows "<Patient> is in the waiting room" and **Admit**, and the patient's screen says "The doctor knows you're here".
  3. The doctor clicks Admit. The patient's screen switches to the call by itself, and both see and hear each other.
  4. Mute and camera on either side update the other side's indicators.
  5. The patient closes the waiting room before Admit, and the console's Admit disappears at once.
  6. The patient leaves and rejoins mid-call and goes straight back in. The doctor reloads mid-call and rejoins with media.
  7. The doctor ends the consult, and the patient sees "Consult complete". The doctor cancels a consult while the patient waits, and the patient sees the cancellation.
