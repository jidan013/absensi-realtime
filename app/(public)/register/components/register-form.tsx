"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


type User = {
  name: string
  email: string
  password: string
}

export default function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !email || !password || !confirmPassword) {
      setMessage({ type: "error", text: "Semua field wajib diisi!" })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Password dan konfirmasi password tidak sama!" })
      return
    }

    // ✅ Simpan data user ke localStorage (simulasi database)
    const existingUsers: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const userExists = existingUsers.find((user) => user.email === email)

    if (userExists) {
      setMessage({ type: "error", text: "Email sudah terdaftar!" })
      return
    }

    existingUsers.push({ name, email, password })
    localStorage.setItem("users", JSON.stringify(existingUsers))

    setMessage({ type: "success", text: "Registrasi berhasil! Mengarahkan ke halaman login..." })

    setTimeout(() => {
      router.push("/login")
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Register</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Create your new account below
          </p>
        </div>

        {message.type && (
          <Alert variant={message.type === "success" ? "default" : "destructive"}>
            <AlertTitle>{message.type === "success" ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="fullname">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="*******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Retype Password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="*******"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>

        <Field>
          <Button type="submit">Register</Button>
        </Field>

        <FieldSeparator />

        <Field>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign In
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
