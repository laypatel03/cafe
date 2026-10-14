"use client";

import { LoaderCircle, Pencil, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addCustomer, updateCustomer } from "@/app/admin/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";

type Details = { id: string; name: string; phone: string; email: string | null };

/** "Add customer" on Customers (owner switch on). Opens their page once added. */
export function AddCustomerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="rounded-full" onClick={() => setOpen(true)}>
        <UserPlus data-icon="inline-start" /> Add customer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && <CustomerForm onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "Edit details" on a customer's page (owner switch on). */
export function EditCustomerButton({ customer }: { customer: Details }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <Pencil data-icon="inline-start" /> Edit details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && <CustomerForm customer={customer} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerForm({ customer, onClose }: { customer?: Details; onClose: () => void }) {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction(customer ? updateCustomer : addCustomer, undefined);
  const err = state?.fieldErrors ?? {};
  const editing = !!customer;
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (state?.ok) {
      toast.success(editing ? "Customer details saved" : "Customer added");
      close.current();
      if (!editing && state.id) router.push(`/admin/customers/${state.id}`);
      else router.refresh();
    } else if (state?.error) toast.error(state.error);
  }, [state, editing, router]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <DialogTitle className="text-xl">{customer ? `Edit ${customer.name}` : "Add a customer"}</DialogTitle>
        <DialogDescription>
          {customer
            ? "Fix the name, number or email. Their past orders and bills show the new details."
            : "A regular who hasn't ordered online yet. Their visits are counted once their orders use this number."}
        </DialogDescription>
      </div>
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <Field id="cu-name" label="Name" error={err.name}>
        <Input
          id="cu-name"
          name="name"
          defaultValue={customer?.name}
          maxLength={60}
          required
          className="h-10"
        />
      </Field>
      <Field id="cu-phone" label="Mobile number" error={err.phone}>
        <Input
          id="cu-phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          defaultValue={customer?.phone}
          maxLength={14}
          required
          placeholder="10-digit mobile"
          className="h-10"
        />
      </Field>
      <Field id="cu-email" label="Email (optional)" error={err.email}>
        <Input
          id="cu-email"
          name="email"
          type="email"
          defaultValue={customer?.email ?? ""}
          maxLength={120}
          className="h-10"
        />
      </Field>
      {!customer && (
        <Field id="cu-notes" label="Staff notes (optional)" error={err.notes}>
          <Textarea
            id="cu-notes"
            name="notes"
            rows={2}
            maxLength={1000}
            placeholder="Allergies, favourite table, likes extra chutney…"
          />
        </Field>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {customer ? "Save" : "Add customer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
