# Prompt: 10-minute late start for consults (doctor console)

Paste everything below the line into Claude Code, opened in the doctor console project
(`healthmatrix-console`). It assumes no access to the HealthMatrix app's code.

---

The HealthMatrix app has changed how long a booked video consult waits for the doctor. Make the
console follow the same rule. The app side is finished and live.

## The rule

- A booked consult (`status: "scheduled"`) can be joined by the patient and **started by the
  doctor from 5 minutes before its time until 10 minutes after it**. Both sides may be up to 10
  minutes late.
- If the doctor hasn't started it (`status` still `"scheduled"`) **10 minutes after
  `scheduledAt`**, it is **missed**. It can no longer be joined or started, and it belongs with
  past consults, not upcoming ones.
- Once started (`status: "in_progress"`), a consult runs as long as it needs; the rule no longer
  applies.
- This covers normal bookings and approved custom-time requests alike, since an approved request
  becomes an ordinary consult.
- **Nothing new is stored.** A missed consult keeps `status: "scheduled"` in MongoDB. "Missed"
  is worked out from the time, the same way on both sides. Don't add a status value or write
  anything for it.

The old rule, which both sides used before, was "joinable until 30 minutes after the slot
**ends**". It's gone from the app.

## 1. `src/lib/schedule.ts` (must stay byte-identical to the app's copy)

This file is shared with the app's `src/server/schedule.ts`; the two must stay identical. Make
exactly these two edits.

**a.** Insert this block directly above the line `const STEP_MS = START_STEP_MINUTES * MINUTE_MS;`:

```ts
/**
 * A booked consult waits this long after its start for the doctor to start it, so the patient
 * and the doctor can each join up to 10 minutes late. Not started by then, it is missed: no
 * longer joinable or startable, and listed with past consults. A started consult runs on.
 */
export const LATE_START_MINUTES = 10;

/** When a booked consult that nobody has started stops being joinable. */
export const startClosesAt = (consult: { scheduledAt: Date }) =>
  consult.scheduledAt.getTime() + LATE_START_MINUTES * MINUTE_MS;

/** Booked, never started, and more than `LATE_START_MINUTES` past its start. */
export const isMissed = (consult: { status?: Maybe<string>; scheduledAt: Date }, now: Date = new Date()) =>
  consult.status === "scheduled" && now.getTime() >= startClosesAt(consult);

```

**b.** In `consultBusy`, a missed consult stops holding the doctor's time. Replace its doc comment
and the `scheduled` line so they read:

```ts
/**
 * The time a consult keeps the doctor from other bookings. Booked: its slot. Running: from when
 * it started (or its slot, if later) to its slot's end, or longer while it runs over. Ended,
 * cancelled or missed: none, so a consult that ends early or never starts frees the doctor.
 */
```

```ts
  if (consult.status === "scheduled") return isMissed(consult, now) ? null : { start, end };
```

Keep the existing formatting exactly (double quotes, no other changes), so the file matches the
app's byte for byte. If I can give you the app's `src/server/schedule.ts`, copy it over instead and
check with `cmp`.

## 2. Starting a consult (`src/lib/console-actions.ts`)

- **`admitPatient`**: make the atomic start refuse missed consults by adding the time to the
  filter, so it stays a single update:
  ```ts
  { _id: id, doctor: doctor._id, status: "scheduled", scheduledAt: { $gt: new Date(Date.now() - LATE_START_MINUTES * 60_000) } }
  ```
  When nothing matched and the consult is still `"scheduled"` but missed, return something the UI
  can explain, e.g. `{ status: "missed" }`, rather than a silent failure.
- **`getConsultRoom`**: for a `"scheduled"` consult that `isMissed`, return an error like
  "This consult wasn’t started within 10 minutes of its time, so it has moved to past consults."
  and don't open the room. `"in_progress"` consults open as before at any time.

## 3. Lists and cards

- **`src/components/up-next.tsx`**: delete `JOIN_AFTER_END_MS`. A `"scheduled"` consult is
  joinable while `!isMissed(...)`, measured against `startsAt` (`Date.parse(c.startsAt) + 10 min`),
  not the slot's end. Keep `overdue` for the 0–10 minute window, and show how long is left, e.g.
  "Patient can join for 6 more min".
- **Today, the schedule, and the patient's consult history** (`getTodayConsults`, `getSchedule`,
  `src/app/(console)/consults`, `.../schedule`, `.../patients`): show a missed consult as **Missed**
  (a neutral pill, not red, with the word "Missed"). Move it out of anything titled
  upcoming/next/now into past/history. Remove its Start/Join/Admit buttons, but keep it visible so
  the doctor can see it happened. Don't count it in "waiting" or "starting soon" badges.
- Anything that refreshes on a timer (`LIVE_EVERY_MS`) should re-evaluate `isMissed` on each tick,
  so a consult turns Missed at the 10-minute mark without a reload.
- **Custom-time requests** don't change: a pending request still lapses at its requested time.

## 4. Check it

Run the console's lint and typecheck, then with a test consult:
1. A consult starting in 2 minutes can be started (Admit works).
2. A consult whose time was 5 minutes ago can still be started, and the patient can still join from
   the app.
3. A consult whose time was 15 minutes ago and never started shows as Missed in past/history, with
   no Start button. Admit and opening the room both refuse it.
4. A consult started 40 minutes ago (`in_progress`) still shows live and can be ended.
5. In the app, the same missed consult appears under Care → Your consults → Past as
   "Missed · not started within 10 min".

Before writing code, read `src/lib/schedule.ts`, `src/lib/console-actions.ts`,
`src/components/up-next.tsx` and the consult list pages, and tell me your plan in a few lines.
