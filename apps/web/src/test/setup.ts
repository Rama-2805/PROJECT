import { vi } from "vitest";

// Mock window.matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock fetch to prevent ECONNREFUSED/EPERM to localhost:4000 in tests
const originalFetch = global.fetch;
global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = typeof url === "string" ? url : "url" in url ? url.url : url.toString();
  if (
    urlStr.includes("localhost:4000") ||
    urlStr.includes("127.0.0.1:4000") ||
    urlStr.includes("localhost:8000") ||
    urlStr.startsWith("/api/")
  ) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
      text: async () => JSON.stringify({ success: true, data: {} }),
    } as unknown as Response;
  }
  return originalFetch
    ? originalFetch(url, init)
    : ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      } as unknown as Response);
});
