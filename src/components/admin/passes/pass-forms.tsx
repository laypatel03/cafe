"use client";

import { LoaderCircle, Minus, Pencil, Plus, RotateCcw, Ticket, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type MealPassChoice,
  mealPassChoices,
  refundMealPass,
  saveMealPlan,
  setMealPlanActive,
  sellMealPass,
  undoMealPass,
  applyMealPass,
} from "@/app/admin/(dashboard)/passes/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/hooks/use-form-action";
import { formatINR } from "@/lib/format";
import { type MealPart, mealsSummary } from "@/lib/meal-pass";
import { toRupees } from "@/lib/money";
import { PAY_CHOICES, PAYMENT_LABEL } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validators/menu";

const rupees = (paise: number) => formatINR(toRupees(paise));

/** Toast once per server answer; `onOk` runs while rendering (React's "adjust state on change"). */
function useResult(state: FormState, success: string, onOk: () => void) {
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) onOk();
  }
  useEffect(() => {
    if (state?.ok) toast.success(success);
    else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

function PayMethodSelect({ id, error, defaultValue }: { id: string; error?: string; defaultValue?: string }) {
  return (
    <NativeSelect
      id={id}
      name="method"
      defaultValue={defaultValue ?? ""}
      className="h-10"
      required
      aria-invalid={!!error}
    >
      <option value="" disabled>
        Choose…
      </option>
      {PAY_CHOICES.map((m) => (
        <option key={m} value={m}>
          {PAYMENT_LABEL[m]}
        </option>
      ))}
    </NativeSelect>
  );
}

/* --------------------------------- plans --------------------------------- */

export type PlanCategory = { id: string; name: string };
export type EditablePlan = { id: string; name: string; pricePaise: number; days: number; parts: MealPart[] };

/** One meal type while editing: numbers kept as typed. */
type PartDraft = { key: number; name: string; meals: string; categoryIds: string[]; cap: string };

const guess = (categories: PlanCategory[], word: string) =>
  categories.filter((c) => c.name.toLowerCase().includes(word)).map((c) => c.id);

export function PlanForm({
  plan,
  categories,
  onDone,
}: {
  plan?: EditablePlan;
  categories: PlanCategory[];
  onDone?: () => void;
}) {
  const [state, onSubmit, pending] = useFormAction(saveMealPlan, undefined);
  const money = (paise?: number) => (paise ? String(toRupees(paise)) : "");
  const startParts = (): PartDraft[] =>
    plan?.parts.length
      ? plan.parts.map((x, i) => ({
          key: i,
          name: x.name,
          meals: String(x.meals),
          categoryIds: x.categoryIds,
          cap: money(x.capPaise),
        }))
      : [{ key: 0, name: "Bowl", meals: "26", categoryIds: guess(categories, "salad"), cap: "" }];
  const [formKey, setFormKey] = useState(0);
  const [parts, setParts] = useState(startParts);
  useResult(state, plan ? "Plan saved" : "Plan added", () => {
    if (!plan) {
      setFormKey((k) => k + 1);
      setParts(startParts());
    }
    onDone?.();
  });
  const err = state?.fieldErrors ?? {};
  const p = plan ? `plan-${plan.id}-` : "plan-new-";
  const edit = (key: number, patch: Partial<PartDraft>) =>
    setParts((all) => all.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addPart = () =>
    setParts((all) => [
      ...all,
      { key: Math.max(-1, ...all.map((x) => x.key)) + 1, name: "", meals: "", categoryIds: [], cap: "" },
    ]);

  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <input
        type="hidden"
        name="parts"
        value={JSON.stringify(
          parts.map((x) => ({ name: x.name, meals: x.meals, categoryIds: x.categoryIds, cap: x.cap })),
        )}
      />
      <div className="sm:col-span-3">
        <FormField id={`${p}name`} label="Plan name" hint="e.g. Bowl + smoothie" error={err.name}>
          <Input
            id={`${p}name`}
            name="name"
            defaultValue={plan?.name}
            maxLength={60}
            className="h-10"
            required
          />
        </FormField>
      </div>
      <FormField id={`${p}price`} label="Price (₹)" error={err.price}>
        <Input
          id={`${p}price`}
          name="price"
          inputMode="decimal"
          defaultValue={money(plan?.pricePaise)}
          className="h-10"
          required
        />
      </FormField>
      <FormField id={`${p}days`} label="Valid for (days)" error={err.days}>
        <Input
          id={`${p}days`}
          name="days"
          inputMode="numeric"
          defaultValue={plan?.days ?? 30}
          className="h-10"
          required
        />
      </FormField>
      <div className="hidden sm:block" />

      <fieldset className="space-y-3 sm:col-span-3">
        <legend className="mb-1 text-sm font-semibold">Meal types</legend>
        <p className="text-xs text-muted-foreground">
          Each type has its own number of meals, the categories it covers, and the most the pass pays for one
          dish (dearer: the guest pays the difference).
        </p>
        {parts.map((x, i) => {
          const id = `${p}part-${x.key}-`;
          const e = (field: string) => err[`parts.${i}.${field}`];
          return (
            <div key={x.key} className="space-y-3 rounded-2xl border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem_8rem_auto] sm:items-start">
                <FormField
                  id={`${id}name`}
                  label="Meal type"
                  hint="e.g. Bowl, Smoothie, Toast"
                  error={e("name")}
                >
                  <Input
                    id={`${id}name`}
                    value={x.name}
                    onChange={(ev) => edit(x.key, { name: ev.target.value })}
                    maxLength={30}
                    className="h-10"
                  />
                </FormField>
                <FormField id={`${id}meals`} label="Meals" error={e("meals")}>
                  <Input
                    id={`${id}meals`}
                    value={x.meals}
                    onChange={(ev) => edit(x.key, { meals: ev.target.value })}
                    inputMode="numeric"
                    className="h-10"
                  />
                </FormField>
                <FormField id={`${id}cap`} label="Up to (₹)" error={e("cap")}>
                  <Input
                    id={`${id}cap`}
                    value={x.cap}
                    onChange={(ev) => edit(x.key, { cap: ev.target.value })}
                    inputMode="decimal"
                    className="h-10"
                  />
                </FormField>
                {parts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:mt-6"
                    aria-label={`Remove ${x.name || "this meal type"}`}
                    onClick={() => setParts((all) => all.filter((y) => y.key !== x.key))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <FormField id={`${id}categories`} label="Counts dishes from" error={e("categoryIds")}>
                <div
                  id={`${id}categories`}
                  role="group"
                  className={cn(
                    "grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-input px-3 py-2 sm:grid-cols-2",
                    e("categoryIds") && "border-destructive",
                  )}
                >
                  {categories.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={x.categoryIds.includes(c.id)}
                        onChange={(ev) =>
                          edit(x.key, {
                            categoryIds: ev.target.checked
                              ? [...x.categoryIds, c.id]
                              : x.categoryIds.filter((y) => y !== c.id),
                          })
                        }
                        className="size-4 accent-[#15803D]"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>
          );
        })}
        {err.parts && <p className="text-sm text-destructive">{err.parts}</p>}
        {parts.length < 6 && (
          <Button type="button" variant="outline" className="h-10 border-dashed" onClick={addPart}>
            <Plus data-icon="inline-start" /> Add meal type
          </Button>
        )}
      </fieldset>

      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : plan ? null : (
            <Plus data-icon="inline-start" />
          )}
          {plan ? "Save plan" : "Add plan"}
        </Button>
        {plan && onDone && (
          <Button type="button" variant="outline" className="h-10" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function EditPlanButton({ plan, categories }: { plan: EditablePlan; categories: PlanCategory[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil data-icon="inline-start" /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Edit {plan.name}</DialogTitle>
          <DialogDescription>
            Changes apply to passes sold from now on. Passes already sold keep their rules.
          </DialogDescription>
          <PlanForm plan={plan} categories={categories} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PlanOnSaleSwitch({ id, name, active }: { id: string; name: string; active: boolean }) {
  return (
    <ActionSwitch
      checked={active}
      label={`${name} on sale`}
      action={(next) => setMealPlanActive(id, next)}
      successMessage={(on) => (on ? `${name} is on sale` : `${name} is off sale`)}
    />
  );
}

/* ------------------------------ sell and refund ------------------------------ */

export type SellablePlan = { id: string; name: string; pricePaise: number; summary: string };

export function SellPassForm({
  customerId,
  plans,
  today,
}: {
  customerId: string;
  plans: SellablePlan[];
  today: string;
}) {
  const [state, onSubmit, pending] = useFormAction(sellMealPass, undefined);
  const [formKey, setFormKey] = useState(0);
  const [planId, setPlanId] = useState("");
  useResult(state, "Meal pass sold – the money is in today's sales", () => {
    setFormKey((k) => k + 1);
    setPlanId("");
  });
  const err = state?.fieldErrors ?? {};
  const plan = plans.find((x) => x.id === planId);
  if (!plans.length)
    return <p className="text-sm text-muted-foreground">No plans on sale yet – add one in Meal passes.</p>;
  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="customerId" value={customerId} />
      <FormField id="sell-plan" label="Plan" hint={plan?.summary} error={err.planId}>
        <NativeSelect
          id="sell-plan"
          name="planId"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-10"
          required
        >
          <option value="" disabled>
            Choose…
          </option>
          {plans.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} – {rupees(x.pricePaise)}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="sell-method" label="Paid with" error={err.method}>
        <PayMethodSelect id="sell-method" error={err.method} />
      </FormField>
      <FormField id="sell-start" label="Starts" error={err.startsOn}>
        <Input
          id="sell-start"
          name="startsOn"
          type="date"
          min={today}
          defaultValue={today}
          className="h-10"
          required
        />
      </FormField>
      <div className="sm:col-span-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Ticket data-icon="inline-start" />
          )}
          Sell pass{plan && ` · ${rupees(plan.pricePaise)}`}
        </Button>
      </div>
    </form>
  );
}

export function RefundPassButton({
  pass,
}: {
  pass: { id: string; number: number; pricePaise: number; customerName: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(refundMealPass, undefined);
  useResult(state, `Pass #${pass.number} refunded`, () => setOpen(false));
  const err = state?.fieldErrors ?? {};
  const p = `refund-${pass.id}-`;
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw data-icon="inline-start" /> Refund
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>
            Refund pass #{pass.number} – {pass.customerName}
          </DialogTitle>
          <DialogDescription>
            The pass stops working at once. The refund comes off today&apos;s sales (and the cash drawer, if
            you pay back in cash). Paid {rupees(pass.pricePaise)}.
          </DialogDescription>
          <form onSubmit={onSubmit} className="grid gap-3">
            <input type="hidden" name="passId" value={pass.id} />
            <FormField id={`${p}amount`} label="Refund (₹)" error={err.amount}>
              <Input
                id={`${p}amount`}
                name="amount"
                inputMode="decimal"
                defaultValue={String(toRupees(pass.pricePaise))}
                className="h-10"
                required
              />
            </FormField>
            <FormField id={`${p}method`} label="Paid back with" error={err.method}>
              <PayMethodSelect id={`${p}method`} error={err.method} defaultValue="CASH" />
            </FormField>
            <FormField id={`${p}note`} label="Reason (optional)" error={err.note}>
              <Input id={`${p}note`} name="note" maxLength={200} className="h-10" />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Keep the pass
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                Refund
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------ at billing (staff) ------------------------------ */

const endsLabel = (endsOn: string) => {
  const [y, m, d] = endsOn.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

export type BillingPass = {
  number: number;
  planName: string;
  endsOn: string;
  /** meal type names, and meals left of each */
  parts: string[];
  left: number[];
};

const leftSummary = (pass: { parts: string[]; left: number[] }) =>
  mealsSummary(
    pass.parts.map((name) => ({ name })),
    pass.left,
  );

/** On a "To bill" card: the guest's pass, "Use meal pass" and "Undo meal pass". */
export function MealPassBox({
  pass,
  orderIds,
  passUsed,
  onChanged,
}: {
  pass: BillingPass | undefined;
  orderIds: string[];
  /** these orders already have meal pass lines */
  passUsed: boolean;
  onChanged: () => void;
}) {
  const [choice, setChoice] = useState<MealPassChoice | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  if (!pass && !passUsed) return null;

  const open = () =>
    start(async () => {
      const res = await mealPassChoices(orderIds);
      if (!res.ok) return void toast.error(res.error);
      if (!res.options.length) return void toast.info("Nothing on these orders can use the pass.");
      // start with as many as the pass allows, dearest first; swaps only when staff add them
      const left = [...res.pass.left];
      const next: Record<string, number> = {};
      for (const o of [...res.options].sort((a, b) => b.coverPaise - a.coverPaise)) {
        const n = o.swap ? 0 : Math.min(o.units, left[o.part]);
        left[o.part] -= n;
        next[`${o.orderId}:${o.menuItemId}`] = n;
      }
      setCounts(next);
      // plan dishes first, then swaps
      setChoice({ ...res, options: [...res.options].sort((a, b) => Number(a.swap) - Number(b.swap)) });
    });

  const picked = choice?.options.reduce((s, o) => s + (counts[`${o.orderId}:${o.menuItemId}`] ?? 0), 0) ?? 0;
  const pickedPaise =
    choice?.options.reduce((s, o) => s + (counts[`${o.orderId}:${o.menuItemId}`] ?? 0) * o.coverPaise, 0) ??
    0;

  return (
    <div className="mt-3 rounded-2xl border border-hh-orange/40 bg-hh-orange/10 p-3 text-sm">
      {pass && (
        <p>
          <Ticket className="mr-1 inline size-4 text-brand-text" aria-hidden />
          <span className="font-semibold">Meal pass #{pass.number}</span> · {pass.planName}
          <br />
          <span className="text-muted-foreground">
            {leftSummary(pass)} left · till {endsLabel(pass.endsOn)}
          </span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {pass && (
          <Button size="sm" className="rounded-full" disabled={pending} onClick={open}>
            {pending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Ticket data-icon="inline-start" />
            )}
            Use meal pass
          </Button>
        )}
        {passUsed && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await undoMealPass(orderIds);
                if (!res.ok) return void toast.error(res.error);
                toast.success(`${res.meals} meal${res.meals === 1 ? "" : "s"} back on the pass`);
                onChanged();
              })
            }
          >
            <Undo2 data-icon="inline-start" /> Undo meal pass
          </Button>
        )}
      </div>

      <Dialog open={choice !== null} onOpenChange={(o) => !o && setChoice(null)}>
        <DialogContent>
          <DialogTitle>Use meal pass #{choice?.pass.number}</DialogTitle>
          <DialogDescription>
            Check the guest&apos;s name. Each dish picked comes off the bill (up to the plan&apos;s price) and
            one meal comes off the pass. Left: {choice && leftSummary(choice.pass)}.
            {choice?.options.some((o) => o.swap) &&
              " “Swap” dishes are from other categories – add one only if the guest asks."}
          </DialogDescription>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {choice?.options.map((o) => {
              const key = `${o.orderId}:${o.menuItemId}`;
              const n = counts[key] ?? 0;
              const set = (v: number) =>
                setCounts((c) => ({ ...c, [key]: Math.max(0, Math.min(o.units, v)) }));
              return (
                <li key={key} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {o.name}
                      {o.swap && (
                        <span className="ml-2 rounded-full bg-hh-orange/15 px-2 py-0.5 text-[11px] font-bold text-brand-text">
                          Swap
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{o.orderNumber} · {o.swap ? `counts as a ${o.partName.toLowerCase()}` : o.partName} ·
                      pass pays {rupees(o.coverPaise)} each · {o.units} on order
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`One less ${o.name}`}
                    onClick={() => set(n - 1)}
                    disabled={n === 0}
                  >
                    <Minus />
                  </Button>
                  <span className="w-5 text-center tabular font-bold">{n}</span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`One more ${o.name}`}
                    onClick={() => set(n + 1)}
                    disabled={n === o.units}
                  >
                    <Plus />
                  </Button>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChoice(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || picked === 0}
              onClick={() =>
                start(async () => {
                  if (!choice) return;
                  const res = await applyMealPass(
                    orderIds,
                    choice.options.map((o) => ({
                      orderId: o.orderId,
                      menuItemId: o.menuItemId,
                      count: counts[`${o.orderId}:${o.menuItemId}`] ?? 0,
                    })),
                  );
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(
                    `${res.meals} meal${res.meals === 1 ? "" : "s"} on the pass · ${rupees(res.paise)} off the bill`,
                  );
                  setChoice(null);
                  onChanged();
                })
              }
            >
              {pending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
              Use {picked} meal{picked === 1 ? "" : "s"} · {rupees(pickedPaise)} off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
