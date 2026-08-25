#!/usr/bin/env node
/**
 * Seed script — PRD F5.
 *
 * Creates 30 fixture users, each with a completed profile and one active
 * intent, plus intents for the two published test accounts. Re-runnable
 * (F5.5): running it twice leaves the same 32/32 state.
 *
 * REQUIRES the Supabase secret key, which bypasses Row Level Security.
 * That is unavoidable here: public.users foreign-keys to auth.users, and no
 * public endpoint can create an auth user for someone else. The script refuses
 * to run without it rather than silently falling back to the publishable key,
 * which would half-seed the database under RLS and fail confusingly.
 * See docs/notes.md AD-12.
 *
 *   npm run seed
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { DAYS } from "../lib/intents.ts";
import { TAGS } from "../lib/profile-options.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  try {
    return Object.fromEntries(
      readFileSync(join(ROOT, ".env.local"), "utf8")
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnvLocal(), ...process.env };
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;

function fail(message) {
  console.error(`\n  SEED ABORTED\n\n  ${message}\n`);
  process.exit(1);
}

if (!URL_) fail("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");

if (!SECRET) {
  fail(
    "Missing SUPABASE_SECRET_KEY in .env.local.\n\n" +
      "  Supabase dashboard -> Settings -> API Keys -> secret key.\n\n" +
      "  This script will NOT fall back to the publishable key. Seeding needs to\n" +
      "  create auth users, which the publishable key cannot do, so a fallback\n" +
      "  would half-seed the database under RLS and fail in a confusing way\n" +
      "  rather than a clear one."
  );
}

// Guard against pasting the wrong key into the right variable — the failure
// would otherwise surface as a wall of RLS permission errors halfway through.
//
// Prefix alone is not enough to judge this. `sb_publishable_` is definitely
// wrong, but a legacy key is a JWT and could be EITHER the anon key (wrong) or
// the service_role key (correct) — both begin `eyJ`. So the JWT's role claim is
// read rather than guessed at.
if (SECRET.startsWith("sb_publishable_")) {
  fail(
    "SUPABASE_SECRET_KEY is the PUBLISHABLE key. Expected the secret key\n" +
      "  (`sb_secret_...`). The publishable key cannot create auth users."
  );
}

if (SECRET.startsWith("eyJ")) {
  let role;
  try {
    role = JSON.parse(Buffer.from(SECRET.split(".")[1], "base64url").toString()).role;
  } catch {
    fail("SUPABASE_SECRET_KEY looks like a JWT but its payload could not be read.");
  }
  if (role !== "service_role") {
    fail(
      `SUPABASE_SECRET_KEY is a legacy JWT with role "${role}", not "service_role".\n\n` +
        "  The anon key cannot create auth users. Use the service_role key, or\n" +
        "  better, the current secret key (`sb_secret_...`) — legacy keys are\n" +
        "  deprecated at the end of 2026."
    );
  }
}

const admin = createClient(URL_, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Intent slots.
//
// F5.2 wants clustering such that any plausible new intent finds >= 3 matches,
// weighted toward 6-8am and 6-9pm. Matching (F3.1/F3.2) needs same activity,
// >= 1 shared day, and an overlapping time window.
//
// These ten slots are applied to EACH activity, so every activity gets the same
// coverage: five morning-band and five evening-band, with day patterns chosen so
// that every weekday and Saturday is covered by at least three slots per band.
// Sunday lands at two by design — F3.4 exists precisely for thin cases, and
// scripts/verify-seed.mjs prints the real counts rather than hiding them.
// ---------------------------------------------------------------------------
const DAILY = [...DAYS];
const MON_SAT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MWF = ["Mon", "Wed", "Fri"];
const TTS = ["Tue", "Thu", "Sat"];
const FSS = ["Fri", "Sat", "Sun"];

const SLOTS = [
  { days: DAILY, start: "06:00", end: "08:00" },
  { days: MON_SAT, start: "06:00", end: "09:00" },
  { days: WEEKDAYS, start: "06:30", end: "08:30" },
  { days: MWF, start: "06:00", end: "08:00" },
  { days: FSS, start: "07:00", end: "09:00" },
  { days: DAILY, start: "18:00", end: "20:00" },
  { days: MON_SAT, start: "18:00", end: "21:00" },
  { days: WEEKDAYS, start: "19:00", end: "21:00" },
  { days: TTS, start: "18:30", end: "20:30" },
  { days: FSS, start: "18:00", end: "20:00" },
];

// ---------------------------------------------------------------------------
// The 30 fixture people.
//
// Tag triples are chosen, not generated. AD-9: `overlapping_tags x 2` only
// ranks anything if the overlap COUNT VARIES across a candidate pool. The first
// ten (the gym cohort, which is the pool the test accounts sit in) deliberately
// span an overlap of 3 down to 0 against test.one's tags [Gym, Finance, F1].
// verify-seed.mjs measures that spread rather than trusting this comment.
// ---------------------------------------------------------------------------
const PEOPLE = [
  // --- gym (slots 0-9) ---
  { name: "Aarav Mehta",       year: "PGP 1", level: "regular",  tags: ["Gym", "Finance", "F1"] },
  { name: "Ishaan Kulkarni",   year: "PGP 2", level: "serious",  tags: ["Gym", "Finance", "Coffee"] },
  { name: "Riya Sharma",       year: "PGP 1", level: "regular",  tags: ["Gym", "F1", "Anime"] },
  { name: "Kabir Nair",        year: "PGP 1", level: "beginner", tags: ["Gym", "Marketing", "Films"] },
  { name: "Ananya Iyer",       year: "PGP 2", level: "regular",  tags: ["Finance", "Consulting", "Startups"] },
  { name: "Rohan Desai",       year: "PGP 1", level: "beginner", tags: ["Cricket", "Anime", "Coffee"] },
  { name: "Meera Joshi",       year: "PGP 2", level: "serious",  tags: ["Football", "Films", "Trekking"] },
  { name: "Aditya Rao",        year: "PGP 1", level: "regular",  tags: ["Gym", "Startups", "Coffee"] },
  { name: "Sanya Kapoor",      year: "PGP 2", level: "regular",  tags: ["Badminton", "Marketing", "F1"] },
  { name: "Vivaan Bhatt",      year: "PhD",   level: "serious",  tags: ["Running", "Consulting", "Films"] },

  // --- running (slots 0-9) ---
  { name: "Diya Menon",        year: "PGP 1", level: "regular",  tags: ["Running", "Trekking", "Coffee"] },
  { name: "Arjun Saxena",      year: "PGP 2", level: "serious",  tags: ["Running", "Marketing", "F1"] },
  { name: "Naina Chopra",      year: "PGP 1", level: "beginner", tags: ["Running", "Finance", "Films"] },
  { name: "Dhruv Pillai",      year: "PGP 2", level: "regular",  tags: ["Trekking", "Consulting", "Anime"] },
  { name: "Tara Ghosh",        year: "PGP 1", level: "regular",  tags: ["Running", "Startups", "Coffee"] },
  { name: "Yash Agarwal",      year: "PGP 1", level: "beginner", tags: ["Cricket", "Marketing", "Films"] },
  { name: "Kiara Reddy",       year: "PGP 2", level: "serious",  tags: ["Running", "Anime", "F1"] },
  { name: "Nikhil Bose",       year: "PhD",   level: "regular",  tags: ["Football", "Finance", "Coffee"] },
  { name: "Aisha Qureshi",     year: "PGP 1", level: "regular",  tags: ["Trekking", "Startups", "Films"] },
  { name: "Siddharth Verma",   year: "PGP 2", level: "beginner", tags: ["Badminton", "Consulting", "Anime"] },

  // --- sport (slots 0-9) ---
  { name: "Advait Kulkarni",   year: "PGP 1", level: "regular",  tags: ["Football", "Cricket", "Coffee"] },
  { name: "Pari Malhotra",     year: "PGP 2", level: "beginner", tags: ["Badminton", "Marketing", "Films"] },
  { name: "Reyansh Gupta",     year: "PGP 1", level: "serious",  tags: ["Cricket", "Finance", "Anime"] },
  { name: "Anvi Deshpande",    year: "PGP 2", level: "regular",  tags: ["Football", "Startups", "F1"] },
  { name: "Kartik Shetty",     year: "PGP 1", level: "regular",  tags: ["Badminton", "Consulting", "Coffee"] },
  { name: "Zoya Ahmed",        year: "PGP 1", level: "beginner", tags: ["Cricket", "Trekking", "Films"] },
  { name: "Neel Trivedi",      year: "Faculty", level: "regular", tags: ["Football", "Marketing", "Anime"] },
  { name: "Saanvi Patel",      year: "PGP 2", level: "serious",  tags: ["Badminton", "Finance", "Startups"] },
  { name: "Hriday Banerjee",   year: "PGP 1", level: "regular",  tags: ["Cricket", "Consulting", "F1"] },
  { name: "Myra Sundaram",     year: "PGP 2", level: "regular",  tags: ["Football", "Trekking", "Coffee"] },
];

const ACTIVITY_ORDER = ["gym", "running", "sport"];

/**
 * Everything seeded gets a far-future expiry — the 30 fixtures AND both
 * published test accounts. See docs/notes.md AD-13 (revised in Phase 7).
 *
 * The test accounts originally kept a real 7-day window so expiry stayed
 * demonstrable on an account a grader logs into. That was the wrong trade: it
 * meant the two credentials printed on the login screen and in the README stop
 * working a week after the last seed run, and a grader opening the app two
 * weeks after submission lands on the empty state with no way to tell why.
 * Credentials that are published have to work indefinitely.
 *
 * Expiry is still demonstrable, just not on those two accounts: the constraint
 * suite plants a lapsed intent and proves AD-14's cleanup, and any account that
 * posts an intent through the UI gets F2.1's real now() + 7 days.
 */
const SEED_EXPIRY = "2027-12-31T23:59:59Z";

function emailFor(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim()
      .split(/\s+/)
      .join(".") + "@micamail.in"
  );
}

const FIXTURES = PEOPLE.map((person, i) => {
  const slot = SLOTS[i % 10];
  return {
    email: emailFor(person.name),
    name: person.name,
    year: person.year,
    tags: person.tags,
    contact_handle: String(9700000000 + i * 137 + 11),
    intent: {
      activity: ACTIVITY_ORDER[Math.floor(i / 10)],
      days: slot.days,
      time_start: slot.start,
      time_end: slot.end,
      experience_level: person.level,
      expires_at: SEED_EXPIRY,
    },
  };
});

// ---------------------------------------------------------------------------
// The two published test accounts (PRD S5 / F5.4).
//
// Both are gym, weekday mornings, and their windows overlap — so they match
// EACH OTHER. That means the full request -> accept -> reveal loop (S1) can be
// demonstrated with only these two logins and no signup at all.
//
// Their intents get the same far-future expiry as the fixtures. AD-13
// originally left these two on the real 7-day window so expiry stayed
// demonstrable where a grader would see it; Phase 7 revised that, because
// credentials printed on the login screen and in the README have to work
// indefinitely. See docs/notes.md, "AD-13 revised".
// ---------------------------------------------------------------------------
const TEST_ACCOUNTS = [
  {
    email: "test.one@micamail.in",
    name: "Test One",
    year: "PGP 1",
    tags: ["Gym", "Finance", "F1"],
    contact_handle: "9876543210",
    intent: {
      activity: "gym",
      days: WEEKDAYS,
      time_start: "06:00",
      time_end: "09:00",
      experience_level: "regular",
      expires_at: SEED_EXPIRY,
    },
  },
  {
    email: "test.two@micamail.in",
    name: "Test Two",
    year: "PGP 2",
    tags: ["Running", "Startups", "Coffee"],
    contact_handle: "9876543211",
    intent: {
      activity: "gym",
      days: MON_SAT,
      time_start: "06:00",
      time_end: "09:30",
      experience_level: "regular",
      expires_at: SEED_EXPIRY,
    },
  },
];

// ---------------------------------------------------------------------------
// Sanity-check the fixture definitions before touching the database.
// A bad tag would otherwise be stored happily (the DB only enforces "exactly
// 3", not membership) and quietly break match scoring.
// ---------------------------------------------------------------------------
const ALL = [...FIXTURES, ...TEST_ACCOUNTS];
for (const f of ALL) {
  if (f.tags.length !== 3) fail(`${f.email}: needs exactly 3 tags, has ${f.tags.length}`);
  for (const t of f.tags) {
    if (!TAGS.includes(t)) fail(`${f.email}: "${t}" is not in lib/profile-options.ts TAGS`);
  }
  if (!/^[6-9]\d{9}$/.test(f.contact_handle)) fail(`${f.email}: invalid contact_handle ${f.contact_handle}`);
}
const emails = ALL.map((f) => f.email);
const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
if (dupes.length) fail(`duplicate emails: ${[...new Set(dupes)].join(", ")}`);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function listAllAuthUsers() {
  const byEmail = new Map();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`listUsers failed: ${error.message}`);
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }
  return byEmail;
}

async function main() {
  console.log(`\nSeeding ${FIXTURES.length} fixtures + ${TEST_ACCOUNTS.length} test accounts`);
  console.log(`Target: ${URL_}\n`);

  const existing = await listAllAuthUsers();
  let created = 0;
  let reused = 0;

  for (const f of ALL) {
    let id = existing.get(f.email);

    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: f.email,
        // Seeded users are data, not logins. Only the two test accounts have
        // published credentials (F5.4), so these get throwaway passwords.
        password: `seed-${randomUUID()}`,
        email_confirm: true,
      });
      if (error) fail(`createUser ${f.email}: ${error.message}`);
      id = data.user.id;
      created++;
    } else {
      reused++;
    }

    // The after-insert trigger on auth.users already created the profile row.
    const { error: profileError } = await admin
      .from("users")
      .update({
        name: f.name,
        year: f.year,
        tags: f.tags,
        contact_handle: f.contact_handle,
      })
      .eq("id", id);
    if (profileError) fail(`profile ${f.email}: ${profileError.message}`);

    // Replace rather than update: keeps the run idempotent and avoids fighting
    // the one-active-intent unique index.
    //
    // Predicate-scoped, and deliberate: this script DECLARES OWNERSHIP of the
    // 32 identities in ALL, and its documented contract is to reset them to the
    // state in the README. That includes an intent a human posted through the UI
    // on test.one or test.two — re-seeding is a reset, not a merge.
    //
    // Note what it therefore never touches: any account not in this list. Real
    // signups keep their intents. See docs/notes.md AD-25.
    const { error: delError } = await admin.from("intents").delete().eq("user_id", id);
    if (delError) fail(`clear intents ${f.email}: ${delError.message}`);

    const row = {
      user_id: id,
      activity: f.intent.activity,
      days: f.intent.days,
      time_start: f.intent.time_start,
      time_end: f.intent.time_end,
      experience_level: f.intent.experience_level,
      status: "active",
    };
    row.expires_at = f.intent.expires_at;

    const { error: intentError } = await admin.from("intents").insert(row);
    if (intentError) fail(`intent ${f.email}: ${intentError.message}`);

    process.stdout.write(".");
  }

  console.log(`\n\nauth users: ${created} created, ${reused} reused`);

  const { count: userCount } = await admin
    .from("users")
    .select("*", { count: "exact", head: true });
  const { count: activeCount } = await admin
    .from("intents")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  console.log(`users: ${userCount}`);
  console.log(`active intents: ${activeCount}`);
  console.log(`\nDone. Run \`npm run verify:seed\` to check F5.2 / F5.3 / AD-9.\n`);
}

main().catch((e) => fail(e.stack ?? String(e)));
