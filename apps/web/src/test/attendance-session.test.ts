import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/client";

describe("Live Attendance Session Integration & Manual Correction Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should process start session response and extract canonical sessionId", async () => {
    const mockSession = {
      id: "cmtpqbq7b016g8o6e1myew566",
      sessionId: "SESS-2026-CS301-01",
      classroomId: "room-023",
      subjectId: "CS-301",
      status: "ACTIVE",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockSession }),
    } as Response);

    const res = await api.post<typeof mockSession>("/attendance/sessions/start", {
      classroomId: "room-023",
      subjectId: "CS-301",
    });

    expect(res.success).toBe(true);
    const sid = res.data?.sessionId || res.data?.id;
    expect(sid).toBe("SESS-2026-CS301-01");
  });

  it("should parse NestJS GET /attendance/live payload with presentStudents and calculate attendance", async () => {
    const mockLivePayload = {
      sessionId: "SESS-2026-CS301-01",
      classroomId: "room-023",
      totalPresent: 45,
      totalStudents: 60,
      presentStudents: [
        {
          id: "CSE2026001",
          name: "Manish Bose",
          confidence: 0.98,
          status: "PRESENT",
        },
        {
          id: "CSE2026002",
          name: "Siddharth Saxena",
          confidence: 0.96,
          status: "PRESENT",
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockLivePayload }),
    } as Response);

    const res = await api.get<typeof mockLivePayload>("/attendance/live?sessionId=SESS-2026-CS301-01");
    expect(res.success).toBe(true);
    expect(res.data?.totalPresent).toBe(45);
    expect(res.data?.totalStudents).toBe(60);

    const rate = ((res.data!.totalPresent / res.data!.totalStudents) * 100).toFixed(1);
    expect(rate).toBe("75.0");
    expect(res.data?.presentStudents?.length).toBe(2);
    expect(res.data?.presentStudents?.[0].name).toBe("Manish Bose");
  });

  it("should send manual correction request to POST /attendance/records/:id/correct and receive updated record", async () => {
    let capturedUrl = "";
    let capturedBody = "";

    vi.spyOn(global, "fetch").mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body || "");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            record: {
              id: "rec-12345",
              statusEnum: "ABSENT",
              method: "MANUAL",
            },
          },
        }),
      } as Response;
    });

    const res = await api.post("/attendance/records/rec-12345/correct", {
      status: "ABSENT",
      reason: "Manual teacher review adjustment",
    });

    expect(capturedUrl).toContain("/attendance/records/rec-12345/correct");
    expect(JSON.parse(capturedBody)).toEqual({
      status: "ABSENT",
      reason: "Manual teacher review adjustment",
    });
    expect(res.success).toBe(true);
  });

  it("should handle failed correction safely without mutating client attendance records", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: "Access denied: Record belongs to another institution",
      }),
    } as Response);

    const initialRecords = [
      { id: "rec-01", studentId: "USN01", status: "PRESENT" },
    ];

    const res = await api.post("/attendance/records/rec-01/correct", {
      status: "ABSENT",
      reason: "Manual teacher review adjustment",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Access denied");

    // Verify UI handler logic does not update records on failure
    let records = initialRecords;
    if (res.success && res.data) {
      records = records.map((r) => (r.id === "rec-01" ? { ...r, status: "ABSENT" } : r));
    }
    expect(records[0].status).toBe("PRESENT"); // Status preserved
  });

  it("should accurately recalculate totalPresent and attendance rate across PRESENT, LATE, and ABSENT transitions", () => {
    const totalEnrolled = 60;
    const records = [
      { id: "1", studentId: "USN01", status: "PRESENT" },
      { id: "2", studentId: "USN02", status: "PRESENT" },
      { id: "3", studentId: "USN03", status: "LATE" },
    ];

    // Initial: 3 present (both PRESENT and LATE are counted)
    let totalPresent = records.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
    let rate = ((totalPresent / totalEnrolled) * 100).toFixed(1);
    expect(totalPresent).toBe(3);
    expect(rate).toBe("5.0");

    // Transition 1: Mark student 2 as ABSENT
    const afterAbsent = records.map(r => r.id === "2" ? { ...r, status: "ABSENT" } : r);
    totalPresent = afterAbsent.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
    rate = ((totalPresent / totalEnrolled) * 100).toFixed(1);
    expect(totalPresent).toBe(2);
    expect(rate).toBe("3.3");

    // Transition 2: Mark student 2 as LATE
    const afterLate = afterAbsent.map(r => r.id === "2" ? { ...r, status: "LATE" } : r);
    totalPresent = afterLate.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
    rate = ((totalPresent / totalEnrolled) * 100).toFixed(1);
    expect(totalPresent).toBe(3);
    expect(rate).toBe("5.0");
  });

  it("should parse session review records and handle empty session ledger honestly", async () => {
    // 1. Session with persisted database records
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "sess-db-001",
          records: [
            {
              id: "cuid-rec-01",
              studentId: "CSE2026001",
              studentName: "Manish Bose",
              statusEnum: "PRESENT",
              confidence: 0.98,
            },
          ],
        },
      }),
    } as Response);

    const populatedRes = await api.get<{ records: Array<{ id: string; statusEnum: string }> }>("/attendance/session/sess-db-001");
    expect(populatedRes.success).toBe(true);
    expect(populatedRes.data?.records.length).toBe(1);
    expect(populatedRes.data?.records[0].id).toBe("cuid-rec-01");

    // 2. Session with zero records (clean empty state)
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "sess-db-002",
          records: [],
        },
      }),
    } as Response);

    const emptyRes = await api.get<{ records: unknown[] }>("/attendance/session/sess-db-002");
    expect(emptyRes.success).toBe(true);
    expect(emptyRes.data?.records.length).toBe(0);
  });
});
