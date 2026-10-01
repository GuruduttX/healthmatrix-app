# HealthMatrix — product notes

Source: *HealthMatrix Card — Product brochure 2026* (20 pages). HealthMatrix is a joint venture of
Cloudspital Private Limited and Holden; Ekaay.AI is built by Cloudspital. Plans, prices and features
in the brochure are indicative and may change before launch.

## The idea

One membership that joins three things:

| Part | What it is |
| --- | --- |
| **Identity** — the HealthMatrix Card | ABHA-linked health ID (physical + digital) with an emergency QR that opens on any phone camera. |
| **Intelligence** — Ekaay.AI and doctors | An AI that explains the member's own records, and doctors who see them only with consent. |
| **In person** — screening pods | Cloudspital Arc pods near home and work; results reach the app within minutes. |

The loop the product is built around: **Screen → Understand → Consult → Treat → Track → Screen again.**

## The app: five tabs

| Tab | Contents |
| --- | --- |
| **Home** | Greeting, latest readings (BP, fasting sugar, SpO2) with Normal/Watch/High flags, "Ekaay noticed" trend card with a next action, quick actions (Ask Ekaay, Video consult, Book a pod, Add records), emergency-QR status. Family view with caregiver alerts. |
| **Records** | Searchable timeline grouped by month; filters All / Reports / Prescriptions / Vaccines. Record detail shows each value on its range bar with a flag, an "Ekaay explains" note, *Share with doctor* and *Ask a question*. |
| **Ekaay** | Chat (typed or spoken) answered from the member's own records, with inline trend charts and one suggested action (book a test, share with a doctor). |
| **Care** | Pods near you on a map with live slots and booking; doctors and video consults; medicines and reminders. |
| **Card** | Digital card, lock-screen QR toggle, emergency profile field toggles ("7 of 8 shown"), *Preview what a responder sees*, family cards, share. |

## Features by area

### Card and emergency QR
- Card front: 12-digit member ID (`HM 4829 1057 3316`), name, plan, blood group, member since / valid thru, "ABHA linked".
- Card back: emergency QR, one optional printed medical alert line, helplines 112 and 108, "found this card" return.
- The QR carries **no medical data** — only a revocable link. Same QR on card, lock screen, helmet sticker, key/bag tag.
- **Three access layers**
  1. *Anyone who scans* sees only the fields the member chose: photo, blood group, allergies, conditions, medicines, emergency contacts, organ donor, insurance.
  2. *A doctor, with an OTP* sees the full history. The OTP goes to the member or a chosen nominee; access expires on its own.
  3. *Only the member* sees everything, changes what is shared, and reads the access log.
- **On every scan:** logged with time and place; family alerted by SMS and WhatsApp; one-tap call to 112, 108 or contacts; nearby hospitals with directions.
- Lost card: revoke in the app, old QR stops working at once.
- The public scan page needs no app (brochure shows `cloudspital.ai/e/<code>`).

### Records
- Sources: pod results, photographed reports (Ekaay reads and files each value), PDFs forwarded to a WhatsApp assistant, records pulled from ABHA/ABDM-connected hospitals and labs.
- Types: pod screening, lab report, prescription, vaccination.

### Ekaay.AI
- Explains every report in plain words against the member's own history.
- Turns photos of old reports into structured, searchable records.
- Watches trends between visits (sugar, BP, cholesterol, weight).
- Reminds the whole family: medicines, tests, vaccines.
- Prepares a one-page summary for the doctor before each consult.
- **Guardrails:** never prescribes or diagnoses. Red-flag symptoms (chest pain, breathlessness, stroke signs) trigger an immediate prompt to call 112 or start a video consult.
- Essential plan: 20 questions a month. Paid plans: unlimited.

### Doctors and video consults
- Flow: choose doctor → share record with one OTP → consult on video → e-prescription lands in reminders → book ordered tests at a pod, results flow back to the same doctor.
- Specialties: general medicine, diabetes and endocrinology, cardiology, paediatrics, gynaecology, dermatology, psychiatry, nutrition.
- **Doctor console** (separate web app): patient timeline, Ekaay summary, trend charts, "ask the record" with sources, prescription drafted from a voice note or photo, allergy/interaction checks before signing.

### Screening pods
| Tier | Tests |
| --- | --- |
| Arc One | BP, pulse, SpO2, temperature, weight, height, BMI, blood sugar, uric acid, total cholesterol, urine analysis |
| Arc Plus | Arc One + full lipid profile and HbA1c |
| Arc Pro | + liver and kidney function, complete blood count (22 parameters) |
| Arc Max | Up to 170 tests and parameters + 30-second contactless vitals scan |

Visit: tap or scan card at the pod → operator runs the tests → results in the app within minutes → Ekaay explains, doctor one call away.
Sites: residential societies, corporate campuses, clinics, pharmacies, community centres, government health centres.

### Family
- One plan and one app for everyone; caregiver view for children and parents.
- Gentle alerts (missed medicine, vaccine due, consult suggested) and an alert whenever a family card is scanned.

## Plans

| | Essential | Plus | Family | Senior Care |
| --- | --- | --- | --- | --- |
| Price | Free | ₹1,499 / year | ₹3,999 / year, up to 4 | ₹2,499 / year per senior |
| Digital card, emergency QR, family alerts, locker, ABHA | ✓ | ✓ | ✓ | ✓ |
| Physical card and tags | Digital only | Card, helmet tag, key tag | 4 cards and tags | Card and key tag |
| Ekaay.AI | Basic, 20 questions / month | Advanced, unlimited | Advanced, unlimited | Advanced, unlimited |
| Pod screenings (core panel) | Pay per test | 2 a year | 2 per member a year | 4 a year + monthly vitals |
| Video consults with a GP | Pay per consult | 2 a year | 6 a year, shared | 6 a year |
| Member price on extras | — | 15% off | 15% off | 20% off |
| Doctor summary before consult | — | ✓ | ✓ | ✓ |
| Caregiver access and alerts | — | — | ✓ | ✓ |

**Community** (societies, employers, groups): co-branded cards, on-site pods, quarterly health days, anonymised dashboards, per-member pricing.

Rule that must hold in code: **the emergency QR and family alerts are free on every plan, forever.**

## Privacy and compliance
- OTP for every full-record view; access expires on its own.
- Member designs the emergency view field by field.
- Every access is logged (who, what, when, where) and can be revoked in one tap.
- Encrypted in transit and at rest; role-based access and audit trails across app, doctor console and pods.
- Designed around ABDM's consent model and the Digital Personal Data Protection Act, 2023. Consults under the Telemedicine Practice Guidelines, 2020.
- Personal health data is never sold to advertisers or insurers.

## Brand
- Colours: ink `#0E2A33`, orange `#DD4301`, mid orange `#E67748`, peach `#F6AF91`, surface `#F3F7F7`. Status: green `#10806D`, amber `#B5780A`.
- Type: Bricolage Grotesque (headings), Figtree (body).
- Tokens live in [`src/constants/theme.ts`](../src/constants/theme.ts).

## Open questions
- SMS/WhatsApp provider for OTPs and scan alerts.
- ABHA/ABDM integration access (sandbox credentials, HIP/HIU registration).
- Where the public emergency page is hosted and under which domain.
- Which model/provider powers Ekaay, and where OCR of photographed reports runs.
- Video consult provider.
- Whether the doctor console and pod operator app are in this repo's scope.
