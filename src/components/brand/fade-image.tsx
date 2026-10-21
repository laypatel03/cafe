"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A `fill` image that shows a soft pulse while it downloads, then fades in,
 * instead of popping in line by line. The parent must be `relative`.
 */
export function FadeImage({ alt, className, onLoad, onError, ...props }: Omit<ImageProps, "fill">) {
  const [loaded, setLoaded] = useState(false);
  // above-the-fold images paint at once: hiding them would delay the page's main paint
  if (props.priority || props.preload) return <Image {...props} alt={alt} fill className={className} />;
  return (
    <>
      {!loaded && <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
      <Image
        {...props}
        alt={alt}
        fill
        // a cached image can finish before hydration, when onLoad has already fired
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true);
          onError?.(e);
        }}
        className={cn("transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)}
      />
    </>
  );
}
