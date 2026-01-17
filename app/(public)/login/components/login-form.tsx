"use client"

import React from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { useState, useTransition } from "react"
import {
  FormControl,
  FormField,    // ✅ TAMBAH INI
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password diperlukan"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm({ className }: React.ComponentProps<"form">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = (data: LoginFormData) => {
    startTransition(async () => {
      setError("")
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (result?.error) {
          setError("Email atau password salah!")
          return
        }

        router.push(result?.url || "/")
        router.refresh()
      } catch (err) {
        setError("Terjadi kesalahan. Silakan coba lagi.")
      }
    })
  }

  return (
    <Card className={cn("w-[400px]", className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Masuk ke Akun Anda</CardTitle>
        <CardDescription>
          Masukkan email Anda untuk masuk ke akun
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ✅ 1. WRAP FORM DENGAN FormProvider */}
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Gagal</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ✅ 2. EMAIL: Gunakan FormField */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@gmail.com"
                        {...field}  // ✅ field, BUKAN form.register()
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ 3. PASSWORD: Gunakan FormField */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link 
                        href="/forgot-password" 
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        Lupa Password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}  // ✅ field, BUKAN form.register()
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={isPending || form.formState.isSubmitting}
              >
                {isPending ? "Memproses..." : "Masuk"}
              </Button>

              <FieldDescription className="text-center text-sm">
                Belum punya akun?{" "}
                <Link 
                  href="/register" 
                  className="underline underline-offset-4 font-medium"
                >
                  Daftar sekarang
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </FormProvider> {/* ✅ 4. TUTUP FormProvider */}
      </CardContent>
    </Card>
  )
}
