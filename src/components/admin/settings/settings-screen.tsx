"use client";

import { Copy, KeyRound, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changeMyPassword,
  createStaff,
  resetStaffPassword,
  saveCafeDetails,
  setCustomerEdits,
  setOrderEdits,
  setStaffActive,
} from "@/app/admin/(dashboard)/settings/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormAction } from "@/hooks/use-form-action";

type Cafe = {
  name: string;
  tagline: string;
  address: string;
  mapUrl: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  hours: { days: string; time: string }[];
  orderingEnabled: boolean;
  todaysPickId: string;
};
type Staff = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  role: "STAFF" | "OWNER";
  active: boolean;
  lastLoginAt: string | null;
};

export function SettingsScreen({
  meId,
  cafe,
  edits,
  staff,
  items,
}: {
  meId: string;
  cafe: Cafe;
  edits: { orders: boolean; customers: boolean };
  staff: Staff[];
  items: { id: string; name: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Tabs defaultValue="cafe" className="mt-6">
        <TabsList>
          <TabsTrigger value="cafe">Café</TabsTrigger>
          <TabsTrigger value="editing">Editing</TabsTrigger>
          <TabsTrigger value="staff">Staff logins</TabsTrigger>
          <TabsTrigger value="password">My password</TabsTrigger>
        </TabsList>
        <TabsContent value="cafe" className="mt-4">
          <CafeForm cafe={cafe} items={items} />
        </TabsContent>
        <TabsContent value="editing" className="mt-4">
          <EditingPanel edits={edits} />
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <StaffPanel staff={staff} meId={meId} />
        </TabsContent>
        <TabsContent value="password" className="mt-4">
          <PasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* ------------------------------ editing ------------------------------ */

function EditingPanel({ edits }: { edits: { orders: boolean; customers: boolean } }) {
  const rows = [
    {
      id: "orders",
      title: "Add and edit orders",
      hint: "Shows “Add order” and “Edit” in Order history: fix items, date and time, guest, or how they paid. The money book and reports update too.",
      checked: edits.orders,
      action: setOrderEdits,
      done: (on: boolean) => (on ? "Order editing is on" : "Order editing is off"),
    },
    {
      id: "customers",
      title: "Add and edit customers",
      hint: "Shows “Add customer” and “Edit details” in Customers: name, phone number and email.",
      checked: edits.customers,
      action: setCustomerEdits,
      done: (on: boolean) => (on ? "Customer editing is on" : "Customer editing is off"),
    },
  ];
  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Keep these off day to day so past records can&apos;t be changed by mistake. Turn one on when you need
        to fix something, then turn it off again. Only owners can edit, and every change is noted in the
        order&apos;s history.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.hint}</p>
          </div>
          <ActionSwitch checked={r.checked} action={r.action} label={r.title} successMessage={r.done} />
        </div>
      ))}
    </section>
  );
}

/* ------------------------------- café ------------------------------- */

function CafeForm({ cafe, items }: { cafe: Cafe; items: { id: string; name: string }[] }) {
  const [state, onSubmit, pending] = useFormAction(saveCafeDetails, undefined);
  const [hours, setHours] = useState(cafe.hours.length ? cafe.hours : [{ days: "", time: "" }]);
  const err = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok) toast.success("Café details saved – the website is updated");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
        <div className="flex-1">
          <Label htmlFor="orderingEnabled" className="text-sm font-semibold">
            Guests can make lists
          </Label>
          <p id="orderingEnabled-hint" className="text-xs text-muted-foreground">
            Off = the QR menu is view-only, with a note to order at the counter.
          </p>
        </div>
        <Switch
          id="orderingEnabled"
          name="orderingEnabled"
          defaultChecked={cafe.orderingEnabled}
          aria-describedby="orderingEnabled-hint"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Café name" error={err.name}>
          <Input
            id="name"
            name="name"
            defaultValue={cafe.name}
            required
            className="h-10"
            aria-invalid={!!err.name}
          />
        </Field>
        <Field id="tagline" label="Tagline" error={err.tagline}>
          <Input id="tagline" name="tagline" defaultValue={cafe.tagline} className="h-10" />
        </Field>
      </div>

      <Field id="address" label="Address" error={err.address}>
        <Input
          id="address"
          name="address"
          defaultValue={cafe.address}
          className="h-10"
          aria-invalid={!!err.address}
        />
      </Field>
      <Field
        id="mapUrl"
        label="Google Maps link"
        hint="In Google Maps: Share → Copy link."
        error={err.mapUrl}
      >
        <Input
          id="mapUrl"
          name="mapUrl"
          type="url"
          defaultValue={cafe.mapUrl}
          className="h-10"
          aria-invalid={!!err.mapUrl}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="phone" label="Phone" error={err.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={cafe.phone}
            className="h-10"
            aria-invalid={!!err.phone}
          />
        </Field>
        <Field id="whatsapp" label="WhatsApp" hint="With country code: 9198…" error={err.whatsapp}>
          <Input
            id="whatsapp"
            name="whatsapp"
            inputMode="numeric"
            defaultValue={cafe.whatsapp}
            className="h-10"
            aria-invalid={!!err.whatsapp}
          />
        </Field>
        <Field id="instagram" label="Instagram" hint="Username, without @" error={err.instagram}>
          <Input
            id="instagram"
            name="instagram"
            defaultValue={cafe.instagram}
            className="h-10"
            aria-invalid={!!err.instagram}
          />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Opening hours</legend>
        {hours.map((h, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name={`hours.${i}.days`}
              aria-label={`Days, row ${i + 1}`}
              defaultValue={h.days}
              placeholder="Mon – Sat"
              className="h-10"
            />
            <Input
              name={`hours.${i}.time`}
              aria-label={`Times, row ${i + 1}`}
              defaultValue={h.time}
              placeholder="7:30 am – 10:30 pm"
              className="h-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove hours row ${i + 1}`}
              onClick={() => setHours((rows) => rows.filter((_, j) => j !== i))}
              disabled={hours.length === 1}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {hours.length < 7 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHours((rows) => [...rows, { days: "", time: "" }])}
          >
            <Plus data-icon="inline-start" /> Add row
          </Button>
        )}
      </fieldset>

      <Field
        id="todaysPickId"
        label="Today's pick"
        hint="Featured at the top of the website."
        error={err.todaysPickId}
      >
        <NativeSelect id="todaysPickId" name="todaysPickId" defaultValue={cafe.todaysPickId} className="h-10">
          <option value="">First item on the menu</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Button type="submit" disabled={pending} className="h-11 rounded-full px-6 font-semibold">
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Save café details
      </Button>
    </form>
  );
}

/* ------------------------------- staff ------------------------------- */

function PasswordReveal({
  shown,
  onClose,
}: {
  shown: { username: string; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!shown} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Password for {shown?.username}</DialogTitle>
        <DialogDescription>
          Give this to them now – it won&apos;t be shown again. They log in at /admin with their username or
          phone.
        </DialogDescription>
        <p className="rounded-xl bg-muted px-4 py-3 text-center tabular text-xl tracking-wider select-all">
          {shown?.password}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(shown?.password ?? "").then(
                () => toast.success("Copied"),
                () => toast.error("Couldn't copy – select the text instead"),
              );
            }}
          >
            <Copy data-icon="inline-start" /> Copy
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffPanel({ staff, meId }: { staff: Staff[]; meId: string }) {
  const [shown, setShown] = useState<{ username: string; password: string } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className={s.active ? "font-semibold" : "font-semibold text-muted-foreground line-through"}>
                {s.name}
                {s.id === meId && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.username}
                {s.phone && ` · ${s.phone}`} · {s.role === "OWNER" ? "Owner" : "Staff"} ·{" "}
                {s.lastLoginAt
                  ? `last login ${new Date(s.lastLoginAt).toLocaleDateString("en-IN")}`
                  : "never logged in"}
              </p>
            </div>
            {s.id !== meId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await resetStaffPassword(s.id);
                      if ("error" in res) toast.error(res.error);
                      else setShown({ username: s.username, password: res.password });
                    })
                  }
                >
                  <KeyRound data-icon="inline-start" /> New password
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.active ? "Can log in" : "Off"}</span>
                  <ActionSwitch
                    checked={s.active}
                    label={`${s.name} can log in`}
                    action={(next) => setStaffActive(s.id, next)}
                    successMessage={(next) =>
                      next ? `${s.name} can log in again` : `${s.name} is logged out and blocked`
                    }
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="mb-3 text-sm font-semibold">Add a login</p>
        <NewStaffForm
          key={formKey}
          onCreated={(username, password) => {
            setShown({ username, password });
            setFormKey((k) => k + 1);
          }}
        />
      </div>
      <PasswordReveal shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function NewStaffForm({ onCreated }: { onCreated: (username: string, password: string) => void }) {
  const [state, onSubmit, pending] = useFormAction(createStaff, undefined);
  const err = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok && state.password && state.username) onCreated(state.username, state.password);
    else if (state?.error) toast.error(state.error);
  }, [state, onCreated]);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field id="staff-name" label="Name" error={err.name}>
        <Input id="staff-name" name="name" required className="h-10" aria-invalid={!!err.name} />
      </Field>
      <Field id="staff-username" label="Username" hint="Lowercase, e.g. counter2" error={err.username}>
        <Input
          id="staff-username"
          name="username"
          required
          autoCapitalize="none"
          className="h-10"
          aria-invalid={!!err.username}
        />
      </Field>
      <Field id="staff-phone" label="Mobile (optional)" hint="They can log in with it too" error={err.phone}>
        <Input
          id="staff-phone"
          name="phone"
          inputMode="numeric"
          maxLength={10}
          className="h-10"
          aria-invalid={!!err.phone}
        />
      </Field>
      <Field id="staff-role" label="Role" hint="Owners can edit everything">
        <NativeSelect id="staff-role" name="role" defaultValue="STAFF" className="h-10">
          <option value="STAFF">Staff – table lists + sold out</option>
          <option value="OWNER">Owner – everything</option>
        </NativeSelect>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          Create login
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------- my password ---------------------------- */

function PasswordForm() {
  const [state, onSubmit, pending] = useFormAction(changeMyPassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const err = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok) {
      toast.success("Password changed. Other devices are logged out.");
      formRef.current?.reset();
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="max-w-sm space-y-4 rounded-3xl border border-border bg-card p-5"
    >
      <Field id="pw-current" label="Current password" error={err.current}>
        <Input
          id="pw-current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
          aria-invalid={!!err.current}
        />
      </Field>
      <Field id="pw-next" label="New password" hint="At least 10 characters" error={err.next}>
        <Input
          id="pw-next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
          className="h-10"
          aria-invalid={!!err.next}
        />
      </Field>
      <Field id="pw-confirm" label="New password again" error={err.confirm}>
        <Input
          id="pw-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="h-10"
          aria-invalid={!!err.confirm}
        />
      </Field>
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Change password
      </Button>
    </form>
  );
}
