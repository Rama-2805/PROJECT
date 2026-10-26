import type { NextConfig } from "next";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://127.0.0.1:8000";

const NESTJS_API_URL =
  process.env.NESTJS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  compress: true,

  // Rewrites to proxy AI service storage images & backend API camera/video endpoints
  async rewrites() {
    return [
      // Camera stream & control proxied through authenticated NestJS API gateway
      {
        source: "/api/camera/:path*",
        destination: `${NESTJS_API_URL}/api/camera/:path*`,
      },
      // Video streaming (HTTP 206 Range) proxied through NestJS API backend
      {
        source: "/api/videos/:path*",
        destination: `${NESTJS_API_URL}/api/videos/:path*`,
      },
      // AI service storage (face crops, cluster previews, student photos)
      {
        source: "/storage/:path*",
        destination: `${AI_SERVICE_URL}/storage/:path*`,
      },
      // Restricted AI service endpoints (playground & health only - session/attendance control endpoints require internal service auth)
      {
        source: "/api/v1/health",
        destination: `${AI_SERVICE_URL}/api/v1/health`,
      },
      {
        source: "/api/v1/grounding/:path*",
        destination: `${AI_SERVICE_URL}/api/v1/grounding/:path*`,
      },
      // Proxy AI service behavior endpoints (live telemetry, session start/stop/status)
      {
        source: "/api/v1/behavior/:path*",
        destination: `${AI_SERVICE_URL}/api/v1/behavior/:path*`,
      },
      // Proxy AI service attendance session endpoints
      {
        source: "/api/v1/attendance/:path*",
        destination: `${AI_SERVICE_URL}/api/v1/attendance/:path*`,
      },
      // Proxy AI service session endpoints
      {
        source: "/api/v1/sessions/:path*",
        destination: `${AI_SERVICE_URL}/api/v1/sessions/:path*`,
      },
    ];
  },

  // HTTP headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

