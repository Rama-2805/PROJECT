import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("Protected Page & Route Guard Regression Tests", () => {
  function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
    const url = `http://localhost:3000${pathname}`;
    const req = new NextRequest(url);
    for (const [key, val] of Object.entries(cookies)) {
      req.cookies.set(key, val);
    }
    return req;
  }

  it("should redirect unauthenticated users visiting /dashboard to /login/admin", async () => {
    const req = createMockRequest("/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307); // NextResponse.redirect
    const redirectUrl = res.headers.get("location");
    expect(redirectUrl).toContain("/login/admin");
    expect(redirectUrl).toContain("redirect=%2Fdashboard");
  });

  it("should redirect unauthenticated users visiting /teacher to /login/teacher", async () => {
    const req = createMockRequest("/teacher/candidates");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const redirectUrl = res.headers.get("location");
    expect(redirectUrl).toContain("/login/teacher");
    expect(redirectUrl).toContain("redirect=%2Fteacher%2Fcandidates");
  });

  it("should redirect unauthenticated users visiting /student to /login", async () => {
    const req = createMockRequest("/student/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const redirectUrl = res.headers.get("location");
    expect(redirectUrl).toContain("/login");
    expect(redirectUrl).toContain("redirect=%2Fstudent%2Fdashboard");
  });

  it("should allow public routes like / without redirection", async () => {
    const req = createMockRequest("/");
    const res = await middleware(req);

    // Should return NextResponse.next() (no redirect location)
    expect(res.headers.get("location")).toBeNull();
  });

  it("should reject unauthenticated requests to /storage with 401 Unauthorized (SEC-10 & SEC-11)", async () => {
    const req = createMockRequest("/storage/enrollment/cmv3rthjz00pgop6ey2m7vd2w/clusters.json");
    const res = await middleware(req);

    expect(res.status).toBe(401);
  });

  it("should reject mock tokens and redirect to login", async () => {
    const req = createMockRequest("/dashboard", {
      smartcampus_access_token: "mock-token-admin-12345",
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login/admin");
  });

  it("should permit authenticated users with valid cryptographic JWT to access /dashboard", async () => {
    const encoder = new TextEncoder();
    const b64Url = (obj: unknown) =>
      Buffer.from(JSON.stringify(obj)).toString("base64url");
    const headB64 = b64Url({ alg: "HS256", typ: "JWT" });
    const payB64 = b64Url({
      sub: "user-123",
      email: "admin@vemanait.edu.in",
      roles: ["SUPER_ADMIN"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("sc-ai-access-secret-change-in-production"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${headB64}.${payB64}`));
    const sigB64 = Buffer.from(sig).toString("base64url");
    const validToken = `${headB64}.${payB64}.${sigB64}`;

    const req = createMockRequest("/dashboard", {
      smartcampus_access_token: validToken,
    });
    const res = await middleware(req);

    // Middleware returns NextResponse.next() -> no location header
    expect(res.headers.get("location")).toBeNull();
  });

  async function createSignedToken(roles: string[]) {
    const encoder = new TextEncoder();
    const b64Url = (obj: unknown) =>
      Buffer.from(JSON.stringify(obj)).toString("base64url");
    const headB64 = b64Url({ alg: "HS256", typ: "JWT" });
    const payB64 = b64Url({
      sub: "user-test",
      email: "test@smartcampus.edu",
      roles,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("sc-ai-access-secret-change-in-production"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${headB64}.${payB64}`));
    const sigB64 = Buffer.from(sig).toString("base64url");
    return `${headB64}.${payB64}.${sigB64}`;
  }

  it("should redirect authenticated student visiting /dashboard to /student/dashboard", async () => {
    const studentToken = await createSignedToken(["STUDENT"]);
    const req = createMockRequest("/dashboard", {
      smartcampus_access_token: studentToken,
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
  });

  it("should redirect authenticated student visiting /teacher/candidates to /student/dashboard", async () => {
    const studentToken = await createSignedToken(["STUDENT"]);
    const req = createMockRequest("/teacher/candidates", {
      smartcampus_access_token: studentToken,
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
  });

  it("should redirect authenticated teacher visiting /dashboard to /teacher/dashboard", async () => {
    const teacherToken = await createSignedToken(["TEACHER"]);
    const req = createMockRequest("/dashboard", {
      smartcampus_access_token: teacherToken,
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/teacher/dashboard");
  });

  it("should redirect authenticated student visiting /auth/login to /student/dashboard instead of /dashboard", async () => {
    const studentToken = await createSignedToken(["STUDENT"]);
    const req = createMockRequest("/auth/login", {
      smartcampus_access_token: studentToken,
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
  });
});
