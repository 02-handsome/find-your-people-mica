#!/usr/bin/env node
/**
 * PRD N4, proved by attempted violation.
 *
 *   "contact_handle is never returned by any API call unless a request between
 *    the two users has status = accepted."
 *
 * The PRD calls this the one security requirement that matters. So rather than
 * asserting it, this script tries to obtain another user's contact_handle in
 * every reachable state — no request, pending, declined, third-party accepted,
 * after an OQ-1 auto-decline — and checks that exactly one of them succeeds.
 *
 * Runs on three throwaway probe accounts, created and deleted here. Seeded data
 * is never touched.
 *
 *   npm run verify:reveal
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
  console.error("\n  Need URL, publishable key and secret key in .env.local\n");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = `reveal-${randomUUID()}`;
const EMAILS = {
  A: "reveal.probe.a@micamail.in",
  B: "reveal.probe.b@micamail.in",
  C: "reveal.probe.c@micamail.in",
};

const failures = [];
let passed = 0;

function check(label, ok, detail) {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? `\n           ${detail}` : ""}`);
  if (ok) passed++;
  else failures.push(label);
}

/** Every contact_handle this signed-in client can see, by any route. */
async function handlesVisibleTo(actor) {
  const { data: conns } = await actor.client.rpc("get_connections");
  const viaConnections = (conns ?? []).map((c) => c.contact_handle);

  // The other two cross-user reads must never carry one at all.
  const { data: matches } = await actor.client.rpc("get_matches");
  const { data: incoming } = await actor.client.rpc("get_incoming_requests");
  const strayKeys = [
    ...new Set([
      ...(matches ?? []).flatMap((r) => Object.keys(r)),
      ...(incoming ?? []).flatMap((r) => Object.keys(r)),
    ]),
  ].filter((k) => k === "contact_handle");

  // And the table itself.
  const { data: rows } = await actor.client.from("users").select("id, contact_handle");
  const viaTable = (rows ?? []).filter((r) => r.id !== actor.id).map((r) => r.contact_handle);

  return { viaConnections, viaTable, strayKeys };
}

/** Can `actor` see `subject`'s handle by ANY route? */
async function canSee(actor, subject) {
  const { viaConnections, viaTable, strayKeys } = await handlesVisibleTo(actor);
  return {
    seen:
      viaConnections.includes(subject.handle) ||
      viaTable.includes(subject.handle) ||
      strayKeys.length > 0,
    detail:
      `connections=[${viaConnections.join(",") || "-"}] ` +
      `table=[${viaTable.join(",") || "-"}] strayKeys=[${strayKeys.join(",") || "-"}]`,
  };
}

async function makeProbe(key, handle) {
  const email = EMAILS[key];
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
  const old = list.users.find((u) => u.email === email);
  if (old) await admin.auth.admin.deleteUser(old.id);

  const { data: made, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (error) throw new Error(`${email}: ${error.message}`);

  await admin.from("users").update({
    name: `Probe ${key}`, year: "PGP 1",
    tags: ["Gym", "Finance", "F1"], contact_handle: handle,
  }).eq("id", made.user.id);

  // Identical maximal intents, so the three probes are guaranteed to be each
  // other's top matches — send_request only accepts someone currently in the
  // caller's get_matches(), and the seeded pool is 30 strong.
  await admin.from("intents").insert({
    user_id: made.user.id, activity: "gym",
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    time_start: "06:00", time_end: "22:00", experience_level: "regular",
  });

  const client = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`${email}: ${signInError.message}`);

  return { key, id: made.user.id, client, handle };
}

async function dropProbes() {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
  for (const email of Object.values(EMAILS)) {
    const u = list.users.find((x) => x.email === email);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  console.log("\nCreating three probe accounts…");
  const A = await makeProbe("A", "9990000001");
  const B = await makeProbe("B", "9990000002");
  const C = await makeProbe("C", "9990000003");
  console.log(`  A=${A.handle}  B=${B.handle}  C=${C.handle}\n`);

  // ── 1. no request ────────────────────────────────────────────────────────
  console.log("════ state: NO REQUEST between A and B ════\n");
  let r = await canSee(A, B);
  check("A cannot see B's handle with no request", !r.seen, r.detail);
  r = await canSee(B, A);
  check("B cannot see A's handle with no request", !r.seen, r.detail);

  // ── 2. pending ───────────────────────────────────────────────────────────
  console.log("\n════ state: PENDING  A -> B ════\n");
  const { error: sendErr } = await A.client.rpc("send_request", { p_to_user_id: B.id });
  check("A can send a request to B (F4.1)", !sendErr, sendErr?.message ?? "sent");

  r = await canSee(A, B);
  check("PENDING: sender A still cannot see B's handle", !r.seen, r.detail);
  r = await canSee(B, A);
  check("PENDING: recipient B still cannot see A's handle", !r.seen, r.detail);

  const { data: bIncoming } = await B.client.rpc("get_incoming_requests");
  check("B sees the request on their home feed (F4.3)",
    (bIncoming ?? []).length === 1 && bIncoming[0].from_user_id === A.id,
    `${(bIncoming ?? []).length} incoming, from ${bIncoming?.[0]?.name}`);
  check("incoming request carries NO contact_handle (F4.3)",
    !Object.keys(bIncoming?.[0] ?? {}).includes("contact_handle"),
    `keys: ${Object.keys(bIncoming?.[0] ?? {}).join(", ")}`);

  // ── 3. declined ──────────────────────────────────────────────────────────
  console.log("\n════ state: DECLINED  A -> B ════\n");
  await B.client.from("requests").update({ status: "declined" })
    .eq("from_user_id", A.id).eq("to_user_id", B.id);

  r = await canSee(A, B);
  check("DECLINED: A cannot see B's handle", !r.seen, r.detail);
  r = await canSee(B, A);
  check("DECLINED: B cannot see A's handle", !r.seen, r.detail);

  const { data: bIncoming2 } = await B.client.rpc("get_incoming_requests");
  check("declined request leaves B's feed (F4.6)", (bIncoming2 ?? []).length === 0,
    `${(bIncoming2 ?? []).length} incoming`);

  const { data: aMatches } = await A.client.rpc("get_matches");
  check("declined pair becomes eligible again — B reappears in A's matches (F4.6)",
    (aMatches ?? []).some((m) => m.user_id === B.id),
    "the card returns to neutral");

  // ── 4. accepted ──────────────────────────────────────────────────────────
  console.log("\n════ state: ACCEPTED  A -> C ════\n");
  await A.client.rpc("send_request", { p_to_user_id: C.id });
  await C.client.from("requests").update({ status: "accepted" })
    .eq("from_user_id", A.id).eq("to_user_id", C.id);

  r = await canSee(A, C);
  check("ACCEPTED: A CAN see C's handle (F4.5)", r.seen, r.detail);
  r = await canSee(C, A);
  check("ACCEPTED: C CAN see A's handle — reveal is mutual (F4.5)", r.seen, r.detail);

  // ── 5. third party ───────────────────────────────────────────────────────
  console.log("\n════ state: THIRD PARTY — B is not in the A/C connection ════\n");
  r = await canSee(B, A);
  check("B cannot see A's handle", !r.seen, r.detail);
  r = await canSee(B, C);
  check("B cannot see C's handle", !r.seen, r.detail);

  // ── 6. OQ-1 auto-decline ─────────────────────────────────────────────────
  console.log("\n════ state: OQ-1 — sender withdraws their intent ════\n");
  const { error: bSendErr } = await B.client.rpc("send_request", { p_to_user_id: C.id });
  check("B sends a request to C", !bSendErr, bSendErr?.message ?? "sent");

  const { data: cBefore } = await C.client.rpc("get_incoming_requests");
  check("C sees B's request before the withdrawal", (cBefore ?? []).length === 1,
    `${(cBefore ?? []).length} incoming`);

  const { data: declinedCount } = await B.client.rpc("withdraw_intent");
  check("withdraw_intent auto-declined exactly 1 request (OQ-1)", declinedCount === 1,
    `returned ${declinedCount}`);

  const { data: cAfter } = await C.client.rpc("get_incoming_requests");
  check("the request left C's feed, silently (F4.6)", (cAfter ?? []).length === 0,
    `${(cAfter ?? []).length} incoming`);

  r = await canSee(B, C);
  check("OQ-1: no contact revealed by the auto-decline", !r.seen, r.detail);

  const { data: bIntents } = await admin.from("intents").select("status").eq("user_id", B.id);
  check("B's intent is withdrawn, not deleted (F2.5)",
    bIntents?.[0]?.status === "withdrawn", `status = ${bIntents?.[0]?.status}`);

  // OQ-1's other half: incoming requests are NOT auto-declined.
  const { data: aReqToB } = await admin.from("requests")
    .select("status").eq("from_user_id", A.id).eq("to_user_id", B.id);
  check("incoming requests to the withdrawer are left alone (OQ-1)",
    aReqToB?.[0]?.status === "declined",
    `A->B is still '${aReqToB?.[0]?.status}' — declined by B earlier, not by the withdrawal`);

  // ── 7. misc guards ───────────────────────────────────────────────────────
  console.log("\n════ guards ════\n");

  const { error: selfErr } = await A.client.rpc("send_request", { p_to_user_id: A.id });
  check("cannot request yourself", Boolean(selfErr), selfErr?.message?.slice(0, 70));

  // Pick someone on a DIFFERENT activity. F3.1 filters the pool on activity, so
  // a running user can never appear in a gym viewer's matches — unlike a seeded
  // gym user, who may legitimately rank in the top 3 and would make this test
  // fail for the wrong reason.
  const { data: stranger } = await admin.from("users")
    .select("id, name").eq("email", "diya.menon@micamail.in").single();

  const { data: aPool } = await A.client.rpc("get_matches");
  check("the stranger is genuinely outside A's matches (test precondition)",
    !(aPool ?? []).some((m) => m.user_id === stranger.id),
    `A's pool: ${(aPool ?? []).map((m) => m.name).join(", ")}`);

  const { error: strangerErr } = await A.client.rpc("send_request", { p_to_user_id: stranger.id });
  check("cannot request someone outside your current matches (F4.1)",
    Boolean(strangerErr), strangerErr?.message?.slice(0, 70) ?? "REQUEST SUCCEEDED");

  const anon = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: anonErr } = await anon.rpc("get_connections");
  check("anonymous caller cannot read connections", Boolean(anonErr),
    anonErr?.message?.slice(0, 70));

  // ── summary ──────────────────────────────────────────────────────────────
  console.log("\n════ Summary ════\n");
  console.log(`  ${passed} checks passed`);
  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED:`);
    for (const f of failures) console.log(`    - ${f}`);
  }

  await dropProbes();
  console.log("\n  Probe accounts deleted.\n");

  if (failures.length) process.exit(1);
}

main().catch(async (e) => {
  console.error("\n", e.message ?? e, "\n");
  await dropProbes().catch(() => {});
  process.exit(1);
});
