"use client";

import { useActionState } from "react";

import { saveProfileAction } from "@/app/(app)/profile-setup/actions";
import { ChipGroup } from "@/components/ChipGroup";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { HINT, INPUT, LABEL } from "@/components/ui";
import {
  TAGS,
  TAGS_REQUIRED,
  YEARS,
  type Profile,
} from "@/lib/profile-options";

/**
 * Screen 2 (PRD section 7): name, year, tag picker (3), contact handle.
 *
 * Nothing the user typed is lost when server validation rejects one field.
 * React 19 resets uncontrolled fields after a form action completes, so the
 * text inputs read `state.values` (echoed back by the action) before falling
 * back to the stored profile, and the chip groups hold their own state.
 */
export function ProfileSetupForm({
  profile,
  editing = false,
}: {
  profile: Profile;
  editing?: boolean;
}) {
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
        <ChipGroup
          name="year"
          options={YEARS}
          initial={
            (submitted?.year ?? profile.year) ? [submitted?.year ?? profile.year!] : []
          }
          single
          ariaLabel="Year"
        />
      </div>

      <div>
        <span className={LABEL}>
          Pick {TAGS_REQUIRED} things you&rsquo;re into
        </span>
        <ChipGroup
          name="tags"
          options={TAGS}
          initial={submitted?.tags ?? profile.tags ?? []}
          max={TAGS_REQUIRED}
          counter={(n) => `${n} of ${TAGS_REQUIRED} chosen`}
          ariaLabel="Interests"
        />
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

      <SubmitButton pendingLabel="Saving…">
        {editing ? "Save changes" : "Save and continue"}
      </SubmitButton>
    </form>
  );
}
