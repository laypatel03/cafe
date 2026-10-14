"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ChartMonth = {
  key: string;
  short: string;
  label: string;
  sales: number;
  expenses: number;
  profit: number;
};

// Brand Deep Leaf Green / Tangerine plus a blue for profit; checked for colour-blind separation on both
// themes (dataviz validator). Dark mode uses a deeper orange; the legend, hover card and table carry the names.
const SERIES = [
  { key: "sales", label: "Sales", color: "var(--mb-sales)" },
  { key: "expenses", label: "Expenses", color: "var(--mb-expenses)" },
  { key: "profit", label: "Profit", color: "var(--mb-profit)" },
] as const;

const W = 760;
const H = 260;
const PAD = { left: 56, right: 8, top: 12, bottom: 26 };

/** 1, 2, 2.5 or 5 × a power of ten – a round step for about `count` gridlines. */
function niceStep(range: number, count = 4) {
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/** ₹12k, ₹1.5L – short axis labels in the Indian style. */
function short(v: number) {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 100_000) return `${sign}₹${+(a / 100_000).toFixed(1)}L`;
  if (a >= 1_000) return `${sign}₹${+(a / 1_000).toFixed(1)}k`;
  return `${sign}₹${a}`;
}

const money = (v: number) => (v < 0 ? `−${formatINR(-v)}` : formatINR(v));

/** A bar from the baseline, with 4px rounding on the end away from it. */
function barPath(x: number, w: number, y0: number, y1: number) {
  const up = y1 < y0;
  const h = Math.abs(y1 - y0);
  const r = Math.min(4, w / 2, h);
  if (h === 0) return "";
  return up
    ? `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`
    : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
}

/** Sales, expenses and profit side by side for each month, with a hover card per month. */
export function MonthlyChart({ months }: { months: ChartMonth[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = months.flatMap((m) => [m.sales, m.expenses, m.profit]);
  const empty = values.every((v) => v === 0);

  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const step = niceStep(Math.max(rawMax - rawMin, 1));
  const top = Math.ceil(rawMax / step) * step || step;
  const bottom = Math.floor(rawMin / step) * step;
  const plotH = H - PAD.top - PAD.bottom;
  const plotW = W - PAD.left - PAD.right;
  const y = (v: number) => PAD.top + ((top - v) / (top - bottom)) * plotH;
  const ticks: number[] = [];
  for (let v = bottom; v <= top + step / 2; v += step) ticks.push(Math.round(v));

  const groupW = plotW / months.length;
  const gap = 2;
  const barW = (groupW * 0.7 - gap * 2) / 3;
  const groupX = (i: number) => PAD.left + i * groupW + groupW * 0.15;
  const active = hover === null ? null : months[hover];

  return (
    <figure
      className="space-y-3 [--mb-expenses:#FF7800] [--mb-profit:#0369A1] [--mb-sales:#167A24] dark:[--mb-expenses:#E0700A] dark:[--mb-profit:#3D8EDB]"
      aria-label="Sales, expenses and profit by month"
    >
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>

      {empty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No sales or expenses in these months yet.
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full min-w-[40rem] tabular"
            role="img"
            aria-label="Bar chart; the table below has the same numbers"
            onMouseLeave={() => setHover(null)}
          >
            {/* recessive grid and axis labels */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  className={t === 0 ? "stroke-foreground/40" : "stroke-border"}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {short(t)}
                </text>
              </g>
            ))}

            {months.map((m, i) => (
              <g key={m.key}>
                {hover === i && (
                  <rect
                    x={PAD.left + i * groupW}
                    y={PAD.top}
                    width={groupW}
                    height={plotH}
                    rx={6}
                    className="fill-muted/70"
                  />
                )}
                {SERIES.map((s, j) => (
                  <path
                    key={s.key}
                    d={barPath(groupX(i) + j * (barW + gap), barW, y(0), y(m[s.key]))}
                    fill={s.color}
                  />
                ))}
                <text
                  x={PAD.left + i * groupW + groupW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className={cn(
                    "text-[11px]",
                    hover === i ? "fill-foreground font-semibold" : "fill-muted-foreground",
                  )}
                >
                  {m.short}
                </text>
                {/* hit target: the whole month column */}
                <rect
                  x={PAD.left + i * groupW}
                  y={PAD.top}
                  width={groupW}
                  height={plotH + PAD.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setHover(i)}
                />
              </g>
            ))}
          </svg>

          {active && hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-44 rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg"
              style={{
                left: `clamp(0px, calc(${((PAD.left + (hover + 0.5) * groupW) / W) * 100}% - 5.5rem), calc(100% - 11rem))`,
              }}
            >
              <p className="mb-1 font-semibold">{active.label}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                  <span className="flex-1 text-muted-foreground">{s.label}</span>
                  <span className={cn("tabular font-semibold", active[s.key] < 0 && "text-destructive")}>
                    {money(active[s.key])}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
