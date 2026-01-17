import { Role } from "./auth";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}
