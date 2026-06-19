"use client";

export default function NotFound() {
  return (
    <html>
      <body className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-ai-blue/20 to-ai-purple/10 flex items-center justify-center border border-ai-blue/20">
              <span className="text-3xl font-bold gradient-text">404</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Page not found</h1>
          <p className="text-xs text-text-muted mb-6">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-ai-blue text-black font-semibold text-xs hover:bg-ai-cyan transition-colors"
            >
              Go to Dashboard
            </a>
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-text-primary text-xs font-medium hover:bg-glass-heavy transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
