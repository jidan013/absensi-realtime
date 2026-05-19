// lib/validation/auth.ts
import { z } from "zod";

// ✅ Register Form Schema (dengan confirm password)
export const registerFormSchema = z
  .object({
    email: z.string().email({ message: "Email tidak valid" }),
    name: z.string().min(1, { message: "Nama harus diisi" }),
    role: z.enum(["ADMIN", "EMPLOYEE"]),
    position: z.string().min(1, { message: "Posisi harus diisi" }),
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ✅ Register API Schema (tanpa confirm password)
export const registerSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  name: z.string().min(1, { message: "Nama harus diisi" }),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  position: z.string().min(1, { message: "Posisi harus diisi" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

// ✅ Login Schema (dengan rememberMe opsional)
export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
  rememberMe: z.boolean().optional().default(false), // ✅ Tambahkan rememberMe
});

// ✅ Forgot Password Schema (opsional)
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
});

// ✅ Reset Password Schema (opsional)
export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ✅ Type exports
export type LoginSchemaFormData = z.infer<typeof loginSchema>;
export type RegisterFormSchemaData = z.infer<typeof registerFormSchema>;
export type RegisterSchemaData = z.infer<typeof registerSchema>;
export type ForgotPasswordSchemaData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaData = z.infer<typeof resetPasswordSchema>;