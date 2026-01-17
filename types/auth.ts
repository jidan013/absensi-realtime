export type Role = "ADMIN" | "USER";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
