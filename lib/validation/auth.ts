import { z } from "zod";


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


export const registerSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  name: z.string().min(1, { message: "Nama harus diisi" }),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  position: z.string().min(1, { message: "Posisi harus diisi" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export type LoginSchemaFormData = z.infer<typeof loginSchema>;
export type RegisterSchemaFormData = z.infer<typeof registerFormSchema>;
export type RegisterApiData = z.infer<typeof registerSchema>;