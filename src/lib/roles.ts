export const USER_ROLES = [
  "super_admin",
  "school_admin",
  "teacher",
  "clerk",
  "ca",
  "student",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Class Teacher",
  clerk: "Clerk",
  ca: "Chartered Accountant",
  student: "Student",
};

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/admin",
  school_admin: "/dashboard",
  teacher: "/teacher",
  clerk: "/clerk",
  ca: "/ca",
  student: "/student",
};

export const SCHOOL_ROLES: UserRole[] = [
  "school_admin",
  "teacher",
  "clerk",
  "ca",
  "student",
];

export const STAFF_ROLES: UserRole[] = ["school_admin", "teacher", "clerk"];

export const ACCOUNTING_ROLES: UserRole[] = ["school_admin", "clerk", "ca"];

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function getRoleHome(role: string): string {
  if (isUserRole(role)) return ROLE_HOME[role];
  return "/login";
}

export function canAccessAccounting(role: string): boolean {
  return ACCOUNTING_ROLES.includes(role as UserRole);
}

export function canManageScholarship(role: string): boolean {
  return ["school_admin", "clerk"].includes(role);
}

export function canVerifyAdmission(role: string): boolean {
  return ["school_admin", "clerk"].includes(role);
}

export function canManageResults(role: string): boolean {
  return ["school_admin", "teacher"].includes(role);
}

export function canAudit(role: string): boolean {
  return role === "ca" || role === "school_admin";
}
