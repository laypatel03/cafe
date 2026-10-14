import type { Metadata } from "next";
import { BrandName, LogoIcon } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff login", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-[0_30px_60px_-30px_rgba(15,92,44,0.35)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoIcon className="h-14" alt="" priority />
          <h1 className="mt-3 text-2xl font-bold">Staff login</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BrandName className="h-5" /> dashboard
          </p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
