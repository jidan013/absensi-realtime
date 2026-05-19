import { JwtPayload } from "jsonwebtoken";

// User Object dan JWT Payload
export interface UserAuth extends JwtPayload {
  userId: string;
  roleId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  exp?: number;
  iat?: number;
}

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}