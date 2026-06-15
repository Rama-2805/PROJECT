export interface Report {
  id: string;
  title: string;
  type: "ATTENDANCE" | "BEHAVIOR" | "STUDENT_PERFORMANCE" | "DEVICE_HEALTH" | "INSTITUTION_SUMMARY";
  format: "PDF" | "CSV" | "EXCEL";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  generatedBy: string;
  fileSize?: string;
  createdAt: string;
  completedAt?: string;
}

const REPORT_TYPES: Report["type"][] = [
  "ATTENDANCE", "BEHAVIOR", "STUDENT_PERFORMANCE", "DEVICE_HEALTH", "INSTITUTION_SUMMARY",
];

function generateReports(): Report[] {
  const reports: Report[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const type = REPORT_TYPES[i % REPORT_TYPES.length];
    const format = i % 3 === 0 ? "PDF" : i % 3 === 1 ? "CSV" : "EXCEL";
    const status = i < 10 ? "COMPLETED" : "GENERATING";
    const created = new Date(now - i * 86400000 * (1 + Math.floor(i / 4)));
    const completed = status === "COMPLETED" ? new Date(created.getTime() + 120000) : undefined;

    reports.push({
      id: `rpt-${String(i + 1).padStart(3, "0")}`,
      title: `${type.replace(/_/g, " ")} Report - ${created.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      type,
      format,
      status: status as Report["status"],
      generatedBy: ["Dr. Rajesh Kumar", "Admin User", "System Auto"][i % 3],
      fileSize: status === "COMPLETED" ? `${(Math.random() * 400 + 50).toFixed(0)} KB` : undefined,
      createdAt: created.toISOString(),
      completedAt: completed?.toISOString(),
    });
  }
  return reports;
}

export function getReportHistory(): Promise<Report[]> {
  return Promise.resolve(generateReports());
}

export function generateReport(title: string, type: string, format: string): Promise<Report> {
  const newReport: Report = {
    id: `rpt-${Date.now()}`,
    title,
    type: type as Report["type"],
    format: format as Report["format"],
    status: "GENERATING",
    generatedBy: "Current User",
    createdAt: new Date().toISOString(),
  };

  // Simulate completion after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...newReport,
        status: "COMPLETED",
        fileSize: `${Math.floor(Math.random() * 500 + 50)} KB`,
        completedAt: new Date().toISOString(),
      });
    }, 500);
  });
}
