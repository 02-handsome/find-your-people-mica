/**
 * Demo accounts for PRD S5 and F5.4.
 *
 * These credentials are INTENTIONALLY public. S5 requires them in the README
 * and visible on the login screen so a grader can get in without setup. They
 * are throwaway accounts on a demo database with Row Level Security enabled —
 * signing in as one grants nothing beyond that account's own row.
 *
 * Do not add a real account here.
 */

export const TEST_ACCOUNTS = [
  { label: "Test account 1", email: "test.one@micamail.in", password: "FindYourPeople#2026" },
  { label: "Test account 2", email: "test.two@micamail.in", password: "FindYourPeople#2026" },
] as const;

/**
 * Which way round to run the demo, shown on the login screen.
 *
 * F3.3 returns only the top 3, so matching is NOT symmetric. Test One ranks 3rd
 * for test.two, but test.two does not make test.one's top 3 — three seeded users
 * score higher. Sending from test.one is therefore refused with
 * NOT_A_CURRENT_MATCH, which is F4.1 working correctly and looks exactly like a
 * bug to anyone who does not know that.
 *
 * Telling people the direction is cheaper than making the ranking symmetric,
 * and more honest than hiding an asymmetry that is a real property of top-N
 * matching.
 */
export const DEMO_START_ACCOUNT = "test.two@micamail.in";
