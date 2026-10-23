"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle light and dark mode"
      className={cn("rounded-full", className)}
      onClick={() => {
        const next = resolvedTheme === "dark" ? "light" : "dark";
        // switching back to the device's own mode goes back to following it
        setTheme(next === systemTheme ? "system" : next);
      }}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
