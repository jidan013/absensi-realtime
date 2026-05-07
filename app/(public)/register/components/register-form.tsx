"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff, User, Mail, Briefcase, Lock } from "lucide-react";

export default function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi password match
    if (form.password !== form.confirmPassword) {
      setMessage({
        type: "error",
        text: "Password dan Confirm Password tidak cocok",
      });
      return;
    }

    // Validasi minimal password length
    if (form.password.length < 6) {
      setMessage({
        type: "error",
        text: "Password minimal 6 karakter",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          position: form.position,
          password: form.password,
          role: "EMPLOYEE",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            data.message ||
            Object.values(data.errors || {})
              .flat()
              .join(", ") ||
            "Registrasi gagal",
        });
        setLoading(false);
        return;
      }

      setMessage({
        type: "success",
        text: "Registrasi berhasil! Mengarahkan ke login...",
      });

      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      console.log(err);
      setMessage({
        type: "error",
        text: "Terjadi kesalahan, coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}>
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fill in your information below
          </p>
        </div>

        {/* Alert */}
        {message.type && (
          <Alert
            variant={message.type === "success" ? "default" : "destructive"}
            className="rounded-xl">
            <AlertTitle>
              {message.type === "success" ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </FieldLabel>
          <Input
            id="name"
            placeholder="John Doe"
            value={form.name}
            onChange={handleChange}
            required
            className="h-11 rounded-xl"
          />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={handleChange}
            required
            className="h-11 rounded-xl"
          />
        </div>

        {/* Position Field */}
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Position
          </FieldLabel>
          <Input
            id="position"
            placeholder="Staff / Manager / Developer"
            value={form.position}
            onChange={handleChange}
            required
            className="h-11 rounded-xl"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              className="h-11 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Confirm Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="h-11 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </div>
          ) : (
            "Register"
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
              Already have an account?
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/login")}
          className="w-full h-11 rounded-xl">
          Sign In
        </Button>
      </div>
    </form>
  );
}