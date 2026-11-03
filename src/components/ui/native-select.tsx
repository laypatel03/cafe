import * as React from "react";
import { cn } from "cn";

/** Native <select>: the best picker on phones, styled to match Input. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23566b5d%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent bg-[length:12px] bg-[right_0.6rem_center] bg-no-repeat py-1 pr-8 pl-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 [&_option]:bg-popover [&_option]:text-popover-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
