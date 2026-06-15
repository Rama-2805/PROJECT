export enum RoleName {
  SUPER_ADMIN = "SUPER_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  TEACHER = "TEACHER",
  DEVICE_MANAGER = "DEVICE_MANAGER",
  RESEARCH_ANALYST = "RESEARCH_ANALYST",
}

export const ROLE_LABELS: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: "Super Admin",
  [RoleName.INSTITUTION_ADMIN]: "Institution Admin",
  [RoleName.TEACHER]: "Teacher",
  [RoleName.DEVICE_MANAGER]: "Device Manager",
  [RoleName.RESEARCH_ANALYST]: "Research Analyst",
};

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [RoleName.SUPER_ADMIN]: 100,
  [RoleName.INSTITUTION_ADMIN]: 80,
  [RoleName.TEACHER]: 60,
  [RoleName.DEVICE_MANAGER]: 40,
  [RoleName.RESEARCH_ANALYST]: 20,
};
