import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔌 Connecting to database...');

  // ── Step 1: Read existing data ──────────────────────────────────
  const institutions = await prisma.institution.findMany({
    select: { id: true, name: true },
  });
  console.log('Institutions found:', institutions.map(i => `${i.id}: ${i.name}`));

  const departments = await prisma.department.findMany({
    select: { id: true, name: true, code: true, institutionId: true },
  });
  console.log('Departments found:', departments.map(d => `${d.id}: ${d.code} - ${d.name}`));

  const courses = await prisma.course.findMany({
    select: { id: true, name: true, code: true, departmentId: true },
  });
  console.log('Courses found:', courses.map(c => `${c.id}: ${c.code} - ${c.name}`));

  const studentCount = await prisma.student.count();
  console.log(`\nExisting students: ${studentCount}`);

  // Find CSE department
  const cseDept = departments.find(
    d => d.code?.toLowerCase().includes('cse') || d.name?.toLowerCase().includes('computer science')
  );
  
  if (!cseDept) {
    console.error('❌ CSE department not found! Available:', departments.map(d => d.code));
    process.exit(1);
  }
  console.log(`\n✅ Found CSE department: ${cseDept.id} - ${cseDept.name}`);

  // Find CSE course (B.Tech or similar)
  const cseCourse = courses.find(c => c.departmentId === cseDept.id)
    || courses.find(c => c.code?.toLowerCase().includes('cse') || c.code?.toLowerCase().includes('cs'));
  
  if (!cseCourse) {
    console.error('❌ No course found for CSE department. Available courses:', courses.map(c => `${c.code}(dept:${c.departmentId})`));
    process.exit(1);
  }
  console.log(`✅ Found CSE course: ${cseCourse.id} - ${cseCourse.name}`);

  const institutionId = cseDept.institutionId;
  const institution = institutions.find(i => i.id === institutionId);
  console.log(`✅ Institution: ${institutionId} - ${institution?.name}`);

  // ── Step 2: Parse Excel ─────────────────────────────────────────
  const excelPath = '/Users/rama/Desktop/CSE2027-MasterDatabase.xlsx';
  
  // Dynamically import xlsx
  let xlsx: any;
  try {
    xlsx = require('xlsx');
  } catch {
    console.error('xlsx not installed. Installing...');
    require('child_process').execSync('npm install xlsx --no-save', { stdio: 'inherit' });
    xlsx = require('xlsx');
  }

  const workbook = xlsx.readFile(excelPath);
  const ws = workbook.Sheets['2027-cse'];
  const rawData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Row 3 (index 2) is the header, data starts at row 4 (index 3)
  const students: any[] = [];
  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row[0] === null || row[0] === undefined) continue;
    
    const siNo = row[0];
    if (typeof siNo !== 'number' && isNaN(Number(String(siNo).trim()))) continue;

    const usn       = String(row[1] || '').trim();
    const fullName  = String(row[2] || '').trim();
    const gender    = String(row[3] || '').trim();
    const mobile    = String(row[4] || '').trim();
    const collegeEmail = String(row[6] || '').trim();
    const dobRaw    = row[7];

    if (!usn || !fullName) continue;

    // Parse DOB — handles Excel Date objects, Excel serial numbers, and string formats
    let dateOfBirth: Date | null = null;
    if (dobRaw instanceof Date && !isNaN(dobRaw.getTime())) {
      dateOfBirth = dobRaw;
    } else if (typeof dobRaw === 'number') {
      // Excel stores dates as serial numbers (days since 1900-01-01)
      // 25569 = Unix epoch (1970-01-01) offset
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const parsed = new Date(excelEpoch.getTime() + dobRaw * msPerDay);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950) {
        dateOfBirth = parsed;
      }
    } else if (typeof dobRaw === 'string' && dobRaw.trim()) {
      const s = dobRaw.trim();
      // Try various formats: DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD
      const parts = s.split(/[\/-]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0]), p1 = parseInt(parts[1]), p2 = parseInt(parts[2]);
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(p0, p1 - 1, p2);
          if (!isNaN(d.getTime())) dateOfBirth = d;
        } else if (p2 > 1950 && p2 < 2030) {
          // DD/MM/YYYY
          const d = new Date(p2, p1 - 1, p0);
          if (!isNaN(d.getTime())) dateOfBirth = d;
        }
      }
    }

    // Normalize gender
    let normalizedGender = gender.toLowerCase().trim();
    if (normalizedGender.includes('male')) normalizedGender = normalizedGender.includes('fe') ? 'Female' : 'Male';
    else normalizedGender = '';

    // Normalize mobile
    const phone = mobile.replace(/\D/g, '').slice(-10);

    students.push({
      usn,
      fullName,
      gender: normalizedGender || null,
      email: collegeEmail || null,
      phone: phone || null,
      dateOfBirth,
    });
  }

  console.log(`\n📊 Parsed ${students.length} students from Excel`);
  console.log('Sample:', students[0], students[1]);

  // ── Step 3: Delete all existing students ────────────────────────
  console.log('\n🗑️  Deleting all existing students...');

  // Delete dependent records first (wrapped in try/catch for tables that may not exist)
  const safeDelete = async (label: string, fn: () => Promise<{ count: number }>) => {
    try {
      const result = await fn();
      if (result.count > 0) console.log(`  Deleted ${result.count} ${label}`);
    } catch { /* table doesn't exist yet — skip */ }
  };

  await safeDelete('attendance records',  () => prisma.attendanceRecord.deleteMany({}));
  await safeDelete('behavior events',     () => prisma.behaviorEvent.deleteMany({}));
  await safeDelete('face images',         () => prisma.faceImage.deleteMany({}));
  await safeDelete('face embeddings',     () => prisma.faceEmbedding.deleteMany({}));
  await safeDelete('face profiles',       () => (prisma as any).faceProfile?.deleteMany({}));
  await safeDelete('student parents',     () => (prisma as any).studentParent?.deleteMany({}));
  await safeDelete('cluster assignments', () => (prisma as any).clusterAssignment?.deleteMany({}));
  await safeDelete('cluster images',      () => (prisma as any).clusterImage?.deleteMany({}));
  await safeDelete('student clusters',    () => (prisma as any).studentCluster?.deleteMany({}));
  await safeDelete('enrollment audits',   () => (prisma as any).enrollmentAudit?.deleteMany({}));
  await safeDelete('enrollment videos',   () => (prisma as any).enrollmentVideo?.deleteMany({}));
  await safeDelete('enrollment sessions', () => (prisma as any).enrollmentSession?.deleteMany({}));

  const delStudents = await prisma.student.deleteMany({});
  console.log(`  ✅ Deleted ${delStudents.count} students`);


  // ── Step 4: Create User Accounts & Import CSE students ──────────
  console.log('\n🔑 Preparing STUDENT role & password hash...');
  const argon2 = await import('argon2');
  const demoPwHash = await argon2.hash('demo123');
  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });

  console.log('\n📥 Importing CSE students and creating User login accounts...');
  let imported = 0;
  let errors = 0;

  for (const s of students) {
    try {
      const studentEmail = s.email || `${s.usn.toLowerCase()}.cs2023@vemanait.edu.in`;

      // 1. Create or update User account for student login
      const user = await prisma.user.upsert({
        where: { email: studentEmail },
        update: {
          fullName: s.fullName,
          passwordHash: demoPwHash,
          mustChangePassword: true,
        },
        create: {
          institutionId,
          fullName: s.fullName,
          email: studentEmail,
          passwordHash: demoPwHash,
          mustChangePassword: true,
          emailVerified: true,
          userRoles: studentRole ? {
            create: { roleId: studentRole.id }
          } : undefined,
        },
      });

      // 2. Create Student record linked to User account
      await prisma.student.create({
        data: {
          institutionId,
          departmentId: cseDept.id,
          courseId: cseCourse.id,
          userId: user.id,
          studentId: s.usn,   // stored as studentId (USN)
          rollNumber: s.usn,  // also stored as rollNumber
          fullName: s.fullName,
          email: studentEmail,
          phone: s.phone,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth || undefined,
          semester: 6,        // 2027 batch = approx 6th sem
          section: 'A',
          status: 'ACTIVE',
          batchYear: 2023,
        },
      });
      imported++;
      if (imported % 20 === 0) console.log(`  ... imported ${imported}/${students.length}`);
    } catch (err: any) {
      const errMsg = err.message?.split('\n')[0] || err.message;
      console.error(`  ⚠️  ${s.usn} - ${s.fullName}: ${errMsg}`);
      errors++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`   Total students now: ${await prisma.student.count()}`);
}

main()
  .catch(e => {
    console.error('Fatal error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
