/**
 * ─── User Store Utility ──────────────────────────────────────────
 * Manages client-side user accounts, password hashing, and policies.
 * ───────────────────────────────────────────────────────────────── */

export interface AppUser {
  email: string;
  fullName: string;
  role: "admin" | "teacher" | "student";
  passwordHash: string;
  passwordNeedsChange: boolean;
  department?: string;
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

    const defaultUsers: Record<string, AppUser> = {
      "admin@collegename.edu.in": {
        email: "admin@collegename.edu.in",
        fullName: "System Admin",
        role: "admin",
        passwordHash: adminHash,
        passwordNeedsChange: false,
        createdAt: new Date().toISOString(),
      },
      "teacher@collegename.edu.in": {
        email: "teacher@collegename.edu.in",
        fullName: "Dr. Sarah Jenkins",
        role: "teacher",
        passwordHash: teacherHash,
        passwordNeedsChange: true,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      },
      "student@collegename.edu.in": {
        email: "student@collegename.edu.in",
        fullName: "John Doe",
        role: "student",
        passwordHash: studentHash,
        passwordNeedsChange: true,
        department: "Computer Science",
        createdAt: new Date().toISOString(),
      }
    };

    localStorage.setItem(USER_STORE_KEY, JSON.stringify(defaultUsers));
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

export async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "teacher" | "student",
  department?: string
): Promise<AppUser> {
  const users = getUsers();
  if (users[email]) {
    throw new Error("User with this email already exists");
  }

  // Default demo password is "demo123"
  const demoHash = await hashPassword("demo123");

  const newUser: AppUser = {
    email,
    fullName,
    role,
    passwordHash: demoHash,
    passwordNeedsChange: true, // Forces password change on first login
    department,
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
