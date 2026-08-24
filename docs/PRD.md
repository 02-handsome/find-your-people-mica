# Find Your People — Product Requirements Document

**Version:** 1.0
**Scope:** Assignment build (working web app, deployed)
**Owner:** Mayank Nagpal

---

## 1. Overview

### 1.1 Problem

On a campus of 400 students, a typical student knows 50 and regularly interacts with 20. The remaining 350 are unknown faces. Connections form through proximity and accident — seating, hostel allocation, timing — not through fit.

Two obstacles prevent students from bridging this gap:

1. **Discovery.** You cannot tell which unknown person wants what you want.
2. **Status cost.** Wanting company is not embarrassing. *Visibly* wanting company is. Nobody broadcasts "I have no one to go to the gym with" to a batch group of 400.

### 1.2 Solution

A verified campus app where students post a single, private, expiring statement of intent, and are shown a small number of people who posted the same intent. Because both parties declared the same need, neither is exposed as "the one who asked."

### 1.3 V1 Scope Statement

V1 supports **one intent category: recurring physical activity** (gym, running, sport). This is deliberate. Matching products die from empty result sets, and a single dense lane beats ten empty ones.

### 1.4 Non-Goals

Explicitly out of scope for V1:

- In-app chat or messaging
- Multiple simultaneous intents per user
- Photo uploads
- Non-activity intent categories
- Native mobile apps
- Push or email notifications
- Multi-campus support
- Group matching (3+ people at once)

---

## 2. Success Criteria

| # | Criterion | Measure |
|---|---|---|
| S1 | End-to-end flow completes without error | A grader signs up, posts an intent, sends a request, accepts it from a second account, and sees contact details revealed |
| S2 | App is never empty | A new user always sees at least 3 candidate matches on first search |
| S3 | Full CRUD is demonstrable | Create, read, update, and delete are all reachable through the UI on the intent entity |
| S4 | Deployed and publicly accessible | Live URL loads on desktop and mobile with no local setup |
| S5 | Two test accounts documented | Credentials in README and visible on login screen |

---

## 3. Users

**Primary:** A first-year student, 0–8 weeks into a new campus, with a small existing circle and a specific recurring need (a gym partner) they cannot easily fill.

**Assumptions:** Owns a smartphone. Has a college email. Will abandon signup if it takes longer than a minute. Will not return if the first result set is empty.

---

## 4. Data Model

### 4.1 `users`

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| email | text, unique | Must end in approved campus domain |
| name | text | Real name, displayed |
| year | text | e.g. "PGP 1", "Year 2" |
| tags | text[] | Exactly 3, from a fixed list |
| avatar_url | text | Generated, not uploaded |
| contact_handle | text | Phone or WhatsApp. **Hidden until a request is accepted** |
| created_at | timestamptz | |

### 4.2 `intents`

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | One `active` intent per user, enforced |
| activity | enum | `gym` \| `running` \| `sport` |
| days | text[] | Subset of Mon–Sun |
| time_start | time | |
| time_end | time | |
| experience_level | enum | `beginner` \| `regular` \| `serious` |
| status | enum | `active` \| `withdrawn` \| `expired` |
| created_at | timestamptz | |
| expires_at | timestamptz | `created_at + 7 days` |

### 4.3 `requests`

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| from_user_id | uuid (FK → users) | |
| to_user_id | uuid (FK → users) | |
| intent_id | uuid (FK → intents) | The sender's intent |
| status | enum | `pending` \| `accepted` \| `declined` |
| created_at | timestamptz | |

**Constraint:** one `pending` or `accepted` request per `(from_user_id, to_user_id)` pair.

---

## 5. Functional Requirements

### F1 — Authentication

| ID | Requirement |
|---|---|
| F1.1 | User signs up with email and password |
| F1.2 | Email domain is validated against an allowed campus domain list. Non-matching domains are rejected with: *"Find Your People is currently only open to [campus]. Use your college email to join."* |
| F1.3 | After signup, user completes profile: name, year, 3 tags, contact handle |
| F1.4 | Avatar is auto-generated from user ID (DiceBear or equivalent) |
| F1.5 | User can log in and log out |
| F1.6 | Unauthenticated users hitting any route other than login/signup are redirected to login |

**Acceptance:** Signup to usable home screen takes under 60 seconds and fewer than 8 input actions.

---

### F2 — Intent CRUD

| ID | Requirement |
|---|---|
| F2.1 | **Create** — user selects activity, days, time window, experience level. Intent is created with `status = active`, `expires_at = now + 7 days` |
| F2.2 | A user may hold only one `active` intent. If one exists, the create action is replaced by a view of the existing intent |
| F2.3 | **Read** — user's active intent is displayed on home with a countdown ("Expires in 4 days") |
| F2.4 | **Update** — user can edit days, time window, and experience level. `expires_at` does not reset on edit |
| F2.5 | **Delete** — user can withdraw the intent, setting `status = withdrawn`. Withdrawn intents disappear from all match pools immediately |
| F2.6 | **Expiry** — handled on read, not by a scheduled job. Any query for active intents filters `status = 'active' AND expires_at > now()` |

**Acceptance:** All four CRUD operations are reachable from the UI within two taps of the home screen.

---

### F3 — Matching

| ID | Requirement |
|---|---|
| F3.1 | Candidate pool = all intents where: `status = active`, not expired, `activity` matches the viewer's, `user_id != viewer`, and no existing pending or accepted request between the pair |
| F3.2 | Hard filter: candidate must share **at least one day** and have an **overlapping time window** with the viewer |
| F3.3 | Candidates are scored, sorted descending, and the **top 3** are returned |
| F3.4 | If fewer than 3 pass the hard filter, relax the time-overlap requirement and label the extras *"Close, but different hours"* |
| F3.5 | Existing friends are not modelled in V1. Ranking makes no attempt to surface people the user already knows |

**Scoring:**

```
score = (shared_days × 3)
      + (experience_level match ? 2 : 0)
      + (overlapping_tags × 2)
      + (time_overlap_minutes / 30)
```

**Empty state (F3.6):** If the pool is genuinely empty, display: *"You're early. Your intent is live — we'll surface people as they post."* Never show a blank screen.

---

### F4 — Request and Reveal

| ID | Requirement |
|---|---|
| F4.1 | From a match card, user sends a connection request. Status = `pending` |
| F4.2 | Sender's view of that card changes to "Request sent" and is not re-sendable |
| F4.3 | Recipient sees incoming requests on their home screen with the sender's name, avatar, tags, and intent details |
| F4.4 | Recipient can accept or decline |
| F4.5 | **On accept**, both users see the other's `contact_handle`. This is the only point at which contact is revealed |
| F4.6 | On decline, the request is removed from both views. The sender is not told it was declined — the card simply returns to neutral |
| F4.7 | Accepted connections are listed on a "Connections" screen with contact details |

**Acceptance:** The full request → accept → reveal loop is demonstrable across two accounts in under 90 seconds.

---

### F5 — Seed Data

| ID | Requirement |
|---|---|
| F5.1 | The database ships with **25–30 seeded users**, each with a realistic name, year, 3 tags, avatar, and one active intent |
| F5.2 | Seeded intents must cluster so that any plausible new intent finds at least 3 matches — weight coverage toward 6–8am and 6–9pm |
| F5.3 | At least 5 seeded intents must overlap with each test account's intent |
| F5.4 | Two functional test accounts exist with known passwords, each able to log in, send, and receive |
| F5.5 | Seed script is committed to the repo and re-runnable |

> **This requirement is as important as any feature.** A matching product demoed on an empty database looks broken regardless of code quality.

---

## 6. Core User Flow

```
Sign up (campus email)
   ↓
Profile: name, year, 3 tags, contact
   ↓
Post intent: activity + days + time + level
   ↓
See 3 matches  ←──────────┐
   ↓                      │
Send request              │  (decline returns here)
   ↓                      │
Recipient accepts ────────┘
   ↓
Contact revealed → connection saved
```

---

## 7. Screens

| # | Screen | Contents |
|---|---|---|
| 1 | Login / Signup | Email, password, campus notice, **visible test credentials** |
| 2 | Profile setup | Name, year, tag picker (3), contact handle |
| 3 | Post intent | Activity, day toggles, time range, experience level |
| 4 | Home | Active intent card with countdown + edit/withdraw; incoming requests; link to matches |
| 5 | Matches | 3 cards — avatar, name, year, tags, days/time, Connect button |
| 6 | Connections | Accepted matches with revealed contact handles |

Responsive down to 375px. Mobile is the primary layout.

---

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| N1 | Deployed to a public URL with HTTPS |
| N2 | Deploys automatically from the GitHub main branch |
| N3 | Passwords hashed by the auth provider; never stored in plaintext |
| N4 | `contact_handle` is never returned by any API call unless a request between the two users has `status = accepted` |
| N5 | Any page loads in under 3 seconds on mobile data |
| N6 | Deployment pipeline is working from day one of the build, not the final day |

**N4 is the one security requirement that matters.** Contact reveal is the app's core promise; leaking it in an unfiltered API response breaks the product thesis, not just the code.

---

## 9. Build Sequence

| Phase | Deliverable | Done when |
|---|---|---|
| 1 | Repo, database, deployed hello-world | Public URL loads |
| 2 | Auth + domain validation + profile setup | Can create an account and log back in |
| 3 | Schema + seed script | 30 users with active intents in the database |
| 4 | Intent CRUD | All four operations work from the UI |
| 5 | Match list | 3 ranked, filtered results render |
| 6 | Request → accept → reveal | Full loop works across two accounts |
| 7 | **Feature freeze.** Polish, empty states, mobile check | Flow runs 3× clean in a fresh browser |
| 8 | README, credentials, demo recording | Submission ready |

Phases 7 and 8 are not buffer. They carry the largest share of the grade and should be protected from feature creep.

---

## 10. Open Questions

**Q1 — Retention.** Nothing in this document explains why a user opens the app in week nine. Once a gym partnership forms, the app has served its purpose and become irrelevant. This is the product's central unsolved problem and is deliberately left unanswered rather than papered over.

**Q2 — Trust and safety.** V1 has no block, report, or moderation capability. Acceptable for an assignment build; a hard blocker for real deployment.

**Q3 — Existing-circle filtering.** The stated value is discovery *beyond* your existing circle, but V1 cannot detect who you already know. Requires a social graph the app does not have at launch.

**Q4 — Contact channel.** Handing off to WhatsApp means all subsequent interaction is invisible to the product, so success cannot be measured. This is the correct V1 tradeoff and a real long-term cost.
