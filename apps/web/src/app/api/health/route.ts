import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "smartcampus-web",
    },
    { status: 200 },
  );
}
