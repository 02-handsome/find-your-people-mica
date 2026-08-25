import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createIntentAction } from "@/app/(app)/(complete)/intent/actions";
import { IntentForm } from "@/components/IntentForm";
import { HINT } from "@/components/ui";
import { INTENT_TTL_DAYS } from "@/lib/intents";
import { getActiveIntent } from "@/lib/intents-server";

export const metadata: Metadata = {
  title: "Post an intent · Find Your People",
};

/** Screen 3 (PRD section 7) — create. */
export default async function NewIntentPage() {
  // F2.2: "A user may hold only one active intent. If one exists, the create
  // action is replaced by a view of the existing intent." Home is that view.
  // Enforced here as well as by hiding the button, so typing the URL cannot
  // route around it.
  if (await getActiveIntent()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        What are you looking for?
      </h1>
      <p className={`mt-2 ${HINT}`}>
        One at a time. It runs for {INTENT_TTL_DAYS} days, then quietly expires
        — no need to remember to take it down.
      </p>

      <IntentForm action={createIntentAction} mode="create" />
    </main>
  );
}
