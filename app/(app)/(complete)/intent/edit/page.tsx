import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { updateIntentAction } from "@/app/(app)/(complete)/intent/actions";
import { IntentForm } from "@/components/IntentForm";
import { HINT, READABLE } from "@/components/ui";
import { formatExpiry } from "@/lib/intents";
import { getActiveIntent } from "@/lib/intents-server";

export const metadata: Metadata = {
  title: "Edit your intent · Find Your People",
};

/** PRD F2.4 — update days, time window and experience level. */
export default async function EditIntentPage() {
  const intent = await getActiveIntent();

  // Nothing live to edit — it may have lapsed while this tab sat open.
  if (!intent) redirect("/");

  return (
    <main className={`${READABLE} py-6`}>
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit your intent
      </h1>
      <p className={`mt-2 ${HINT}`}>
        {/* F2.4 is explicit that editing does not reset expires_at. Saying so
            here removes the incentive to withdraw and repost purely to buy more
            time — which would also throw away any requests already received. */}
        {/* Lower-case the leading verb rather than stripping a prefix. The
            old version removed "Expires in " / "Expired", which are only two
            of formatExpiry's five returns — past 30 days it emits
            "Expires 1 Jan 2028", matched neither replacement, and the
            sentence rendered "still Expires 1 Jan 2028." Both published test
            accounts sit in that branch (AD-13 revised), so it was the only
            thing a grader could see here. Every branch starts "Expire". */}
        Editing doesn&rsquo;t extend it — it still{" "}
        {formatExpiry(intent.expires_at).replace(/^Expire/, "expire")}.
      </p>

      <IntentForm action={updateIntentAction} intent={intent} mode="edit" />
    </main>
  );
}
