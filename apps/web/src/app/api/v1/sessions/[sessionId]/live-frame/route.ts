import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  try {
    const rawParams = await context.params;
    const sessionId = (rawParams?.sessionId || "").replace(/[^a-zA-Z0-9_\-]/g, "");
    if (!sessionId) {
      return new NextResponse("Invalid sessionId", { status: 400 });
    }

    // 1. Try local disk paths across standard workspace layouts
    const candidatePaths = [
      path.resolve(process.cwd(), "../ai-service/storage/enrollment", sessionId, "live_preview.jpg"),
      path.resolve(process.cwd(), "storage/enrollment", sessionId, "live_preview.jpg"),
      path.resolve(process.cwd(), "../../apps/ai-service/storage/enrollment", sessionId, "live_preview.jpg"),
      path.resolve(process.cwd(), "apps/ai-service/storage/enrollment", sessionId, "live_preview.jpg"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const fileBuffer = await fs.promises.readFile(p);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });
      }
    }

    // 2. Fallback to AI service storage proxy if running in a container without shared volume
    const aiBase =
      process.env.AI_SERVICE_URL ||
      process.env.NEXT_PUBLIC_AI_URL ||
      process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
      "http://127.0.0.1:8000";

    try {
      const res = await fetch(`${aiBase}/storage/enrollment/${sessionId}/live_preview.jpg`, {
        cache: "no-store",
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return new NextResponse(Buffer.from(arrayBuf), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    } catch {
      // transient network fallback error
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return new NextResponse(err?.message || "Internal error", { status: 500 });
  }
}
