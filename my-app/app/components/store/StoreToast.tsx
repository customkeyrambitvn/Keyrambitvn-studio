"use client";

type StoreToastProps = {
  message: string | null;
};

/** Lightweight status toast — fixed top, non-blocking. */
export function StoreToast({ message }: StoreToastProps) {
  if (!message) return null;

  return (
    <div className="store-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
