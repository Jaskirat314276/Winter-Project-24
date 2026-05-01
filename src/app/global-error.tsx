"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
        <h2>Something broke</h2>
        <p style={{ color: "#666" }}>{error.message}</p>
        {error.digest && (
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#999" }}>
            ref: {error.digest}
          </p>
        )}
        <button onClick={reset} style={{ marginTop: 12 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
