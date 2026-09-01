"use client";

import { ArrowRight, Lock, Smartphone } from "lucide-react";
import { useActionState } from "react";

import { saveProfileAction } from "@/app/(app)/profile-setup/actions";
import { Avatar } from "@/components/Avatar";
import { ChipGroup } from "@/components/ChipGroup";
import { FormError } from "@/components/FormError";
import { StickyActions } from "@/components/StickyActions";
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
 *
 * TWO DEPARTURES FROM THE STITCH SCREEN, both forced by what the data allows:
 *
 * Their header has an avatar with a camera badge. Photo upload is a PRD
 * non-goal and `avatar_url` is generated from the user id by a trigger, so the
 * avatar is shown but not offered for editing — with a line saying why, since
 * an avatar you cannot change is otherwise just a broken-looking button.
 *
 * Their "Program & Year" is a free-text field. Ours is a fixed list: `year` is
 * validated against YEARS by the Server Action, and a text box would invite
 * input the save would then reject.
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
    // pb clears the fixed action bar.
    <form action={formAction} className="space-y-6 pb-32">
      <FormError message={state.error} />

      <div className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.name} size={64} />
        <p className={HINT}>
          {/* F1.4 — generated from your account id, never uploaded. Saying so
              stops the avatar reading as an upload button that does nothing. */}
          Your picture is generated from your account. There&rsquo;s nothing to
          upload.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={submitted?.name ?? profile.name ?? ""}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="e.g. Aarav Mehta"
          className={INPUT}
        />
      </div>

      <ChipGroup
        name="year"
        heading="Program & year"
        options={YEARS}
        initial={
          (submitted?.year ?? profile.year)
            ? [submitted?.year ?? profile.year!]
            : []
        }
        single
        ariaLabel="Year"
      />

      <ChipGroup
        name="tags"
        heading="Your interests"
        /* Tags are a RANKING signal, never a filter (docs/notes.md AD-9).
           F3.1 builds the candidate pool from `activity`, and F3.2 hard-filters
           on a shared day and an overlapping time window. Tags appear only in
           the score, as `overlapping_tags x 2`. Without this line, choosing
           "Films" reads as a promise to find film people — and the app would
           silently never deliver on it. */
        description={
          <>
            These don&rsquo;t decide who you match with — your activity and
            times do. They set the order.
          </>
        }
        options={TAGS}
        initial={submitted?.tags ?? profile.tags ?? []}
        max={TAGS_REQUIRED}
        counter={(n) => `${n}/${TAGS_REQUIRED} selected`}
        ariaLabel="Interests"
      />

      <hr className="border-border" />

      <div>
        <label className={LABEL} htmlFor="contact_handle">
          Contact handle
        </label>
        <div className="relative">
          <Smartphone
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
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
            // Browser-side hints only. They catch a typo before submit; they
            // guarantee nothing, because anyone signed in can PATCH the column
            // directly (AD-5). The Server Action produces the message, and the
            // 0006 CHECK constraint is the actual guarantee.
            //
            // maxLength matches the pattern’s upper bound rather than the 13 of
            // a bare "+919876543210": someone typing "+91 98765 43210" would
            // otherwise be cut off mid-number. The separators are admitted here
            // and stripped by normalizeContactHandle() before storing.
            maxLength={17}
            pattern="[+0-9 ()-]{10,17}"
            title="A 10-digit Indian mobile, optionally with +91"
            className={`${INPUT} pl-11`}
          />
        </div>

        {/* The product's core promise, stated at the exact moment the user is
            asked to hand over a phone number. PRD N4. Stitch gives this a
            solid accent panel, which is right: it is the one reassurance that
            has to be read rather than skimmed. */}
        <div className="mt-3 flex items-start gap-3 rounded-lg bg-primary p-4 text-primary-foreground">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
          <p className="text-sm leading-5">
            Your contact handle stays hidden. It is revealed only when you and
            someone else both accept a request.
          </p>
        </div>
      </div>

      <StickyActions>
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : "Complete setup"}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2} />
        </SubmitButton>
      </StickyActions>
    </form>
  );
}
