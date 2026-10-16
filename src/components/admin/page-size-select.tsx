"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

/** "10 ▾" picker under a list; each choice is a link built on the server, so filters are kept. */
export function PageSizeSelect({
  value,
  options,
}: {
  value: number;
  options: { size: number; href: string }[];
}) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Rows per page"
      value={value}
      onChange={(e) => {
        const to = options.find((o) => o.size === Number(e.target.value));
        if (to) router.push(to.href);
      }}
      className="h-10 w-auto rounded-xl border-0 bg-muted pr-9 pl-4 tabular font-semibold md:text-base dark:bg-muted"
    >
      {options.map((o) => (
        <option key={o.size} value={o.size}>
          {o.size}
        </option>
      ))}
    </NativeSelect>
  );
}
