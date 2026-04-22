"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ penting untuk cookie
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // ❌ Handle error dari backend
      if (!res.ok) {
        let errorText = data.message || "Login gagal";

        // 🔍 kalau error validasi dari Zod
        if (data.errors) {
          const firstError = Object.values(data.errors)[0];
          if (Array.isArray(firstError)) {
            errorText = firstError[0];
          }
        }

        setMessage({
          type: "error",
          text: errorText,
        });
        return;
      }

      // ✅ success
      setMessage({
        type: "success",
        text: data.message || "Login berhasil",
      });

      // redirect (kasih delay dikit biar user lihat success)
      setTimeout(() => {
        router.replace("/absensi");
      }, 500);

    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Terjadi kesalahan server",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email below to login
          </p>
        </div>

        {message.type && (
          <Alert
            variant={message.type === "success" ? "default" : "destructive"}
          >
            <AlertTitle>
              {message.type === "success" ? "Berhasil" : "Gagal"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel>Password</FieldLabel>
            <a className="ml-auto text-sm underline hover:underline">
              Forgot password?
            </a>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Login"}
          </Button>
        </Field>

        <FieldSeparator />

        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}