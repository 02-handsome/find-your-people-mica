"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { BUTTON_PRIMARY } from "@/components/ui";

/**
 * Separate component because useFormStatus() only reports the status of a form
 * above it in the tree — it cannot read the status of a form rendered by the
 * same component.
 */
export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
