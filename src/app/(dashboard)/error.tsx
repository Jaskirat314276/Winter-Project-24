"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="bg-white p-8 rounded-3xl shadow-soft border border-ink-100 max-w-md text-center flex flex-col gap-3">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-ink-900">
          Something went wrong loading this page
        </h2>
        <p className="text-sm text-ink-500">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-[11px] text-ink-400 font-mono">
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-2 bg-ink-900 text-white font-semibold rounded-xl text-sm py-3 hover:bg-ink-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
