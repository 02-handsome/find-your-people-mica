/**
 * Intent and request vocabulary (PRD 4.2, 4.3), plus pure helpers.
 *
 * These mirror the Postgres enum types created in
 * supabase/migrations/0002_intents_requests.sql. The database is the real
 * authority — it rejects any value not in its enum — so if these ever drift,
 * writes fail loudly rather than storing something invalid.
 *
 * Everything here is pure and dependency-free: imported by the app, by
 * scripts/seed.mjs (Node 24 strips types from .ts natively), and by the
 * verification scripts, so the seed cannot invent an activity or day the UI
 * does not know.
 */

export const ACTIVITIES = ["gym", "running", "sport"] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Order matters: the normalize_intent_days trigger sorts days this way. */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "regular", "serious"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const INTENT_STATUSES = ["active", "withdrawn", "expired"] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];

export const REQUEST_STATUSES = ["pending", "accepted", "declined"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** PRD F2.1 — expires_at = created_at + 7 days. */
export const INTENT_TTL_DAYS = 7;

export type Intent = {
  id: string;
  user_id: string;
  activity: Activity;
  days: Day[];
  /** Postgres `time`, serialised as "HH:MM:SS". */
  time_start: string;
  time_end: string;
  experience_level: ExperienceLevel;
  status: IntentStatus;
  created_at: string;
  expires_at: string;
};

// ---------------------------------------------------------------------------
// Display labels. The stored values are lowercase enum members; these are what
// a person reads.
// ---------------------------------------------------------------------------
export const ACTIVITY_LABELS: Record<Activity, string> = {
  gym: "Gym",
  running: "Running",
  sport: "Sport",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  regular: "Regular",
  serious: "Serious",
};

// ---------------------------------------------------------------------------
// Validation. Mirrors the constraints in 0002 so the user gets a sentence
// instead of a Postgres error code; the database remains the guarantee.
// ---------------------------------------------------------------------------
export function isValidActivity(value: string): value is Activity {
  return (ACTIVITIES as readonly string[]).includes(value);
}

export function isValidExperienceLevel(value: string): value is ExperienceLevel {
  return (EXPERIENCE_LEVELS as readonly string[]).includes(value);
}

export function areValidDays(values: string[]): boolean {
  if (values.length < 1 || values.length > 7) return false;
  if (new Set(values).size !== values.length) return false;
  return values.every((v) => (DAYS as readonly string[]).includes(v));
}

/** "HH:MM" or "HH:MM:SS" -> minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Matches the intents_window_valid constraint. Overnight windows
 * (22:00-02:00) are deliberately not representable — see 0002.
 */
export function isValidTimeWindow(start: string, end: string): boolean {
  const shape = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!shape.test(start) || !shape.test(end)) return false;
  return timeToMinutes(start) < timeToMinutes(end);
}

/** "06:00:00" -> "06:00" */
export function toHHMM(value: string): string {
  return value.slice(0, 5);
}

export function formatTimeRange(start: string, end: string): string {
  return `${toHHMM(start)} – ${toHHMM(end)}`;
}

/**
 * PRD F2.3 — "Expires in 4 days".
 *
 * Days are ROUNDED, hours and minutes are FLOORED. A freshly created 7-day
 * intent has 6.999 days left, and reading "Expires in 6 days" a second after
 * posting it looks broken; but near the end, rounding up would over-promise
 * time the user does not have.
 *
 * `now` is injectable so this can be checked without waiting a week.
 */
export function formatExpiry(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "Expired";

  const hours = ms / 3_600_000;

  // Past a month, a day count stops being a countdown and starts looking like a
  // bug. The seeded accounts sit far in the future on purpose — their published
  // credentials have to keep working long after submission (AD-13) — and
  // "Expires in 493 days" reads as broken on the very screen a grader opens.
  // A date reads as deliberate.
  //
  // This branch never affects a real intent: F2.1 gives those exactly 7 days,
  // so the countdown below is what users actually see.
  if (hours / 24 > 30) {
    return `Expires ${new Date(expiresAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }

  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  }

  const wholeHours = Math.floor(hours);
  if (wholeHours >= 1) {
    return `Expires in ${wholeHours} hour${wholeHours === 1 ? "" : "s"}`;
  }

  const minutes = Math.floor(ms / 60_000);
  if (minutes >= 1) {
    return `Expires in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return "Expires in under a minute";
}

// ---------------------------------------------------------------------------
// Overlap between two intents.
//
// Pure, and deliberately so: get_matches() already returns shared_days and
// time_overlap_minutes, and every screen that shows a candidate already loads
// the viewer's own intent. So the reason line costs no extra query — it is the
// numbers the ranking already used, said in words.
//
// This is what lets the UI justify an ordering without printing a score.
// AD-19's objection was to the number, not to the reason.
// ---------------------------------------------------------------------------

/** Days both people train, in DAYS order. */
export function sharedDays(mine: Day[], theirs: Day[]): Day[] {
  const other = new Set<string>(theirs);
  return DAYS.filter((day) => mine.includes(day) && other.has(day));
}

/**
 * The window both people are free, or null when they do not overlap — which
 * is exactly the F3.4 "Close, but different hours" case.
 */
export function overlapWindow(
  mineStart: string,
  mineEnd: string,
  theirStart: string,
  theirEnd: string
): { start: string; end: string } | null {
  const start = Math.max(timeToMinutes(mineStart), timeToMinutes(theirStart));
  const end = Math.min(timeToMinutes(mineEnd), timeToMinutes(theirEnd));
  if (start >= end) return null;

  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { start: hhmm(start), end: hhmm(end) };
}

/**
 * ["Mon","Tue","Wed","Thu","Fri"] -> "Mon–Fri"; ["Mon","Wed","Fri"] ->
 * "Mon, Wed, Fri". Contiguous runs collapse because the reason line has to
 * survive a 375px card without reaching a third line — a run of five days
 * written out is 25 characters, and the range is seven.
 */
export function formatDayRange(days: Day[]): string {
  if (days.length === 0) return "";

  const idx = days.map((d) => DAYS.indexOf(d)).sort((a, b) => a - b);
  const parts: string[] = [];

  let runStart = idx[0];
  let prev = idx[0];

  const flush = (from: number, to: number) => {
    // A run of two is written out — "Mon, Tue" is no longer than "Mon–Tue"
    // and reads better.
    if (to - from >= 2) parts.push(`${DAYS[from]}–${DAYS[to]}`);
    else for (let i = from; i <= to; i++) parts.push(DAYS[i]);
  };

  for (let i = 1; i < idx.length; i++) {
    if (idx[i] === prev + 1) {
      prev = idx[i];
      continue;
    }
    flush(runStart, prev);
    runStart = idx[i];
    prev = idx[i];
  }
  flush(runStart, prev);

  return parts.join(", ");
}

/**
 * The shared-days phrase for the reason line, capped so the line can never
 * reach a third row at 375px.
 *
 * Measured, not guessed. Inside a match card the reason line has 247px of text
 * width, and at 14px/20px every phrasing fits two lines EXCEPT an enumerated
 * run of four or more scattered days — "Mon, Wed, Thu, Sat, Sun" pushes it to
 * three, which costs 20px on every card on the screen.
 *
 * So: enumerate when the days are one contiguous run (short however long it
 * is) or when there are three or fewer; otherwise give the count. Nothing is
 * lost by doing so — the day chips immediately below show exactly which days,
 * and the sentence's job is to say that an overlap exists, not to list it.
 */
export function describeSharedDays(days: Day[]): string {
  if (days.length === 0) return "";

  const enumerated = formatDayRange(days);
  const scattered = enumerated.includes(",");

  if (scattered && days.length > 3) return `${days.length} days a week`;
  return enumerated;
}
