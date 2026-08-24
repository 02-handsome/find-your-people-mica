"use client";

import { useActionState } from "react";

import { saveProfileAction } from "@/app/(app)/profile-setup/actions";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { TagPicker } from "@/components/TagPicker";
import { HINT, INPUT, LABEL } from "@/components/ui";
import { TAGS_REQUIRED, YEARS, type Profile } from "@/lib/profile-options";

/** Screen 2 (PRD section 7): name, year, tag picker (3), contact handle. */
export function ProfileSetupForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(saveProfileAction, {
    error: null,
  });

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
          defaultValue={profile.name ?? ""}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="As people would know you"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="year">
          Year
        </label>
        {/* Native <select> on purpose — it opens the OS picker on mobile, which
            beats any custom dropdown at 375px. */}
        <select
          id="year"
          name="year"
          required
          defaultValue={profile.year ?? ""}
          className={INPUT}
        >
          <option value="" disabled>
            Choose your year
          </option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={LABEL}>Pick {TAGS_REQUIRED} things you&rsquo;re into</span>
        <TagPicker initial={profile.tags ?? []} />
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
          defaultValue={profile.contact_handle ?? ""}
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
