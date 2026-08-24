/**
 * role="alert" so screen readers announce a validation failure that appears
 * after submit, rather than leaving it silently on screen.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}
