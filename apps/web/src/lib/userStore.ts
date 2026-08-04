/**
 * ─── User Store Utility ──────────────────────────────────────────
 * Manages client-side user accounts, password hashing, and policies.
 * ───────────────────────────────────────────────────────────────── */

export interface AppUser {
  email: string;
  fullName: string;
  role: "admin" | "teacher" | "student" | "hod";
  passwordHash: string;
  passwordNeedsChange: boolean;
  department?: string;
  studentId?: string;
  semester?: number;
  createdAt: string;
}

// SHA-256 Password Hashing via Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const USER_STORE_KEY = "smartcampus-user-store";

export async function initializeUserStore() {
  if (typeof window === "undefined") return;

  const existing = localStorage.getItem(USER_STORE_KEY);
  if (!existing) {
    const adminHash = await hashPassword("admin123");
    const teacherHash = await hashPassword("admin123");
    const studentHash = await hashPassword("admin123");
    const hodHash = await hashPassword("hod123");

    const defaultUsers: Record<string, AppUser> = {
      "admin@smartcampus.edu": {
        email: "admin@smartcampus.edu",
        fullName: "System Admin",
        role: "admin",
        passwordHash: adminHash,
        passwordNeedsChange: false,
        createdAt: new Date().toISOString(),
      },
      "admin@collegename.edu.in": {
        email: "admin@collegename.edu.in",
        fullName: "System Admin",
        role: "admin",
        passwordHash: adminHash,
        passwordNeedsChange: false,
        createdAt: new Date().toISOString(),
      },
      "college@smartcampus.edu": {
        email: "college@smartcampus.edu",
        fullName: "College Admin",
        role: "admin",
        passwordHash: adminHash,
        passwordNeedsChange: false,
        createdAt: new Date().toISOString(),
      },
      "hod.cse@smartcampus.edu": {
        email: "hod.cse@smartcampus.edu",
        fullName: "Dr. Manjunatha Prasad",
        role: "hod",
        passwordHash: hodHash,
        passwordNeedsChange: false,
        department: "CSE",
        createdAt: new Date().toISOString(),
      },
      "hod@vemana.edu.in": {
        email: "hod@vemana.edu.in",
        fullName: "Dr. Manjunatha Prasad",
        role: "hod",
        passwordHash: hodHash,
        passwordNeedsChange: false,
        department: "CSE",
        createdAt: new Date().toISOString(),
      },
      "teacher@smartcampus.edu": {
        email: "teacher@smartcampus.edu",
        fullName: "Dr. Sarah Jenkins",
        role: "teacher",
        passwordHash: teacherHash,
        passwordNeedsChange: false,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      },
      "teacher@collegename.edu.in": {
        email: "teacher@collegename.edu.in",
        fullName: "Dr. Sarah Jenkins",
        role: "teacher",
        passwordHash: teacherHash,
        passwordNeedsChange: false,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      },
      "student@smartcampus.edu": {
        email: "student@smartcampus.edu",
        fullName: "John Doe",
        role: "student",
        passwordHash: studentHash,
        passwordNeedsChange: false,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      },
      "student@collegename.edu.in": {
        email: "student@collegename.edu.in",
        fullName: "John Doe",
        role: "student",
        passwordHash: studentHash,
        passwordNeedsChange: false,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      }
    };

    localStorage.setItem(USER_STORE_KEY, JSON.stringify(defaultUsers));
  } else {
    // Ensure admin@smartcampus.edu exists in current local storage
    try {
      const users = JSON.parse(existing);
      if (!users["admin@smartcampus.edu"]) {
        const adminHash = await hashPassword("admin123");
        const teacherHash = await hashPassword("admin123");
        const studentHash = await hashPassword("admin123");
        const hodHash = await hashPassword("hod123");

        users["admin@smartcampus.edu"] = {
          email: "admin@smartcampus.edu",
          fullName: "System Admin",
          role: "admin",
          passwordHash: adminHash,
          passwordNeedsChange: false,
          createdAt: new Date().toISOString(),
        };
        users["teacher@smartcampus.edu"] = {
          email: "teacher@smartcampus.edu",
          fullName: "Dr. Sarah Jenkins",
          role: "teacher",
          passwordHash: teacherHash,
          passwordNeedsChange: false,
          department: "Computer Science",
          createdAt: new Date().toISOString(),
        };
        users["student@smartcampus.edu"] = {
          email: "student@smartcampus.edu",
          fullName: "John Doe",
          role: "student",
          passwordHash: studentHash,
          passwordNeedsChange: false,
          department: "Computer Science",
          createdAt: new Date().toISOString(),
        };
        users["hod.cse@smartcampus.edu"] = {
          email: "hod.cse@smartcampus.edu",
          fullName: "Dr. Manjunatha Prasad",
          role: "hod",
          passwordHash: hodHash,
          passwordNeedsChange: false,
          department: "CSE",
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
      }
    } catch (e) {
      // invalid json, skip
    }
  }
}

export function getUsers(): Record<string, AppUser> {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(USER_STORE_KEY);
  return data ? JSON.parse(data) : {};
}

export function saveUsers(users: Record<string, AppUser>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
}

function generateStudentUSN(department?: string): string {
  const users = getUsers();
  const students = Object.values(users).filter((u) => u.role === "student");
  
  const deptMap: Record<string, string> = {
    "Computer Science": "CS",
    "CSE": "CS",
    "Information Science": "IS",
    "ISE": "IS",
    "Electronics & Communication": "EC",
    "ECE": "EC",
    "Electrical & Electronics": "EE",
    "EEE": "EE",
    "Artificial Intelligence": "AI",
    "AIML": "AI",
    "Mechanical Engineering": "ME",
    "MECH": "ME",
    "Civil Engineering": "CV",
    "CIVIL": "CV"
  };
  
  const deptCode = deptMap[department || "CSE"] || "CS";
  const joiningYear = "23";
  const prefix = `1VI${joiningYear}${deptCode}`;
  
  let maxSeq = 0;
  students.forEach((s) => {
    if (s.studentId && s.studentId.startsWith(prefix)) {
      const seqStr = s.studentId.slice(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  });
  
  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${nextSeq}`;
}

export async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "teacher" | "student" | "hod",
  department?: string
): Promise<AppUser> {
  const users = getUsers();
  if (users[email]) {
    throw new Error("User with this email already exists");
  }

  // Default demo password is "demo123"
  const demoHash = await hashPassword("demo123");

  let studentId: string | undefined;
  let semester: number | undefined;

  if (role === "student") {
    studentId = generateStudentUSN(department);
    semester = 1;
  }

  const newUser: AppUser = {
    email,
    fullName,
    role,
    passwordHash: demoHash,
    passwordNeedsChange: true, // Forces password change on first login
    department,
    studentId,
    semester,
    createdAt: new Date().toISOString(),
  };

  users[email] = newUser;
  saveUsers(users);
  return newUser;
}

export async function updateUserPassword(
  email: string,
  newPasswordHash: string,
  isCompulsoryReset: boolean = false
) {
  const users = getUsers();
  if (!users[email]) {
    throw new Error("User not found");
  }

  users[email].passwordHash = newPasswordHash;
  users[email].passwordNeedsChange = isCompulsoryReset;
  saveUsers(users);
}
