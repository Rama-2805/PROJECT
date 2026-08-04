export enum RoleName {
  SUPER_ADMIN = "SUPER_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  HOD = "HOD",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
  DEVICE_MANAGER = "DEVICE_MANAGER",
  RESEARCH_ANALYST = "RESEARCH_ANALYST",
}

export const ROLE_LABELS: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: "Super Admin",
  [RoleName.INSTITUTION_ADMIN]: "Institution Admin",
  [RoleName.HOD]: "Head of Department",
  [RoleName.TEACHER]: "Teacher",
  [RoleName.STUDENT]: "Student",
  [RoleName.PARENT]: "Parent",
  [RoleName.DEVICE_MANAGER]: "Device Manager",
  [RoleName.RESEARCH_ANALYST]: "Research Analyst",
};

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [RoleName.SUPER_ADMIN]: 100,
  [RoleName.INSTITUTION_ADMIN]: 80,
  [RoleName.HOD]: 70,
  [RoleName.TEACHER]: 60,
  [RoleName.STUDENT]: 40,
  [RoleName.PARENT]: 30,
  [RoleName.DEVICE_MANAGER]: 20,
  [RoleName.RESEARCH_ANALYST]: 10,
};
