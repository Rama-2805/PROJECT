import type { NextConfig } from "next";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

const NESTJS_API_URL =
  process.env.NESTJS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:4000";

const nextConfig: NextConfig = {

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  compress: true,

  // Rewrites to proxy AI service storage images & backend API camera/video endpoints
  async rewrites() {
    return [
      // Camera stream & frame proxied through NestJS API backend
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
      // AI service REST & WebSocket endpoints
      {
        source: "/api/v1/:path*",
        destination: `${AI_SERVICE_URL}/api/v1/:path*`,
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
        ],
      },
    ];
  },
};

export default nextConfig;

