import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type MyPaymentsProps = { title?: string; app?: AppHandle };

const THING = "{{param.attach_to}}";
const THING_LABEL = "{{param.attach_to.label_field}}";
const str = (v: unknown) => (v == null ? "" : String(v));
const LABEL: Record<string, string> = { pending: "Waiting for Stripe", paid: "Paid", failed: "Not completed" };

export default function MyPayments({ title = "My payments", app }: MyPaymentsProps) {
  const payments = [...(app?.rows("payment") ?? [])].sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));
  const things = app?.rows(THING) ?? [];
  const [checking, setChecking] = useState("");
  const [waited, setWaited] = useState(false);
  const pendingCount = payments.filter((x) => str(x.status) === "pending").length;

  // Stripe tells the app through a signed webhook; the row updates live.
  useEffect(() => (app ? app.live("payment") : undefined), [app]);
  // A payment still pending a while later: offer the manual check.
  useEffect(() => {
    setWaited(false);
    if (pendingCount === 0) return;
    const t = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(t);
  }, [pendingCount]);

  async function check(id: string) {
    if (!app) return;
    setChecking(id);
    try {
      await app.call("payment-confirm", { payment_id: id });
    } catch {
      // The list stays as it is; the webhook may still land.
    } finally {
      setChecking("");
    }
  }

  const nameOf = (id: unknown) => str(things.find((t) => str(t.id) === str(id))?.[THING_LABEL]) || "Payment";
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {payments.map((p) => (
            <li key={str(p.id)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{nameOf(p.record_id)}</p>
                <p className="text-sm text-muted-foreground">
                  {Number(p.amount).toFixed(2)} {str(p.currency).toUpperCase()}
                  {str(p.paid_at) ? ` · ${new Date(str(p.paid_at)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {waited && str(p.status) === "pending" && (
                  <button type="button" onClick={() => void check(str(p.id))} disabled={checking !== ""} className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60">
                    {checking === str(p.id) ? "Checking" : "Check with Stripe"}
                  </button>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs ${str(p.status) === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{LABEL[str(p.status)] ?? str(p.status)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
