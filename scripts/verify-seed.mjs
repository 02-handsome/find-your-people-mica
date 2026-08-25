#!/usr/bin/env node
/**
 * Verifies the seeded data against PRD F5.1 / F5.2 / F5.3 and docs/notes.md
 * AD-9, by measuring the live database rather than trusting the seed script's
 * construction argument.
 *
 * Prints the actual counts. A check that only says "passed" hides the thin
 * spots, and the thin spots are the interesting part.
 *
 *   npm run verify:seed
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { ACTIVITIES, DAYS } from "../lib/intents.ts";

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

if (!env.SUPABASE_SECRET_KEY) {
  console.error("\n  Missing SUPABASE_SECRET_KEY in .env.local\n");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const failures = [];
const warnings = [];

function check(label, ok, detail) {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

/** F3.2's hard filter: >= 1 shared day AND overlapping time window. */
function overlaps(intent, query) {
  const sharedDay = intent.days.some((d) => query.days.includes(d));
  const timeOverlap =
    intent.time_start < query.time_end && intent.time_end > query.time_start;
  return sharedDay && timeOverlap;
}

function sharedDayCount(a, b) {
  return a.filter((d) => b.includes(d)).length;
}

async function main() {
  const { data: users, error: uErr } = await admin
    .from("users")
    .select("id, email, name, year, tags, avatar_url, contact_handle");
  if (uErr) throw uErr;

  const { data: intents, error: iErr } = await admin
    .from("intents")
    .select("id, user_id, activity, days, time_start, time_end, experience_level, status, expires_at");
  if (iErr) throw iErr;

  const active = intents.filter(
    (i) => i.status === "active" && new Date(i.expires_at) > new Date()
  );
  const byUser = new Map(users.map((u) => [u.id, u]));

  // =========================================================================
  console.log("\n════ F5.1 — seeded users and intents ════\n");

  check("users >= 25", users.length >= 25, `${users.length} users`);
  check(
    "every user has exactly one live active intent",
    active.length === users.length &&
      new Set(active.map((i) => i.user_id)).size === active.length,
    `${active.length} live active intents across ${new Set(active.map((i) => i.user_id)).size} distinct users`
  );

  const incomplete = users.filter(
    (u) => !u.name || !u.year || u.tags?.length !== 3 || !u.avatar_url || !u.contact_handle
  );
  check("every profile complete (name, year, 3 tags, avatar, contact)",
    incomplete.length === 0,
    incomplete.length ? `incomplete: ${incomplete.map((u) => u.email).join(", ")}` : "all complete");

  console.log("\n  activity split:");
  for (const a of ACTIVITIES) {
    console.log(`    ${a.padEnd(8)} ${active.filter((i) => i.activity === a).length}`);
  }

  // =========================================================================
  console.log("\n════ F5.2 — candidates per plausible new intent ════");
  console.log("  Counts of live active intents matching activity + >=1 shared day");
  console.log("  + overlapping window. Target >= 3 (F3.4 relaxes the time rule below that).\n");

  const BANDS = [
    { label: "morning 06:00-08:00", time_start: "06:00:00", time_end: "08:00:00" },
    { label: "evening 18:00-21:00", time_start: "18:00:00", time_end: "21:00:00" },
  ];

  console.log(`  ${"activity / band".padEnd(30)}${DAYS.map((d) => d.padStart(5)).join("")}`);
  const thin = [];

  for (const activity of ACTIVITIES) {
    for (const band of BANDS) {
      const cells = DAYS.map((day) => {
        const q = { days: [day], time_start: band.time_start, time_end: band.time_end };
        const n = active.filter((i) => i.activity === activity && overlaps(i, q)).length;
        if (n < 3) thin.push(`${activity} / ${day} / ${band.label} = ${n}`);
        return n;
      });
      console.log(
        `  ${`${activity} / ${band.label}`.padEnd(30)}${cells.map((n) => String(n).padStart(5)).join("")}`
      );
    }
  }

  const weekdayAndSat = DAYS.filter((d) => d !== "Sun");
  const thinOnCoreDays = thin.filter((t) => weekdayAndSat.some((d) => t.includes(`/ ${d} /`)));

  console.log("");
  check(
    "every activity x band >= 3 on Mon-Sat",
    thinOnCoreDays.length === 0,
    thinOnCoreDays.length ? thinOnCoreDays.join("; ") : "all Mon-Sat cells >= 3"
  );

  const sundayThin = thin.filter((t) => t.includes("/ Sun /"));
  if (sundayThin.length) {
    warnings.push(`Sunday below 3: ${sundayThin.join("; ")}`);
    console.log(`  [note] Sunday is thinner by design — F3.4 relaxes time overlap there:`);
    for (const s of sundayThin) console.log(`         ${s}`);
  }

  // =========================================================================
  console.log("\n════ F5.3 — overlap with each test account's intent ════");
  console.log("  Target >= 5 seeded intents overlapping each test account.\n");

  for (const email of ["test.one@micamail.in", "test.two@micamail.in"]) {
    const user = users.find((u) => u.email === email);
    if (!user) { check(`${email} exists`, false); continue; }
    const own = active.find((i) => i.user_id === user.id);
    if (!own) { check(`${email} has an active intent`, false); continue; }

    const matches = active.filter(
      (i) => i.user_id !== user.id && i.activity === own.activity && overlaps(i, own)
    );

    console.log(
      `  ${email}\n    intent: ${own.activity} ${own.days.join("/")} ${own.time_start.slice(0, 5)}-${own.time_end.slice(0, 5)} (${own.experience_level})`
    );
    console.log(`    overlapping candidates: ${matches.length}`);
    check(`  ${email} has >= 5 overlapping candidates`, matches.length >= 5, `${matches.length}`);
  }

  // =========================================================================
  console.log("\n════ AD-9 — does overlapping_tags actually vary? ════");
  console.log("  F3 scores +2 per shared tag. If every candidate shares the same");
  console.log("  number, the term shifts all scores equally and ranks nothing.\n");

  const t1 = users.find((u) => u.email === "test.one@micamail.in");
  const t1Intent = t1 && active.find((i) => i.user_id === t1.id);

  if (t1 && t1Intent) {
    const pool = active
      .filter((i) => i.user_id !== t1.id && i.activity === t1Intent.activity && overlaps(i, t1Intent))
      .map((i) => {
        const u = byUser.get(i.user_id);
        return {
          name: u.name,
          tags: u.tags,
          tagOverlap: u.tags.filter((t) => t1.tags.includes(t)).length,
          sharedDays: sharedDayCount(i.days, t1Intent.days),
          levelMatch: i.experience_level === t1Intent.experience_level,
        };
      })
      .sort((a, b) => b.tagOverlap - a.tagOverlap);

    console.log(`  viewer: ${t1.name} — tags [${t1.tags.join(", ")}]\n`);
    console.log(`  ${"candidate".padEnd(20)}${"tags".padEnd(42)}${"shared".padStart(7)}${"days".padStart(6)}${"lvl".padStart(5)}`);
    for (const c of pool) {
      console.log(
        `  ${c.name.padEnd(20)}${`[${c.tags.join(", ")}]`.padEnd(42)}${String(c.tagOverlap).padStart(7)}${String(c.sharedDays).padStart(6)}${(c.levelMatch ? "y" : "n").padStart(5)}`
      );
    }

    const counts = pool.map((c) => c.tagOverlap);
    const distribution = {};
    for (const n of counts) distribution[n] = (distribution[n] ?? 0) + 1;

    console.log(`\n  overlap distribution: ${JSON.stringify(distribution)}`);
    console.log(`  range: ${Math.min(...counts)} to ${Math.max(...counts)} shared tags`);
    check(
      "overlapping_tags varies across the pool (not constant)",
      new Set(counts).size > 1,
      `${new Set(counts).size} distinct values across ${counts.length} candidates`
    );
  } else {
    check("test.one exists with an active intent", false);
  }

  // =========================================================================
  console.log("\n════ Summary ════\n");
  if (warnings.length) {
    console.log("  notes:");
    for (const w of warnings) console.log(`    - ${w}`);
    console.log("");
  }
  if (failures.length) {
    console.log(`  ${failures.length} FAILED:`);
    for (const f of failures) console.log(`    - ${f}`);
    console.log("");
    process.exit(1);
  }
  console.log("  All checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
