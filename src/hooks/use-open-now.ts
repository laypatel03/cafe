"use client";

import { useEffect, useState } from "react";
import { type CafeHourSchedule, isWithinWorkingHours } from "@/lib/cafe-hours";

/**
 * Whether the opening hours allow guest orders right now, re-checked every 30 s so an open page
 * opens and closes on time without a reload. `initial` is the server's answer, used until then.
 */
export function useOpenNow(hours: CafeHourSchedule[] | undefined, initial = true) {
  const [open, setOpen] = useState(initial);
  const key = JSON.stringify(hours ?? []);
  useEffect(() => {
    const parsed = JSON.parse(key) as CafeHourSchedule[];
    const check = () => setOpen(isWithinWorkingHours(parsed));
    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [key]);
  return open;
}
