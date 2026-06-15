"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8 rounded-3xl bg-glass-light border border-glass-border">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-error/20 to-error/10 flex items-center justify-center border border-error/30">
            <svg className="w-10 h-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong!</h1>
        <p className="text-xs text-text-muted mb-2">
          {error.message || "An unexpected error occurred. Our team has been notified."}
        </p>
        {error.digest && (
          <p className="text-[9px] text-text-dim mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-ai-blue text-white text-xs font-medium hover:bg-ai-cyan transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-text-primary text-xs font-medium hover:bg-glass-heavy transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}
