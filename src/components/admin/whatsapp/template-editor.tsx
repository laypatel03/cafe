"use client";

import { ChevronRight, LoaderCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveTemplateText } from "@/app/admin/(dashboard)/whatsapp/actions";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";
import { checkTemplateText, fillTemplate } from "@/lib/whatsapp/messages";
import type { TemplateRow } from "@/lib/whatsapp/templates";

// always with a word, never colour alone
const STATUS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-hh-green/15 text-hh-green dark:text-hh-green-light" },
  PENDING: { label: "Meta is reviewing", className: "bg-hh-orange/20 text-brand-text" },
  REJECTED: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  PAUSED: { label: "Paused by Meta", className: "bg-destructive/10 text-destructive" },
  DISABLED: { label: "Disabled by Meta", className: "bg-destructive/10 text-destructive" },
};
const unknown = { label: "Not linked", className: "bg-secondary text-secondary-foreground" };

/** Settings → WhatsApp → Messages: each template's wording, its Meta status, and an editor. */
export function TemplateEditors({ rows }: { rows: TemplateRow[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {rows.map((r) => (
        <TemplateEditor key={r.key} row={r} />
      ))}
    </div>
  );
}

function TemplateEditor({ row }: { row: TemplateRow }) {
  const [state, onSubmit, pending] = useFormAction(saveTemplateText, undefined);
  const [body, setBody] = useState(row.body);
  const [footer, setFooter] = useState(row.footer);
  useEffect(() => {
    if (state?.ok)
      toast.success(`${row.label}: sent to Meta – guests get the old wording until it's approved`);
    else if (state?.error) toast.error(state.error);
  }, [state, row.label]);
  const status = row.linked
    ? (STATUS[row.status] ?? { label: row.status, className: unknown.className })
    : unknown;
  const changed = body.trim() !== row.body.trim() || footer.trim() !== row.footer.trim();
  const problem = changed ? checkTemplateText(row.key, body, footer) : null;
  const reviewing = row.status === "PENDING";
  const err = state?.fieldErrors ?? {};

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        <span className="font-semibold">{row.label}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.className)}>
          {status.label}
        </span>
      </summary>
      <form onSubmit={onSubmit} className="space-y-3 border-t border-border p-3">
        <input type="hidden" name="key" value={row.key} />
        {row.reason && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Meta&apos;s reason: {row.reason.toLowerCase().replaceAll("_", " ")}
          </p>
        )}
        {row.error && <p className="text-sm text-destructive">Couldn&apos;t check with Meta: {row.error}</p>}
        {!row.linked && (
          <p className="text-sm text-muted-foreground">
            Add this template&apos;s ID from WhatsApp Manager to .env to edit it here.
          </p>
        )}
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {row.vars.map((v, i) => (
            <li key={v} className="rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground">
              <code className="font-semibold">{`{{${i + 1}}}`}</code> = {v}
            </li>
          ))}
        </ul>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <FormField id={`wa-body-${row.key}`} label="Message" error={err.body}>
              <Textarea
                id={`wa-body-${row.key}`}
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={1024}
                disabled={!row.linked || reviewing}
                className="font-mono text-sm"
              />
            </FormField>
            <FormField
              id={`wa-footer-${row.key}`}
              label="Footer (small grey line, optional)"
              error={err.footer}
            >
              <Input
                id={`wa-footer-${row.key}`}
                name="footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={60}
                disabled={!row.linked || reviewing}
                className="h-10"
              />
            </FormField>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Preview (sample values)</p>
            <div className="rounded-2xl bg-[#e7ffdb] p-3 text-sm whitespace-pre-line text-[#111b21] shadow-sm">
              {fillTemplate(body, row.samples)}
              {footer && <p className="mt-2 text-xs text-[#667781]">{footer}</p>}
            </div>
          </div>
        </div>
        {problem && <p className="text-sm font-semibold text-destructive">{problem}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            className="rounded-full"
            disabled={!row.linked || reviewing || !changed || !!problem || pending}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Send to Meta for approval
          </Button>
          {changed && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setBody(row.body);
                setFooter(row.footer);
              }}
            >
              Undo changes
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {reviewing
              ? "Meta is reviewing a change – usually minutes, sometimes up to a day. Guests get the old wording meanwhile."
              : "Meta checks every change (usually minutes) and allows one change a day. Guests get the old wording until it's approved."}
          </p>
        </div>
      </form>
    </details>
  );
}
