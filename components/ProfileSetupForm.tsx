"use client";

import { useActionState } from "react";

import { saveProfileAction } from "@/app/(app)/profile-setup/actions";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { TagPicker } from "@/components/TagPicker";
import { YearPicker } from "@/components/YearPicker";
import { HINT, INPUT, LABEL } from "@/components/ui";
import { TAGS_REQUIRED, type Profile } from "@/lib/profile-options";

/**
 * Screen 2 (PRD section 7): name, year, tag picker (3), contact handle.
 *
 * Nothing the user typed is lost when server validation rejects one field.
 * React 19 resets uncontrolled fields after a form action completes, so the
 * text inputs read `state.values` (echoed back by the action) before falling
 * back to the stored profile, and the two pickers hold their own state.
 */
export function ProfileSetupForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(saveProfileAction, {
    error: null,
  });

  const submitted = state.values;

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <FormError message={state.error} />

      <div>
        <label className={LABEL} htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={submitted?.name ?? profile.name ?? ""}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="As people would know you"
          className={INPUT}
        />
      </div>

      <div>
        <span className={LABEL}>Year</span>
        <YearPicker initial={submitted?.year ?? profile.year ?? ""} />
      </div>

      <div>
        <span className={LABEL}>
          Pick {TAGS_REQUIRED} things you&rsquo;re into
        </span>
        <TagPicker initial={submitted?.tags ?? profile.tags ?? []} />
      </div>

      <div>
        <label className={LABEL} htmlFor="contact_handle">
          Phone or WhatsApp number
        </label>
        <input
          id="contact_handle"
          name="contact_handle"
          type="tel"
          required
          defaultValue={
            submitted?.contactHandle ?? profile.contact_handle ?? ""
          }
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          className={INPUT}
        />
        <p className={`mt-1.5 ${HINT}`}>
          {/* The product's core promise, stated at the exact moment the user is
              asked to hand over a phone number. PRD N4. */}
          Hidden until you and someone else both accept a request.
        </p>
      </div>

      <SubmitButton pendingLabel="Saving…">Save and continue</SubmitButton>
    </form>
  );
}
