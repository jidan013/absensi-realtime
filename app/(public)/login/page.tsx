import { Suspense } from "react";
import { GalleryVerticalEnd, Sparkles } from "lucide-react";
import LoginForm from "./components/login-form";
import Link from "next/link";

// 🔥 WAJIB agar tidak prerender static
export const dynamic = "force-dynamic";

function LoginContent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Pattern Sederhana */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Logo & Brand */}

        {/* Login Form */}
        <LoginForm />

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-6">
            <Link 
              href="/privacy" 
              className="text-xs text-muted-foreground hover:text-blue-600 transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="text-xs text-muted-foreground hover:text-blue-600 transition-colors"
            >
              Terms
            </Link>
            <Link 
              href="/support" 
              className="text-xs text-muted-foreground hover:text-blue-600 transition-colors"
            >
              Support
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 RapidApp. All rights reserved.
          </p>
        </div>

        {/* Decorative Sparkle */}
        <div className="absolute -top-2 -right-2">
          <Sparkles className="size-4 text-blue-400 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -left-2">
          <Sparkles className="size-3 text-blue-400 animate-pulse delay-1000" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}