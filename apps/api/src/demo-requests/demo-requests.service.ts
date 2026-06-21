import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DemoRequestsService {
  private readonly storageDir = path.resolve(__dirname, "../../../../storage");
  private readonly csvFile = path.join(this.storageDir, "demo_requests.csv");
  private readonly emailDir = path.join(this.storageDir, "emails");

  constructor(private prisma: PrismaService) {
    // Ensure directories exist
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.mkdirSync(this.emailDir, { recursive: true });

    // Initialize CSV header if not exists
    if (!fs.existsSync(this.csvFile)) {
      const header = "ID,College Name,Contact Person,Designation,Official Email,Phone Number,Department,Students,Teachers,Classrooms,Cameras,City,State,Requirements,Status,Created At\n";
      fs.writeFileSync(this.csvFile, header, "utf8");
    }
  }

  async create(dto: any) {
    // 1. Store in PostgreSQL
    const demo = await this.prisma.demoRequest.create({
      data: {
        collegeName: dto.collegeName,
        contactPerson: dto.contactPerson,
        designation: dto.designation,
        officialEmail: dto.officialEmail,
        phoneNumber: dto.phoneNumber,
        department: dto.department,
        numStudents: Number(dto.numStudents || 0),
        numTeachers: Number(dto.numTeachers || 0),
        numClassrooms: Number(dto.numClassrooms || 0),
        numCameras: Number(dto.numCameras || 0),
        city: dto.city,
        state: dto.state,
        requirements: dto.requirements || "",
        status: "NEW",
      },
    });

    // 2. Save/Append to CSV
    try {
      const row = `"${demo.id}","${demo.collegeName.replace(/"/g, '""')}","${demo.contactPerson.replace(/"/g, '""')}","${demo.designation.replace(/"/g, '""')}","${demo.officialEmail}","${demo.phoneNumber}","${demo.department}","${demo.numStudents}","${demo.numTeachers}","${demo.numClassrooms}","${demo.numCameras}","${demo.city}","${demo.state}","${(demo.requirements || "").replace(/\n/g, " ").replace(/"/g, '""')}","${demo.status}","${demo.createdAt.toISOString()}"\n`;
      fs.appendFileSync(this.csvFile, row, "utf8");
    } catch (csvErr) {
      console.error("Failed to append to CSV:", csvErr);
    }

    // 3. Generate Simulated Email Notification
    try {
      const emailContent = `To: contact@smartcampusai.com
Subject: New SmartCampus AI Demo Request - ${demo.collegeName}
Date: ${demo.createdAt.toUTCString()}
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    h2 { color: #1d6ffb; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; margin-top: 15px; }
    td, th { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f2f2f2; text-align: left; }
  </style>
</head>
<body>
  <h2>New SmartCampus AI Demo Request Received</h2>
  <p>A new demo request has been submitted by <strong>${demo.contactPerson}</strong> from <strong>${demo.collegeName}</strong>.</p>
  
  <table>
    <tr><th>College Name</th><td>${demo.collegeName}</td></tr>
    <tr><th>Contact Person</th><td>${demo.contactPerson} (${demo.designation})</td></tr>
    <tr><th>Official Email</th><td><a href="mailto:${demo.officialEmail}">${demo.officialEmail}</a></td></tr>
    <tr><th>Phone Number</th><td>${demo.phoneNumber}</td></tr>
    <tr><th>Department</th><td>${demo.department}</td></tr>
    <tr><th>Metrics</th><td>Students: ${demo.numStudents} | Teachers: ${demo.numTeachers} | Classrooms: ${demo.numClassrooms} | Cameras: ${demo.numCameras}</td></tr>
    <tr><th>Location</th><td>${demo.city}, ${demo.state}</td></tr>
    <tr><th>Requirements</th><td>${demo.requirements || "N/A"}</td></tr>
  </table>
  
  <p style="margin-top: 25px; font-size: 11px; color: #777;">This is a system generated notification from SmartCampus AI Core.</p>
</body>
</html>
`;
      const emailPath = path.join(this.emailDir, `demo_request_${demo.id}.eml`);
      fs.writeFileSync(emailPath, emailContent, "utf8");
    } catch (emailErr) {
      console.error("Failed to generate simulated email:", emailErr);
    }

    return {
      success: true,
      message: "Thank you for contacting SmartCampus AI. Our team will contact you shortly.",
      data: demo,
    };
  }

  async findAll() {
    return this.prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: string) {
    const demo = await this.prisma.demoRequest.findUnique({ where: { id } });
    if (!demo) throw new NotFoundException("Demo request not found");

    return this.prisma.demoRequest.update({
      where: { id },
      data: { status },
    });
  }
}
