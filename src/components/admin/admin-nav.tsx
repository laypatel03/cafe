"use client";

import {
  Banknote,
  BarChart3,
  BookOpen,
  ClipboardList,
  History,
  IndianRupee,
  LogOut,
  Menu as MenuIcon,
  QrCode,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/login/actions";
import { BrandName, LogoIcon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { CurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { NAV, type NavItem } from "./nav-items";

const ICONS = {
  orders: ClipboardList,
  menu: BookOpen,
  history: History,
  cash: Banknote,
  expenses: Receipt,
  money: IndianRupee,
  qr: QrCode,
  customers: Users,
  reports: BarChart3,
  settings: Settings,
} satisfies Record<NavItem["icon"], typeof ClipboardList>;

function NavLinks({ user, onNavigate }: { user: CurrentUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const body = (
          <>
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tracking-wide uppercase">
                {item.soon}
              </span>
            )}
          </>
        );
        const cls = cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent",
        );
        // pages from later phases show their phase; Live orders is reachable as the home screen
        return item.soon && item.href !== "/admin" ? (
          <span key={item.href} className={cn(cls, "cursor-not-allowed opacity-55")} aria-disabled>
            {body}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={cls}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
          >
            {body}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border pt-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="text-xs text-white/70">{user.role === "OWNER" ? "Owner" : "Staff"}</p>
      </div>
      <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Log out"
          className="rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-5" />
        </Button>
      </form>
    </div>
  );
}

export function AdminSidebar({ user }: { user: CurrentUser }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
      <Link href="/admin" className="flex items-center gap-2 px-2 pt-1">
        <span className="rounded-xl bg-white p-1">
          <LogoIcon className="h-7" alt="" />
        </span>
        <BrandName className="text-xl" />
      </Link>
      <div className="flex-1 overflow-y-auto">
        <NavLinks user={user} />
      </div>
      <UserBlock user={user} />
    </aside>
  );
}

export function AdminMobileBar({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="rounded-full"
      >
        <MenuIcon className="size-5" />
      </Button>
      <LogoIcon className="h-7" alt="" />
      <span className="font-heading font-bold">Dashboard</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 gap-6 border-0 bg-sidebar p-4 text-sidebar-foreground">
          <SheetTitle className="px-2 pt-1">
            <BrandName className="text-xl" />
          </SheetTitle>
          <div className="flex-1 overflow-y-auto">
            <NavLinks user={user} onNavigate={() => setOpen(false)} />
          </div>
          <UserBlock user={user} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
