Build a public emergency profile page in this Next.js site.

## What this is

HealthMatrix has a mobile app (Expo, separate codebase) where every member gets a unique QR code on their digital health card. The QR contains only a link:

```
https://healthmatrix-local.vercel.app/e/<CODE>
```

When anyone (a stranger, a paramedic) scans it with a phone camera, this site must show that member's emergency profile: blood group, allergies, conditions, medicines, emergency contacts with call buttons, and so on. Only the fields the member chose to show. No login.

The mobile app owns all the data and writes it to MongoDB. This site only **reads** it, plus it writes one log row per scan. Do not change how codes are generated or how profiles are stored; the app depends on that.

Before you start, look at this project: which Next.js version, App Router or Pages Router, how it connects to MongoDB today (if it does), and how the login redirect works (middleware.ts, or proxy.ts in Next 16+). Fit in with what's there.

## Requirements

### 1. Route: `GET /e/[code]`

- Public. **Everything under `/e/` must skip the login redirect.** Right now every path redirects to `/login`, so update the middleware/proxy matcher (or its auth check) to let `/e/` through. Don't make other routes public.
- Server-rendered on every request (`export const dynamic = 'force-dynamic'` in App Router). No caching. Use the Node.js runtime, not Edge, because the MongoDB driver needs Node.
- The page must work without client-side JavaScript. Responders may be on a weak network: keep it light, no heavy client bundles, no external fonts required to read it.
- Uppercase the code from the URL before looking it up (`code.toUpperCase()`).

### 2. Look up the member

Connect to the **same MongoDB** the app uses: same `MONGODB_URI`, database name `healthmatrix`. Add `MONGODB_URI` (and `MONGODB_DB_NAME=healthmatrix` if useful) to this project's env and to Vercel's environment variables. Never hard-code the URI.

1. Find the active QR link: `qrlinks.findOne({ code, status: 'active' })`.
2. Not found or revoked → the "not active" page with HTTP **404** (see below).
3. Load the member: `members.findOne({ _id: link.member })`. Missing → same 404 page.
4. Load the profile: `emergencyprofiles.findOne({ member: member._id })`. **May be null** for members who never filled it in; treat that as an empty profile with all fields visible.
5. Insert a scan log (see the schema below). If this insert fails, log the error and **still render the page**. A logging failure must never block a responder.

### 3. What to show

`visibleFields` on the profile lists which fields the public page may show. If the profile doc is missing, all 8 are visible. The fields are:

`photo`, `bloodGroup`, `allergies`, `conditions`, `medicines`, `emergencyContacts`, `organDonor`, `insurance`

Show a field only if it is **visible AND has data**. Never show "None" for an empty field: "no allergies recorded" would read as "has no allergies", which is dangerous. Hide empty fields instead.

Page layout, top to bottom (mobile first, max width ~480px, centred, 16px side padding):

1. **Red banner** (`#DD4301`, white text): title "Emergency profile", line "If {firstName} needs help, call an ambulance first, then their family."
2. **Identity row**: circular 56px avatar, then the name (bold) and a muted line like "Female, 38 years".
   - Avatar: the member's photo if `photo` is visible and `member.photoKey` is set (see the photo route below), otherwise initials on `#244C56`.
   - The muted line is built from `gender` ("Male"/"Female"/"Other") and age from `dateOfBirth`. Leave out parts that are missing, and the whole line if both are.
   - The name and identity row always show. They are not toggleable.
3. **Blood group** (from `member.bloodGroup`, not the profile): a large tile with a light red background `#FCE3D6`, border `#F6AF91`, label "Blood group" in `#C23A00`, value in big bold `#DD4301` text.
4. **Allergies**: joined with ", ".
5. **Conditions**: joined with ", ".
6. **Current medicines**: joined with "; ".
7. **Emergency contacts**: each shows the name (bold), the relation (muted, if any), and a red "Call" button that is a `tel:` link. Phones are stored as 10 digits, e.g. `9876543210`; link as `tel:+919876543210`.
8. **Organ donor**: "Yes" / "No". Show only if `organDonor` is a boolean, not if it's missing.
9. **Insurance**: `insurance.provider`, plus "Policy {policyNumber}" muted on a second line if present. Show only if `provider` is set.
10. If nothing in 3–9 was shown: a card saying "{firstName} has not added medical details yet. Call the helplines below."
11. Two full-width buttons: **"Call ambulance 108"** (`tel:108`, red `#DD4301`) and **"Emergency 112"** (`tel:112`, dark `#0E2A33`).
12. A muted footnote: "Doctors can request full records with the member's OTP." and "HealthMatrix".

Cards are white `#FFFFFF`, rounded 16px, on a page background of `#F3F7F7`. Text is `#0E2A33`, muted text `#4D6368`. A system font stack is fine. Make every tap target big enough (around 44px) for a stressed person on a phone.

`firstName` = the first word of `member.name`.

### 4. "Not active" page (HTTP 404)

The same banner style, titled "This code is not active", with the text "The card may have been replaced or reported lost. If someone needs help, call now.", followed by the same 108 / 112 buttons. Do not reveal whether the code ever existed.

### 5. Photo route: `GET /e/[code]/photo`

The member's photo is stored inside the member document as binary (`photoData`, `photoMimeType`), not as a file URL. Add a route that:

- looks up the active QR link by code → member (select `photoData` and `photoMimeType` explicitly),
- returns 404 unless the profile allows `photo` (missing profile = allowed) and `photoData` exists,
- responds with the bytes, `Content-Type: photoMimeType` (default `image/jpeg`), and `Cache-Control: no-store`.

The page's `<img src>` points at `/e/{code}/photo`. Also exempt it from login (it's under `/e/`).

### 6. Response headers on both routes

```
Cache-Control: no-store
X-Robots-Tag: noindex, nofollow
Referrer-Policy: no-referrer
```

Also add `<meta name="robots" content="noindex, nofollow">` on the page. This is medical data: it must never be cached by a CDN, indexed by search engines, or leaked to another site through the referrer. Make sure Vercel does not statically cache `/e/*`.

### 7. Security

- React escapes text by default. Do **not** use `dangerouslySetInnerHTML` with any member data.
- Never expose `_id`s, the member's phone number, `memberId`, email, or anything not listed above.
- The page is read-only. The only write allowed is inserting into `scanlogs`.

## Database schema (MongoDB, database `healthmatrix`)

The app uses Mongoose. If this site uses Mongoose too, pin the collection names explicitly (third argument to `mongoose.model`, or the `collection` schema option) so they match exactly. Using the plain `mongodb` driver is also fine.

### `qrlinks`
```ts
{
  _id: ObjectId,
  member: ObjectId,          // -> members._id
  code: string,              // unique, 12 chars from "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", e.g. "7Q2KXM4HPD9A"
  carrier: 'card' | 'lock_screen' | 'helmet_sticker' | 'tag',
  status: 'active' | 'revoked',
  revokedAt?: Date,
  createdAt: Date, updatedAt: Date,
}
```

### `members`
```ts
{
  _id: ObjectId,
  name: string,
  gender?: 'male' | 'female' | 'other',
  dateOfBirth?: Date,
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
  photoKey?: string,         // set when a photo exists
  photoData?: Binary,        // JPEG bytes
  photoMimeType?: string,
  // ...plus fields this page must NOT show: memberId, phone, email, plan, abha, family, etc.
}
```

### `emergencyprofiles` (one per member, may not exist)
```ts
{
  _id: ObjectId,
  member: ObjectId,          // unique, -> members._id
  allergies: string[],
  conditions: string[],
  medicines: string[],
  emergencyContacts: { name: string, relation?: string, phone: string /* 10 digits */, isNominee?: boolean }[],
  organDonor?: boolean,
  insurance?: { provider?: string, policyNumber?: string },
  medicalAlert?: string,     // not shown on this page
  visibleFields: ('photo'|'bloodGroup'|'allergies'|'conditions'|'medicines'|'emergencyContacts'|'organDonor'|'insurance')[],
  createdAt: Date, updatedAt: Date,
}
```

### `scanlogs` (insert one per page view)
```ts
{
  member: ObjectId,          // required
  qrLink: ObjectId,          // required, -> qrlinks._id
  scannedAt: Date,           // now
  ip?: string,               // first entry of the x-forwarded-for header
  userAgent?: string,        // user-agent header
  createdAt: Date, updatedAt: Date,  // set both to now if not using Mongoose timestamps
}
```
Leave out `location` and `alertedContacts`.

## Done when

- `/e/<a real active code>` (take one from the `qrlinks` collection) shows that member's page **without logging in** on a phone.
- A revoked or made-up code shows the "not active" page with status 404.
- Hiding a field in the mobile app (which removes it from `visibleFields`) hides it on the next page load.
- Every view adds a row to `scanlogs`.
- `curl -I` on the page shows the three headers above, with no CDN cache hit.
- No other route has become public, and the existing login flow still works.
- Lint and typecheck pass, and `MONGODB_URI` is set in the Vercel project's environment variables before you deploy.
