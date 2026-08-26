/**
 * role="alert" so screen readers announce a validation failure that appears
 * after submit, rather than leaving it silently on screen.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive-surface px-3 py-2.5 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
