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
