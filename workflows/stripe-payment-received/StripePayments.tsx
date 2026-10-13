import { useEffect, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type StripePaymentsProps = { title?: string; app?: AppHandle };

const str = (v: unknown) => (v == null ? "" : String(v));
const money = (amount: unknown, currency: unknown) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: str(currency) || "USD" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${str(currency)}`;
  }
};
const day = (iso: unknown) => (str(iso) ? new Date(str(iso)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function StripePayments({ title = "Payments", app }: StripePaymentsProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // Stripe's webhook adds rows; follow them live.
  useEffect(() => (app ? app.live("stripe_payment") : undefined), [app]);

  const rows = [...(app?.rows("stripe_payment") ?? [])].sort((a, b) => str(b.paid_at).localeCompare(str(a.paid_at)));
  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  async function check() {
    if (!app) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await app.call<{ checked: number; added: number }>("stripe-sync-payments", {});
      setNote(r.added === 0 ? "You're up to date. No new payments in Stripe." : `${r.added} new payment${r.added === 1 ? "" : "s"} recorded.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} payment{rows.length === 1 ? "" : "s"} recorded{rows.length > 0 ? `, ${money(total, rows[0]?.currency)} in total` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Checking Stripe" : "Check Stripe now"}
        </button>
      </div>
      {note && <p className="rounded-lg bg-muted p-3 text-sm text-foreground">{note}</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CreditCard className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-medium text-foreground">No payments yet</p>
          <p className="text-sm text-muted-foreground">Paid Stripe Checkout sessions appear here as soon as Stripe reports them.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((r) => (
            <li key={str(r.id)} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{str(r.payer_name) || str(r.email) || "Stripe customer"}</p>
                <p className="truncate text-sm text-muted-foreground">{[str(r.description), day(r.paid_at)].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(r.amount, r.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
