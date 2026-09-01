#!/usr/bin/env node
/**
 * Attempts every action the schema is supposed to forbid, as a real
 * authenticated user, and asserts each one fails.
 *
 * This is docs/notes.md AD-10 turned into a script. That entry exists because a
 * column-level GRANT silently did nothing and a privilege escalation succeeded
 * in production — a mistake reading the SQL did not catch and attempting the
 * attack did. So for every "a user must not be able to X", X gets attempted
 * here.
 *
 * Runs against two throwaway probe accounts which it creates and then deletes,
 * so the seeded demo data is never touched.
 *
 *   npm run verify:constraints
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...Object.fromEntries(
    readFileSync(join(ROOT, ".env.local"), "utf8")
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  ),
  ...process.env,
};

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;

if (!URL_ || !PUBLISHABLE || !SECRET) {
  console.error("\n  Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local\n");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = `probe-${randomUUID()}`;
const PROBE_A = "constraint.probe.a@micamail.in";
const PROBE_B = "constraint.probe.b@micamail.in";
const PROBE_C = "constraint.probe.c@micamail.in";

let passed = 0;
const failures = [];

/**
 * Asserts the operation did not take effect, and reports WHICH layer stopped it.
 *
 * Checking `error` alone is not enough, and getting this wrong produced a false
 * failure the first time this suite ran. PostgREST reports **no error** when an
 * UPDATE matches zero rows — and an UPDATE that RLS has filtered out matches
 * zero rows. So a policy doing its job looks identical to a successful write
 * unless the affected-row count is inspected. Every call therefore ends in
 * .select(), and "no error but nothing changed" counts as blocked.
 */
async function mustFail(label, run) {
  const { data, error } = await run();

  if (error) {
    passed++;
    const code = error.code ? `${error.code} ` : "";
    console.log(`  [BLOCKED] ${label}\n             ${code}${(error.message ?? "").split("\n")[0].slice(0, 92)}`);
    return;
  }

  if (Array.isArray(data) && data.length === 0) {
    passed++;
    console.log(`  [BLOCKED] ${label}\n             silently by RLS — 0 rows matched, no error raised`);
    return;
  }

  failures.push(label);
  console.log(`  [ALLOWED] ${label}   <-- SHOULD HAVE BEEN BLOCKED (${data?.length ?? "?"} row(s) affected)`);
}

/** Asserts the operation succeeded AND actually changed something. */
async function mustSucceed(label, run) {
  const { data, error } = await run();

  if (error) {
    failures.push(`${label} (should have succeeded: ${error.message})`);
    console.log(`  [BROKEN]  ${label} — ${error.message}`);
    return;
  }
  if (Array.isArray(data) && data.length === 0) {
    failures.push(`${label} (no error, but 0 rows affected — silently did nothing)`);
    console.log(`  [BROKEN]  ${label} — 0 rows affected`);
    return;
  }

  passed++;
  console.log(`  [OK]      ${label}`);
}

async function makeProbe(email) {
  // Remove any leftover from an interrupted previous run.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);

  await admin
    .from("users")
    .update({ name: "Probe", year: "PGP 1", tags: ["Gym", "Coffee", "F1"], contact_handle: "9999900001" })
    .eq("id", data.user.id);

  const client = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`signIn ${email}: ${signInError.message}`);

  return { id: data.user.id, client };
}

async function cleanup() {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const email of [PROBE_A, PROBE_B, PROBE_C]) {
    const u = list?.users?.find((x) => x.email === email);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  console.log("\nCreating two throwaway probe accounts…");
  const A = await makeProbe(PROBE_A);
  const B = await makeProbe(PROBE_B);

  const baseIntent = {
    activity: "gym",
    days: ["Mon", "Wed", "Fri"],
    time_start: "06:00",
    time_end: "08:00",
    experience_level: "regular",
  };

  console.log("\n════ users — contact handle format (0006) ════\n");

  // isValidContactHandle() in lib/profile-options.ts rejects all of these, but
  // that check lives in a Server Action and the publishable key ships in the
  // browser. 0001 grants UPDATE (..., contact_handle) to `authenticated`, so
  // without a CHECK constraint a signed-in user PATCHes straight past it.
  //
  // These fail until 0006 has been run in the SQL Editor, which is the point:
  // "did anyone remember to apply the migration" becomes a test result rather
  // than something to remember.
  for (const [why, value] of [
    ["free text", "not-a-phone-number-at-all"],
    ["too short", "98765"],
    ["too long", "98765432101"],
    ["leading 5, not an Indian mobile prefix", "5876543210"],
    ["wrong country code", "+449876543210"],
    ["letters mixed in", "98765abcde"],
    ["empty string", ""],
  ]) {
    await mustFail(`A cannot store a malformed contact handle - ${why}`, () =>
      A.client.from("users").update({ contact_handle: value }).eq("id", A.id).select()
    );
  }

  await mustSucceed("A can still store a plain 10-digit handle", () =>
    A.client.from("users").update({ contact_handle: "9876543210" }).eq("id", A.id).select()
  );

  await mustSucceed("A can still store one with a +91 prefix", () =>
    A.client.from("users").update({ contact_handle: "+919876543210" }).eq("id", A.id).select()
  );

  console.log("\n════ intents — inserts ════\n");

  await mustSucceed("A can post its own intent", () =>
    A.client.from("intents").insert({ user_id: A.id, ...baseIntent }).select()
  );

  await mustFail("A cannot hold a second active intent (one-active rule)", () =>
    A.client.from("intents").insert({ user_id: A.id, ...baseIntent }).select()
  );

  await mustFail("A cannot set expires_at on insert (would self-grant a long intent)", () =>
    A.client.from("intents").insert({
      user_id: A.id, ...baseIntent, expires_at: "2099-01-01T00:00:00Z",
    }).select()
  );

  await mustFail("A cannot set status on insert", () =>
    A.client.from("intents").insert({ user_id: A.id, ...baseIntent, status: "expired" }).select()
  );

  await mustFail("A cannot post an intent as B", () =>
    A.client.from("intents").insert({ user_id: B.id, ...baseIntent }).select()
  );

  await mustFail("invalid day value rejected", () =>
    B.client.from("intents").insert({ user_id: B.id, ...baseIntent, days: ["Mon", "Funday"] }).select()
  );

  await mustFail("empty day list rejected", () =>
    B.client.from("intents").insert({ user_id: B.id, ...baseIntent, days: [] }).select()
  );

  await mustFail("time_start after time_end rejected", () =>
    B.client.from("intents").insert({
      user_id: B.id, ...baseIntent, time_start: "20:00", time_end: "06:00",
    }).select()
  );

  console.log("\n════ intents — updates and status transitions ════\n");

  const { data: aIntents } = await A.client.from("intents").select("id, days").eq("user_id", A.id);
  const aIntentId = aIntents?.[0]?.id;

  await mustSucceed("A can edit its own days (F2.4)", () =>
    A.client.from("intents").update({ days: ["Tue", "Thu"] }).eq("id", aIntentId).select()
  );

  await mustFail("A cannot change activity (F2.4 does not list it)", () =>
    A.client.from("intents").update({ activity: "running" }).eq("id", aIntentId).select()
  );

  await mustFail("A cannot reset expires_at (F2.4: does not reset on edit)", () =>
    A.client.from("intents").update({ expires_at: "2099-01-01T00:00:00Z" }).eq("id", aIntentId).select()
  );

  await mustFail("A cannot mark a LIVE intent expired (lazy expiry may only record what is true)", () =>
    A.client.from("intents").update({ status: "expired" }).eq("id", aIntentId).select()
  );

  await mustSucceed("A can withdraw its intent (F2.5)", () =>
    A.client.from("intents").update({ status: "withdrawn" }).eq("id", aIntentId).select()
  );

  await mustFail("A cannot revive a withdrawn intent (withdrawn is terminal)", () =>
    A.client.from("intents").update({ status: "active" }).eq("id", aIntentId).select()
  );

  console.log("\n════ intents — isolation ════\n");

  await mustSucceed("B posts an intent for the request tests", () =>
    B.client.from("intents").insert({ user_id: B.id, ...baseIntent }).select()
  );

  await mustFail("A cannot read B's intents (no cross-user policy yet)", () =>
    A.client.from("intents").select("id").eq("user_id", B.id)
  );

  const anon = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await mustFail("anonymous cannot read intents", () => anon.from("intents").select("id").limit(1));
  await mustFail("anonymous cannot read requests", () => anon.from("requests").select("id").limit(1));

  console.log("\n════ requests ════\n");

  // A needs a live intent again to send from — its own was withdrawn above.
  //
  // Predicate-scoped delete, and safe: A is a throwaway probe this script
  // created moments ago and deletes at the end, so every intent matching
  // user_id = A.id is script-created by construction. Contrast the rule in
  // scripts/lib/tracked-writes.mjs — the same shape aimed at a REAL user would
  // not be safe, which is why verify-matches uses tracked writes instead.
  await admin.from("intents").delete().eq("user_id", A.id);
  await A.client.from("intents").insert({ user_id: A.id, ...baseIntent });
  const { data: aFresh } = await A.client.from("intents").select("id").eq("user_id", A.id);
  const aLiveIntent = aFresh?.[0]?.id;

  const { data: bIntents } = await B.client.from("intents").select("id").eq("user_id", B.id);
  const bIntentId = bIntents?.[0]?.id;

  await mustFail("A cannot request itself", () =>
    A.client.from("requests").insert({ from_user_id: A.id, to_user_id: A.id, intent_id: aLiveIntent }).select()
  );

  await mustFail("A cannot send a request attributed to B", () =>
    A.client.from("requests").insert({ from_user_id: B.id, to_user_id: A.id, intent_id: bIntentId }).select()
  );

  await mustFail("A cannot send using B's intent_id (must be the sender's own)", () =>
    A.client.from("requests").insert({ from_user_id: A.id, to_user_id: B.id, intent_id: bIntentId }).select()
  );

  await mustFail("A cannot create an already-accepted request (would self-reveal contact)", () =>
    A.client.from("requests").insert({
      from_user_id: A.id, to_user_id: B.id, intent_id: aLiveIntent, status: "accepted",
    }).select()
  );

  await mustSucceed("A sends a pending request to B", () =>
    A.client.from("requests").insert({ from_user_id: A.id, to_user_id: B.id, intent_id: aLiveIntent }).select()
  );

  await mustFail("A cannot send a second open request to B (one per ordered pair)", () =>
    A.client.from("requests").insert({ from_user_id: A.id, to_user_id: B.id, intent_id: aLiveIntent }).select()
  );

  const { data: reqs } = await A.client.from("requests").select("id").eq("from_user_id", A.id);
  const reqId = reqs?.[0]?.id;

  await mustFail("A (the sender) cannot accept its own request", () =>
    A.client.from("requests").update({ status: "accepted" }).eq("id", reqId).select()
  );

  await mustSucceed("B (the recipient) declines it (F4.4)", () =>
    B.client.from("requests").update({ status: "declined" }).eq("id", reqId).select()
  );

  await mustFail("B cannot revive a declined request (declined is terminal)", () =>
    B.client.from("requests").update({ status: "accepted" }).eq("id", reqId).select()
  );

  // =========================================================================
  // AD-14. This is the whole justification for migration 0003: without
  // create_intent(), a user whose intent lapsed still occupies the
  // one-active-intent unique slot and CANNOT post a replacement. Nothing else
  // in the system ever transitions active -> expired.
  // =========================================================================
  console.log("\n════ AD-14 — a lapsed intent must not block a new one ════\n");

  const C = await makeProbe(PROBE_C);
  const nowMs = Date.now();

  // Plant a lapsed row exactly as one occurs naturally: status still 'active',
  // because expiry is evaluated on read and nothing flips it. created_at has to
  // move back too, or intents_expiry_after_creation rejects the row.
  const { error: plantError } = await admin.from("intents").insert({
    user_id: C.id,
    activity: "gym",
    days: ["Mon", "Wed"],
    time_start: "06:00",
    time_end: "08:00",
    experience_level: "regular",
    status: "active",
    created_at: new Date(nowMs - 10 * 86_400_000).toISOString(),
    expires_at: new Date(nowMs - 3 * 86_400_000).toISOString(),
  });

  if (plantError) {
    failures.push(`could not plant a lapsed intent: ${plantError.message}`);
    console.log(`  [BROKEN]  planting a lapsed intent — ${plantError.message}`);
  } else {
    console.log("  [SETUP]   planted an intent: status='active', expires_at 3 days ago");

    // F2.6 — the read filter alone should already hide it.
    const { data: visible } = await C.client
      .from("intents")
      .select("id")
      .eq("user_id", C.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if ((visible ?? []).length === 0) {
      passed++;
      console.log("  [OK]      read filter hides it — home shows the empty state (F2.6)");
    } else {
      failures.push("lapsed intent still visible to the read filter");
      console.log("  [BROKEN]  lapsed intent still visible to the read filter");
    }

    // The operation that would fail on the unique index without 0003.
    const { error: rpcError } = await C.client.rpc("create_intent", {
      p_activity: "running",
      p_days: ["Tue", "Thu"],
      p_time_start: "18:00",
      p_time_end: "20:00",
      p_experience_level: "beginner",
    });

    if (rpcError) {
      failures.push(`create_intent over a lapsed intent failed: ${rpcError.message}`);
      console.log(`  [BROKEN]  posting a new intent — ${rpcError.message}`);
    } else {
      passed++;
      console.log("  [OK]      posting a new intent succeeds despite the lapsed row");
    }

    const { data: rows } = await admin
      .from("intents")
      .select("status, activity, expires_at")
      .eq("user_id", C.id)
      .order("created_at", { ascending: true });

    const statuses = (rows ?? []).map((r) => `${r.activity}:${r.status}`);
    const live = (rows ?? []).filter(
      (r) => r.status === "active" && new Date(r.expires_at) > new Date()
    );

    console.log(`             rows now: ${statuses.join(", ")}`);

    if (statuses.length === 2 && statuses[0] === "gym:expired" && live.length === 1) {
      passed++;
      console.log("  [OK]      lapsed row flipped to 'expired'; exactly one live intent");
    } else {
      failures.push("AD-14 cleanup did not leave exactly one live intent");
      console.log("  [BROKEN]  expected gym:expired + one live intent");
    }

    // And the rule still holds once there IS a live intent.
    await mustFail("posting again while one is live is still refused (F2.2)", () =>
      C.client.rpc("create_intent", {
        p_activity: "sport",
        p_days: ["Sat"],
        p_time_start: "09:00",
        p_time_end: "11:00",
        p_experience_level: "regular",
      })
    );
  }

  console.log("\n════ Summary ════\n");
  console.log(`  ${passed} checks behaved correctly`);
  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED:`);
    for (const f of failures) console.log(`    - ${f}`);
  }

  await cleanup();
  console.log("\n  Probe accounts deleted.\n");

  if (failures.length) process.exit(1);
}

main().catch(async (e) => {
  console.error("\n", e.message ?? e, "\n");
  await cleanup().catch(() => {});
  process.exit(1);
});
