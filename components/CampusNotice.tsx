import { Info } from "lucide-react";

import { CAMPUS_NAME } from "@/lib/campus";

/**
 * The tinted notice from the Stitch login screen.
 *
 * Stitch hardcodes "Stanford University". Here the domains come from
 * `public.allowed_email_domains()` — the same function the signup trigger
 * gates on — so this panel cannot claim something different from what signup
 * will actually accept (AD-5). If the list is ever empty the sentence still
 * reads correctly without it.
 *
 * Note this is NOT F1.2's rejection message. That string is specified verbatim
 * by the PRD and lives in the signup Server Action; this is the notice shown
 * before anyone types, so nobody reaches the rejection in the first place.
 */
export function CampusNotice({ domains }: { domains: string[] }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-notice-border bg-notice p-3 text-notice-foreground">
      <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      <p className="text-sm leading-5">
        Find Your People is currently only open to{" "}
        <strong className="font-semibold">{CAMPUS_NAME}</strong> students
        {domains.length > 0 ? (
          <>
            {" "}
            — use your{" "}
            <span className="font-semibold">
              {domains.map((d) => `@${d}`).join(" or ")}
            </span>{" "}
            address
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
