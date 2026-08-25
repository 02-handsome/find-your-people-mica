#!/usr/bin/env node
/**
 * Verifies PRD F3 by INDEPENDENT REIMPLEMENTATION.
 *
 * The filtering and scoring rules are reimplemented below in JavaScript,
 * written from the PRD text rather than from the SQL, then compared against
 * what public.get_matches() actually returns for a real signed-in user.
 *
 * Reading the SQL and agreeing with it proves nothing — the same
 * misunderstanding produces the same code twice. Two independent readings of
 * the spec agreeing on rows, order AND scores is evidence. A transcription slip
 * in either one shows up as a mismatch.
 *
 *   npm run verify:matches
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { EMPTY_POOL_COPY, RELAXED_LABEL } from "../lib/matches.ts";

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
const PASSWORD = "FindYourPeople#2026";

if (!URL_ || !PUBLISHABLE || !SECRET) {
  console.error("\n  Need URL, publishable key and secret key in .env.local\n");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const failures = [];
let passed = 0;

function check(label, ok, detail) {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (ok) passed++;
  else failures.push(label);
}

// ---------------------------------------------------------------------------
// F3, reimplemented from docs/PRD.md. Deliberately NOT a translation of the SQL.
// ---------------------------------------------------------------------------
const toMinutes = (t) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

function expectedMatches(viewerUser, viewerIntent, users, intents, requests, now = new Date()) {
  const byId = new Map(users.map((u) => [u.id, u]));

  // F3.1 — candidate pool.
  const pool = intents.filter((c) => {
    if (c.status !== "active") return false;
    if (new Date(c.expires_at) <= now) return false;
    if (c.activity !== viewerIntent.activity) return false;
    if (c.user_id === viewerUser.id) return false;
    // "no existing pending or accepted request between the pair" — both ways.
    const openRequest = requests.some(
      (r) =>
        (r.status === "pending" || r.status === "accepted") &&
        ((r.from_user_id === viewerUser.id && r.to_user_id === c.user_id) ||
          (r.from_user_id === c.user_id && r.to_user_id === viewerUser.id))
    );
    return !openRequest;
  });

  const viewerTags = viewerUser.tags ?? [];

  return pool
    .map((c) => {
      const cu = byId.get(c.user_id);
      const sharedDays = c.days.filter((d) => viewerIntent.days.includes(d)).length;

      const overlapMinutes = Math.max(
        0,
        Math.min(toMinutes(c.time_end), toMinutes(viewerIntent.time_end)) -
          Math.max(toMinutes(c.time_start), toMinutes(viewerIntent.time_start))
      );

      const tagOverlap = (cu?.tags ?? []).filter((t) => viewerTags.includes(t)).length;
      const levelMatch = c.experience_level === viewerIntent.experience_level;

      // PRD section 5, verbatim:
      //   (shared_days × 3) + (level match ? 2 : 0)
      //   + (overlapping_tags × 2) + (time_overlap_minutes / 30)
      const score =
        sharedDays * 3 + (levelMatch ? 2 : 0) + tagOverlap * 2 + overlapMinutes / 30;

      return {
        intent_id: c.id,
        name: cu?.name,
        sharedDays,
        overlapMinutes,
        tagOverlap,
        levelMatch,
        score,
        relaxed: overlapMinutes === 0,
      };
    })
    // F3.2's day requirement. F3.4 relaxes only the TIME overlap, never this.
    .filter((c) => c.sharedDays >= 1)
    .sort(
      (a, b) =>
        Number(a.relaxed) - Number(b.relaxed) || // F3.4: real matches first
        b.score - a.score ||                     // F3.3: descending
        a.intent_id.localeCompare(b.intent_id)   // deterministic tiebreak
    )
    .slice(0, 3); // F3.3
}

async function signIn(email) {
  const client = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return { client, id: data.user.id };
}

function printBreakdown(rows) {
  console.log(
    `    ${"candidate".padEnd(20)}${"days".padStart(5)}${"×3".padStart(5)}${"lvl".padStart(5)}${"tags".padStart(6)}${"×2".padStart(5)}${"mins".padStart(6)}${"/30".padStart(7)}${"score".padStart(8)}  flag`
  );
  for (const r of rows) {
    console.log(
      `    ${String(r.name).padEnd(20)}` +
        `${String(r.sharedDays).padStart(5)}${String(r.sharedDays * 3).padStart(5)}` +
        `${(r.levelMatch ? "+2" : "0").padStart(5)}` +
        `${String(r.tagOverlap).padStart(6)}${String(r.tagOverlap * 2).padStart(5)}` +
        `${String(r.overlapMinutes).padStart(6)}${(r.overlapMinutes / 30).toFixed(2).padStart(7)}` +
        `${r.score.toFixed(2).padStart(8)}  ${r.relaxed ? "relaxed" : ""}`
    );
  }
}

async function main() {
  const [{ data: users }, { data: intents }, { data: requests }] = await Promise.all([
    admin.from("users").select("id, email, name, year, tags, contact_handle"),
    admin.from("intents").select("id, user_id, activity, days, time_start, time_end, experience_level, status, expires_at"),
    admin.from("requests").select("from_user_id, to_user_id, status"),
  ]);

  for (const email of ["test.one@micamail.in", "test.two@micamail.in"]) {
    console.log(`\n════ ${email} ════\n`);

    const viewerUser = users.find((u) => u.email === email);
    const viewerIntent = intents.find(
      (i) => i.user_id === viewerUser.id && i.status === "active" && new Date(i.expires_at) > new Date()
    );

    const { client } = await signIn(email);
    const { data: actual, error } = await client.rpc("get_matches");
    if (error) {
      check(`${email}: get_matches ran`, false, error.message);
      continue;
    }

    const expected = expectedMatches(viewerUser, viewerIntent, users, intents, requests);

    console.log("  get_matches() returned:");
    printBreakdown(
      actual.map((r) => ({
        name: r.name,
        sharedDays: r.shared_days,
        overlapMinutes: r.time_overlap_minutes,
        tagOverlap: (r.tags ?? []).filter((t) => (viewerUser.tags ?? []).includes(t)).length,
        levelMatch: r.experience_level === viewerIntent.experience_level,
        score: Number(r.score),
        relaxed: r.relaxed,
      }))
    );

    console.log("\n  independent JS reimplementation expected:");
    printBreakdown(expected);
    console.log("");

    check(
      `${email}: same number of rows`,
      actual.length === expected.length,
      `sql ${actual.length}, js ${expected.length}`
    );
    check(
      `${email}: same rows in the same order`,
      actual.map((r) => r.intent_id).join(",") === expected.map((r) => r.intent_id).join(","),
      actual.map((r) => r.name).join(" > ")
    );
    check(
      `${email}: identical scores`,
      actual.every((r, i) => Math.abs(Number(r.score) - (expected[i]?.score ?? -1)) < 1e-9),
      actual.map((r) => Number(r.score).toFixed(2)).join(", ")
    );
    check(`${email}: at most 3 (F3.3)`, actual.length <= 3, `${actual.length}`);

    // N4 — the guarantee this whole phase is built around.
    const keys = new Set(actual.flatMap((r) => Object.keys(r)));
    check(
      `${email}: NO contact_handle in the returned shape (N4)`,
      !keys.has("contact_handle"),
      `${keys.size} columns: ${[...keys].join(", ")}`
    );

    // And the underlying table is still shut.
    const { data: leak } = await client.from("users").select("id, contact_handle");
    check(
      `${email}: users table still self-only`,
      (leak ?? []).length === 1 && leak[0].id === viewerUser.id,
      `${(leak ?? []).length} row(s) visible`
    );

    // F3.4 — relaxed rows may only fill a gap, never displace a real match.
    const genuine = actual.filter((r) => !r.relaxed).length;
    const relaxedRows = actual.filter((r) => r.relaxed).length;
    check(
      `${email}: relaxed rows only when fewer than 3 genuine (F3.4)`,
      relaxedRows === 0 || genuine < 3,
      `${genuine} genuine, ${relaxedRows} relaxed`
    );
    check(
      `${email}: no relaxed row ranked above a genuine one`,
      actual.every((r, i) => !(r.relaxed && actual.slice(i + 1).some((x) => !x.relaxed))),
      "ordering respects relaxed-last"
    );
  }

  // =========================================================================
  console.log("\n════ F3.1 — an open request removes someone from the pool ════\n");

  const one = users.find((u) => u.email === "test.one@micamail.in");
  const { client: oneClient } = await signIn("test.one@micamail.in");
  const oneIntent = intents.find((i) => i.user_id === one.id && i.status === "active");

  const before = (await oneClient.rpc("get_matches")).data;
  const target = before[0];
  console.log(`  top match before: ${target.name}`);

  // Direction 1: viewer -> candidate.
  await admin.from("requests").insert({
    from_user_id: one.id, to_user_id: target.user_id, intent_id: oneIntent.id,
  });
  const afterOut = (await oneClient.rpc("get_matches")).data;
  check(
    "outgoing pending request removes them (A -> B)",
    !afterOut.some((r) => r.user_id === target.user_id),
    `${target.name} ${afterOut.some((r) => r.user_id === target.user_id) ? "still present" : "gone"}`
  );
  await admin.from("requests").delete().eq("from_user_id", one.id).eq("to_user_id", target.user_id);

  // Direction 2: candidate -> viewer. The unique index is directional, so only
  // the query's bidirectional check can catch this one.
  const targetIntent = intents.find((i) => i.user_id === target.user_id && i.status === "active");
  await admin.from("requests").insert({
    from_user_id: target.user_id, to_user_id: one.id, intent_id: targetIntent.id,
  });
  const afterIn = (await oneClient.rpc("get_matches")).data;
  check(
    "INCOMING pending request removes them too (B -> A)",
    !afterIn.some((r) => r.user_id === target.user_id),
    `${target.name} ${afterIn.some((r) => r.user_id === target.user_id) ? "still present" : "gone"}`
  );
  await admin.from("requests").delete().eq("from_user_id", target.user_id).eq("to_user_id", one.id);

  const restored = (await oneClient.rpc("get_matches")).data;
  check("pool restored after deleting the requests", restored.length === before.length,
    `${restored.length} rows`);

  // =========================================================================
  // F3.4 and F3.6 cannot be reached with the seeded data: the pool is dense
  // enough that every plausible intent finds 3 time-overlapping candidates,
  // which is exactly what F5.2 asks for. Both requirements would therefore
  // pass VACUOUSLY. These probes construct the conditions on purpose.
  // =========================================================================
  console.log("\n════ F3.4 — relaxation, forced ════\n");

  const probeEmail = "match.probe@micamail.in";
  const probePassword = "FindYourPeople#2026";

  async function makeProbe(intentRow) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const old = list.users.find((u) => u.email === probeEmail);
    if (old) await admin.auth.admin.deleteUser(old.id);

    const { data: made, error } = await admin.auth.admin.createUser({
      email: probeEmail, password: probePassword, email_confirm: true,
    });
    if (error) throw new Error(error.message);

    await admin.from("users").update({
      name: "Match Probe", year: "PGP 1",
      tags: ["Gym", "Coffee", "F1"], contact_handle: "9999900009",
    }).eq("id", made.user.id);

    await admin.from("intents").insert({ user_id: made.user.id, ...intentRow });

    const { client } = await signIn(probeEmail);
    return { id: made.user.id, client };
  }

  async function dropProbe() {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const u = list.users.find((x) => x.email === probeEmail);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }

  // 09:00-10:00 sits just past the seeded morning gym windows (which end at
  // 08:00 / 08:30 / 09:00) and long before the evening ones. It shares days
  // with many people but overlapping HOURS with almost nobody.
  {
    const probe = await makeProbe({
      activity: "gym", days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      time_start: "09:00", time_end: "10:00", experience_level: "regular",
    });

    const { data: rows, error: e } = await probe.client.rpc("get_matches");
    if (e) {
      check("F3.4 probe: get_matches ran", false, e.message);
    } else {
      printBreakdown(rows.map((r) => ({
        name: r.name, sharedDays: r.shared_days, overlapMinutes: r.time_overlap_minutes,
        tagOverlap: (r.tags ?? []).filter((t) => ["Gym","Coffee","F1"].includes(t)).length,
        levelMatch: r.experience_level === "regular",
        score: Number(r.score), relaxed: r.relaxed,
      })));
      console.log("");

      const genuine = rows.filter((r) => !r.relaxed);
      const relaxedRows = rows.filter((r) => r.relaxed);

      check("relaxation actually fires (at least one relaxed row)",
        relaxedRows.length > 0, `${genuine.length} genuine, ${relaxedRows.length} relaxed`);
      check("relaxed rows only fill the gap below 3 genuine (F3.4)",
        genuine.length < 3, `${genuine.length} genuine`);
      check("every relaxed row has zero overlapping minutes",
        relaxedRows.every((r) => r.time_overlap_minutes === 0), "all zero");
      check("every relaxed row still shares at least one day (F3.4 relaxes TIME only)",
        relaxedRows.every((r) => r.shared_days >= 1),
        relaxedRows.map((r) => `${r.name}:${r.shared_days}d`).join(", "));
      check("genuine rows all rank above relaxed ones",
        rows.every((r, i) => !(r.relaxed && rows.slice(i + 1).some((x) => !x.relaxed))),
        rows.map((r) => (r.relaxed ? "R" : "G")).join(""));
    }
    await dropProbe();
  }

  // =========================================================================
  console.log("\n════ F3.6 — genuinely empty pool, forced ════\n");

  {
    const probe = await makeProbe({
      activity: "sport", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      time_start: "06:00", time_end: "22:00", experience_level: "regular",
    });

    const { data: probeIntents } = await admin.from("intents").select("id").eq("user_id", probe.id);
    const probeIntentId = probeIntents[0].id;

    const sportUsers = intents
      .filter((i) => i.activity === "sport" && i.status === "active" && i.user_id !== probe.id)
      .map((i) => i.user_id);

    // Exclude every candidate via F3.1's open-request rule — the only way to
    // empty a pool this dense without touching the seeded data.
    for (const to of sportUsers) {
      await admin.from("requests").insert({
        from_user_id: probe.id, to_user_id: to, intent_id: probeIntentId,
      });
    }

    const { data: rows } = await probe.client.rpc("get_matches");
    check("pool is empty once every candidate has an open request",
      (rows ?? []).length === 0, `${(rows ?? []).length} rows, ${sportUsers.length} excluded`);
    console.log(`\n    the UI renders F3.6 here:\n      "${EMPTY_POOL_COPY}"`);

    await dropProbe(); // requests cascade on user delete
  }

  // =========================================================================
  // The two user-facing strings the PRD dictates word-for-word. Checked against
  // docs/PRD.md itself rather than against my memory of it — a paraphrase would
  // be invisible in every other test here.
  // =========================================================================
  console.log("\n════ F3.4 / F3.6 copy matches the PRD verbatim ════\n");

  const prd = readFileSync(join(ROOT, "docs", "PRD.md"), "utf8");
  const normalise = (s) => s.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

  check("F3.4 label is verbatim", normalise(prd).includes(normalise(RELAXED_LABEL)),
    `"${RELAXED_LABEL}"`);
  check("F3.6 empty-state copy is verbatim", normalise(prd).includes(normalise(EMPTY_POOL_COPY)),
    `"${EMPTY_POOL_COPY}"`);

  // =========================================================================
  console.log("\n════ Access ════\n");

  const anon = createClient(URL_, PUBLISHABLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: anonData, error: anonError } = await anon.rpc("get_matches");
  check("anonymous caller gets an error, not rows", Boolean(anonError) || (anonData ?? []).length === 0,
    anonError ? `${anonError.code} ${anonError.message.slice(0, 60)}` : "0 rows");

  // =========================================================================
  console.log("\n════ Summary ════\n");
  console.log(`  ${passed} checks passed`);
  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED:`);
    for (const f of failures) console.log(`    - ${f}`);
    process.exit(1);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
