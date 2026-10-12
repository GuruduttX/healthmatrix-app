# Prompt for the doctor console: custom-time booking requests

Paste everything below the line into the coding agent working in `healthmatrix-console-main`.

---

Patients can now ask a doctor for a consult at **a time that isn't one of the open slots**, for example 3:25 PM. This is built in the HealthMatrix app, which shares this MongoDB. The app saves each ask as a **consult request**. Nothing is booked until the doctor answers in the console:

- **Approve:** the console creates the consult, exactly like a normal booking, and the patient sees it as booked.
- **Decline:** no consult is created. The patient sees "Doctor not available" with an optional note, and a button to book one of the open slots instead.

Your job is the doctor's side: see the requests, approve or decline them, and get notified.

## The shared collection: `consultrequests`

The app creates documents here. Add a mirror model, `src/models/consult-request.model.ts`, with exactly these fields and the same collection name. Mongoose's default for model name `ConsultRequest` is `consultrequests`.

```ts
member:        ObjectId → Member, required
doctor:        ObjectId → Doctor, required
specialty:     String, enum SPECIALTIES, default "general_medicine"
requestedAt:   Date, required   // the start asked for: any whole minute, e.g. 3:27 PM, possibly only minutes away
durationMinutes: Number, required // the doctor's consult length when asked
reason:        String            // what the patient wants to discuss, optional
status:        String, enum ["pending", "approved", "declined", "withdrawn"], default "pending"
respondedAt:   Date              // when the doctor answered, or the patient withdrew
declineReason: String            // optional note shown to the patient when declining
consult:       ObjectId → Consult // the consult created on approval
timestamps: true
index: { doctor: 1, status: 1, requestedAt: 1 }
```

Rules:
- Only the console moves a request from `pending` to `approved` or `declined`. The app only creates requests and sets `withdrawn`.
- Every change must be **conditional on `status: "pending"`**, e.g. `updateOne({ _id, doctor, status: "pending" }, …)`. Then a doctor answering and a patient withdrawing at the same moment can't both win. If nothing matched, reload and tell the doctor that the patient withdrew it.
- A pending request whose `requestedAt` has passed is **expired**: the app shows "No reply in time". Don't offer Approve for it; show it greyed out as "Expired", or leave it out.
- Patients can ask for a time **only a minute or two away**, so new requests must reach the doctor quickly. Keep the Today card and sidebar badge fresh: re-read them when the page regains focus, and on the console's existing refresh. Show "starts in 4 min" in brand colour for requests under 15 minutes away.

## Approving: create the consult safely

Approval must create a consult that can't overlap another booking, including one the app makes at the same moment. The app guards its bookings with a transaction that bumps `doctors.bookingVersion`. **Do exactly the same**, so app bookings and approvals take turns:

```ts
await mongoose.connection.transaction(async (session) => {
  // Same lock as the app's booking route: two writes to this field conflict and Mongo retries.
  await DoctorModel.updateOne({ _id: doctor._id }, { $inc: { bookingVersion: 1 } }, { session });

  const request = await ConsultRequestModel.findOne(
    { _id: id, doctor: doctor._id, status: "pending" }, null, { session });
  if (!request) throw new Error("This request was withdrawn or already answered.");
  if (request.requestedAt <= new Date()) throw new Error("This time has already passed.");

  const start = request.requestedAt.getTime();
  const end = start + request.durationMinutes * 60_000;
  // The doctor's booked and running consults, with `consultBusy` from src/lib/schedule.ts.
  const consults = await ConsultModel.find({
    doctor: doctor._id,
    status: { $in: ["scheduled", "in_progress"] },
    scheduledAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  }).session(session);
  const clash = consults.some((c) => {
    const held = consultBusy(c, new Date());
    return held && start < held.end && held.start < end;
  });
  if (clash) throw new Error("You already have a consult at this time.");

  const [consult] = await ConsultModel.create([{
    member: request.member,
    doctor: doctor._id,
    specialty: request.specialty,
    scheduledAt: request.requestedAt,
    durationMinutes: request.durationMinutes,
    mode: "video",
    reason: request.reason,
  }], { session });

  await ConsultRequestModel.updateOne(
    { _id: request._id, status: "pending" },
    { $set: { status: "approved", respondedAt: new Date(), consult: consult._id } },
    { session },
  );
});
```

- Add `bookingVersion: Number` to `src/models/doctor.model.ts`, with a comment: it only makes bookings and approvals take turns. If it's missing from the schema, Mongoose's strict mode silently drops the `$inc`, and there is no lock.
- The consults collection's `one_booking_per_slot` unique index can still reject an exact duplicate start (Mongo error `11000`). Show that as "You already have a consult at this time."
- Don't check the doctor's weekly hours or time off: approving a time outside them is the doctor's choice. Do check the clash, the past time and the status.
- The approval must not use `schedule.ts`'s `isBookable`, which allows only times inside sessions. Don't edit `schedule.ts`; it must stay byte-identical to the app's copy.

## Declining

```ts
updateOne(
  { _id: id, doctor: doctor._id, status: "pending" },
  { $set: { status: "declined", respondedAt: new Date(), declineReason: note || undefined } },
)
```

- The note is optional, up to 200 characters, and the patient reads it word for word. Offer quick picks: "I'm not available at this time." and "Please book one of my open slots." Also allow free text, and say "The patient will see this".
- With no note, the app shows: "<Doctor> can't do this time. Pick one of their open slots instead."

## UI

### 1. "Booking requests" on Today, and a full list on Schedule

On **Today**, above the consult list, show a card with pending, not-expired requests, soonest first. Each row shows:
- the patient's avatar, name, age and sex, linking to their patient page;
- the **requested time** in bold ("Wed 14 Oct, 3:25 PM"), plus "in 2 h" when it's today;
- a chip: "Outside your hours" when the time isn't inside a weekly session or falls in time off, or "Clashes with <patient> at 3:00" when it overlaps a booked consult. Work both out with the same `consultBusy` and session logic.
- the reason, one line;
- how long ago it was asked;
- **Approve** (primary, brand colour) and **Decline** (secondary). Decline opens a small dialog with the note, using `confirm-dialog.tsx`'s pattern.

On success:
- **Approve:** toast "Booked: <patient>, Wed 3:25 PM". The row disappears and the consult appears in the schedule (`refresh()`).
- **Decline:** toast "Declined. <patient> has been told."

On error, show the message in the row; for example, the patient withdrew.

On **Schedule**, add a "Requests" section or tab listing every pending request in the booking window, in the same row format.

Hide the Today card when there are no requests.

### 2. Sidebar badge and notifications

- Show a count badge on Today and Schedule in `sidebar.tsx` and mobile chrome: the number of pending, not-expired requests.
- In `getNotifications`, under the existing `alerts.bookings` setting, add "<Patient> asked for Wed 3:25 PM", linking to Today, from requests created in the notification window. Also add "<Patient> withdrew their request" for `withdrawn` ones.

### 3. Where requests must not appear

- Requests aren't consults. Don't add them to `findConsults`, the patient's consult history, or busy times. Only the consult created on approval holds time.

## Done when

- `npm run lint` and `npm run build` pass.
- `src/lib/schedule.ts` is unchanged (`cmp` with the app's `src/server/schedule.ts` prints nothing).
- Manual test with the app (web at `http://localhost:8081` works):
  1. The patient opens a doctor, taps **Custom time**, and types today at a time a few minutes from now, e.g. 3:27 PM. The default is the next minute. They tap Send request and see "Request sent".
  2. The console's Today shows the request with Approve and Decline, the sidebar badge is 1, and there's a notification.
  3. **Approve.** In the app (Care → Your consults → Upcoming), the request is replaced by a booked consult at 3:25 PM, which can be joined 5 minutes before.
  4. Repeat and **Decline** with a note. The app shows "Doctor not available" with the note and a **Book a slot** button.
  5. Repeat and let the patient **Withdraw**. Approving now fails cleanly with "withdrawn".
  6. Ask for a time, then book a normal slot that overlaps it from another account. Approve now fails with "You already have a consult at this time."
  7. A request whose time has passed can't be approved.
