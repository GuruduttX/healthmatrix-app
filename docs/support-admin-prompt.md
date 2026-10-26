# Prompt: build the enquiries and support chat admin

Paste everything below the line into Claude Code, opened in the admin project. It assumes no access
to the HealthMatrix app's code.

---

Build one **Enquiries** area in this admin where our team handles both kinds of enquiries we get:

- **Website enquiries:** forms on the Cloudspital website, sent by anyone with **no login**.
  They're one-off messages; the team follows up by phone, WhatsApp or email.
- **App chats:** live chats that **signed-in HealthMatrix members** start from the mobile app
  (Care tab → Help & support). The team replies here and the member sees it in the app within a few
  seconds.

The website and the app are both finished and live. This admin only reads and writes the shared
MongoDB collection described below. Don't change the data format: the website and the app depend on
it exactly as written.

## Where the data is

- **Database:** the same MongoDB the website and the app use (Atlas), database name `healthmatrix`.
  Use this project's existing MongoDB connection and env vars if it has them. Otherwise add
  `MONGODB_URI`, and `MONGODB_DB` defaulting to `healthmatrix`. Never hard-code the URI.
- **Collection:** `enquiries`. Both kinds live here. **Tell them apart by `type`:**

  | `type` | Source badge | Who sent it | Login |
  |---|---|---|---|
  | `"contact"` or `"demo"` | **Website** | anyone, from a website form | none |
  | `"support"` | **App** | a signed-in HealthMatrix member | required |

  App documents also carry `source: "app"`. Website documents have no `source` field, so always
  decide by `type`, and treat any type other than `support` as Website.
- **Indexes:** the inbox needs `{ type: 1, status: 1, updatedAt: -1 }`, and the app uses
  `{ type: 1, member: 1, updatedAt: -1 }`. Create both once if they're missing (`createIndex` on
  an index that already exists does nothing). Don't drop or change any other index on the
  collection.

## Website enquiry documents (`type: "contact" | "demo"`)

```ts
{
  _id: ObjectId,
  type: "contact" | "demo",
  name: string,
  email: string,          // may be ""
  phone?: string,
  organization?: string,
  message?: string,       // multi-line: "Enquiring for: …\nModel of interest: …\nCity: …\n\n<their message>"
  status: "unread" | "read" | "contacted" | "resolved",
  createdAt: Date,
  updatedAt: Date,
}
```

There's no chat for these: nothing typed in the admin can reach the sender. The team changes the
status as they follow up (`unread` → `read` when opened → `contacted` after calling → `resolved`)
with `$set: { status, updatedAt: now }`. If this admin already has a website enquiries page, keep it
working and fold it into the new area rather than rebuilding it differently.

## App chat documents (`type: "support"`, one per chat)

```ts
{
  _id: ObjectId,
  type: "support",
  source: "app",
  name: string,          // member's name when the chat started
  email: string,         // may be ""
  phone: string,         // 10-digit Indian mobile, e.g. "9876543210"
  memberId: string,      // 12-digit HealthMatrix ID; show it as "HM 4829 1057 3316"
  member: ObjectId,      // the member: `_id` in the `members` collection
  topic: "consults" | "pods" | "records" | "medicines" | "account" | "billing" | "app" | "other",
  message: string,       // the member's first message
  status: "unread" | "read" | "contacted" | "resolved",
  messages: [
    {
      _id: ObjectId,
      from: "member" | "support",
      text: string,        // trimmed, 1–2000 characters
      agentName?: string,  // only on "support" messages: the team member's first name
      at: Date,
    },
  ],
  memberReadAt?: Date,   // the member last had the chat open (their read receipt)
  supportReadAt?: Date,  // the team last opened it (the app shows "Seen" from this)
  endedAt?: Date,
  endedBy?: "member" | "support",
  createdAt: Date,
  updatedAt: Date,
}
```

Topic labels: consults "Doctor consults", pods "Pod tests", records "Health records", medicines
"Medicines", account "My account", billing "Plans & payments", app "App problem", other
"Something else".

The `members` collection (read-only for you) has the member's current `name`, `phone`, `email`,
`memberId` and `plan`. Show only those. It also holds health data, which the support area must
never read or show.

### What `status` means for an app chat

| status | meaning | set by |
|---|---|---|
| `unread` | the member wrote last and the team hasn't opened it since | app, on every member message |
| `read` | the team opened it but hasn't replied | admin, when an agent opens an `unread` chat |
| `contacted` | the team replied last | admin, on every reply |
| `resolved` | the chat ended; nobody can write to it any more | app (member taps End) or admin |

A chat is **open** while `status !== "resolved"`. A member has at most one open chat at a time, so
one member can have one open chat and any number of ended ones.

### How the app behaves (so the admin matches it)

- The app polls an open chat every 4 seconds, so whatever you write shows on the member's phone
  within about 4 seconds. No push is needed.
- Each member message is added with one atomic update:
  `$push: { messages: {...} }`, `$set: { status: "unread", memberReadAt: now }`, which also bumps
  `updatedAt`.
- The app shows "Seen" under the member's last message once `supportReadAt >= that message's at`,
  and counts the team's messages after `memberReadAt` as new replies.
- If the member taps **End**, the app sets `status: "resolved"`, `endedAt`, `endedBy: "member"`.
- The app refuses to add messages to a `resolved` chat, or to one that already has 400 messages.
- In the app, a member can only ever see their own chats. Here, staff see everyone's. That's why
  every page and route below must be staff-only.

## What to build

Put everything behind the admin's existing login, so only signed-in staff can use it. Use the
existing admin auth; don't add a new one. Match this admin's existing design system and components.
It's a working tool for the team: dense, fast, keyboard friendly, and easy to scan.

### 1. Enquiries home (`/admin/enquiries`, or whatever fits this admin's routing)

- Three tabs at the top, with counts: **App chats**, **Website**, **All**.
- **Source badge on every row:** "App" (a phone icon, one colour) or "Website" (a globe icon, a
  different colour), so the source is clear at a glance in every list, including All.
- Filter chips for status, and a search box (name, phone, HM ID, email, organisation).
- Sort by `updatedAt` descending, with app chats waiting on the team (`unread`) pinned to the top.
- A **"waiting" badge in the admin nav** (count of `type: "support", status: "unread"`), polled every
  5 seconds while the page is visible, so staff notice new chats from any page.

### 2. Website tab

- Rows: name, organisation, phone, email, the first line of the message, time received, status.
- Click a row to open a detail panel or page with the full message (keep its line breaks), and
  one-tap **Call**, **WhatsApp** (`https://wa.me/91<phone>` for 10-digit numbers) and **Email**
  buttons.
- Status buttons: Mark read / Contacted / Resolved. Opening an `unread` one marks it `read`.
- No reply box, since the sender can't receive it.

### 3. App chats tab: grouped by customer

The app side is about people, so show it **customer by customer**, not as a flat list of chats.

- **Customers list:** one row per member who has app chats. Show:
  - avatar initials, name, HM ID and phone;
  - a state pill: **Waiting** (has an `unread` chat), **Open** (has an open chat the team answered)
    or **No open chat**;
  - the topic and last-message preview of their latest chat ("Member: …" / "Priya: …");
  - a total chat count ("4 chats");
  - last activity as relative time in India time ("2 min ago", Asia/Kolkata).

  Waiting customers come first, then by latest activity. Build it with one aggregation, e.g.:
  ```js
  [
    { $match: { type: "support" } },
    { $sort: { updatedAt: -1 } },
    { $group: {
        _id: "$member",
        name: { $first: "$name" }, memberId: { $first: "$memberId" },
        phone: { $first: "$phone" }, email: { $first: "$email" },
        chats: { $sum: 1 },
        waiting: { $sum: { $cond: [{ $eq: ["$status", "unread"] }, 1, 0] } },
        open: { $sum: { $cond: [{ $ne: ["$status", "resolved"] }, 1, 0] } },
        lastAt: { $max: "$updatedAt" },
        latest: { $first: { topic: "$topic", status: "$status", last: { $arrayElemAt: ["$messages", -1] } } },
    } },
    { $sort: { waiting: -1, lastAt: -1 } },
  ]
  ```
  Paginate it (50 per page). Refresh every 5 seconds while visible.
- **Customer page** (`/admin/enquiries/customers/[memberId]`, using the member's ObjectId):
  - Header: name, HM ID, phone (Call / WhatsApp), email, plan. Take the current values from
    `members`, falling back to the chat's copy.
  - The **open chat** on top, if any, then **all past chats** as a timeline. Each one shows the
    topic, date, message count, who ended it, and a one-line preview, and opens the chat view.
  - A note line like "Customer since <first chat date> · 4 chats".
- **Chat view** (`/admin/enquiries/chats/[id]`), opened from the customer page or the All tab:
  - Header: customer name (links to their customer page), HM ID, phone, topic, reference (the last
    6 characters of `_id` upper-cased, e.g. `#A1B2C3`), started time, status, the **App** badge.
  - Messages: the customer on the left, the team on the right with the agent's name. Day separators
    ("Today", "Yesterday", "Sat, 10 Oct"). Auto-scroll to the newest message. Times in India time.
    Show "Seen by customer" under the team's last message when `memberReadAt >= its at`.
  - A side panel (or collapsible section) with this customer's other chats, so the agent sees the
    history without leaving the chat.
  - Opening the chat, and every poll while it's on screen, marks it read for the team:
    `$set: { supportReadAt: now }`, plus `status: "read"` **only if** it's currently `unread`. Do it
    with a conditional update, and **don't bump `updatedAt`** for a read (MongoDB driver: plain
    `updateOne` that doesn't touch `updatedAt`; Mongoose: `{ timestamps: false }`).
  - Poll every 3 seconds while visible, so the customer's new messages appear live.
  - **Reply box:** Enter sends, Shift+Enter adds a new line, 2000-character limit, trimmed, no blank
    messages. Send with one atomic update, conditional on the chat still being open:
    ```js
    updateOne(
      { _id, type: "support", status: { $ne: "resolved" }, "messages.399": { $exists: false } },
      {
        $push: { messages: { _id: new ObjectId(), from: "support", text, agentName, at: now } },
        $set: { status: "contacted", supportReadAt: now, updatedAt: now },
      },
    )
    ```
    If it matched nothing, the customer ended the chat meanwhile: show "The customer ended this
    chat" and reload. `agentName` is the signed-in staff member's first name. If admin users have no
    name, ask me what to use rather than guessing.
  - **End chat** button (asks to confirm):
    `$set: { status: "resolved", endedAt: now, endedBy: "support", updatedAt: now }`, conditional on
    `status: { $ne: "resolved" }`. Ended chats are read-only, with a line saying who ended it and
    when.
  - Nice to have: **canned replies**, a small menu of saved answers the agent can insert into the
    reply box and edit before sending.
- **Don't** let staff start a chat, move a chat to another customer, or delete chats or enquiries.
  History must stay intact.

## Technical notes

- Read and write MongoDB only from server code (route handlers or server actions), and check the
  staff session on every read and write. Never send the URI or raw collection access to the browser.
- Validate every id as a 24-character hex ObjectId before querying. Always include the `type`
  condition in the filter (`type: "support"` for chats, `type: { $ne: "support" }` for website
  enquiries), so one tab can never act on the other kind.
- Every write must be a single atomic `updateOne`/`findOneAndUpdate` with the conditions above, so a
  customer and an agent acting at the same moment can't corrupt a chat. Never read a document,
  change it in memory, and save it back.
- Polling: small `GET` route handlers returning JSON with `cache: "no-store"` (or
  `export const dynamic = "force-dynamic"`). Stop polling when the tab is hidden (listen to
  `visibilitychange`). For lists, project out `messages` except the last one
  (`{ messages: { $slice: -1 } }`).
- When you're done, run the project's lint and typecheck, then test with real data:
  1. Send an enquiry from the website form (no login). It shows under **Website** with the Website
     badge.
  2. Start a chat in the HealthMatrix app (Care tab → Help & support). It shows under **App chats**
     on that customer's row, as Waiting.
  3. Reply from the admin and check the reply shows on the phone within a few seconds, then that
     "Seen by customer" appears.
  4. End the chat from each side. Start a second chat from the same app account and check the
     customer page lists both.

Before writing code, look at how this admin is structured (routing, auth, DB helper, UI kit,
any existing enquiries page) and tell me your plan in a few lines.
