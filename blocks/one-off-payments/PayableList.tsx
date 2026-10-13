import { useState } from "react";
import { CheckCircle, CreditCard, ExternalLink } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type PayableListProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const THING = "{{param.attach_to}}";
const THING_LABEL = "{{param.attach_to.label_field}}";
const PRICE = "{{param.price_field}}";
const PAYER = "{{param.payer_role}}";
const PAYER_REF = "{{param.payer_ref}}";
const CURRENCY = "{{param.currency}}";

const str = (v: unknown) => (v == null ? "" : String(v));
const money = (n: number) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY.toUpperCase() }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

export default function PayableList({ title = "Pay", app }: PayableListProps) {
  const me = app?.me(PAYER) ?? "";
  const things = (app?.rows(THING) ?? []).filter((r) => !PAYER_REF || str(r[PAYER_REF]) === me);
  const payments = app?.rows("payment") ?? [];
  const [link, setLink] = useState<{ url: string; label: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const stateOf = (id: unknown) => {
    const mine = payments.filter((p) => str(p.record_id) === str(id));
    if (mine.some((p) => str(p.status) === "paid")) return "paid";
    if (mine.some((p) => str(p.status) === "pending")) return "pending";
    return "due";
  };

  async function pay(r: Row) {
    if (!app) return;
    setBusy(str(r.id)); setError(""); setLink(null);
    try {
      const res = await app.call<{ url: string }>("payment-checkout", { record_id: str(r.id) });
      setLink({ url: res.url, label: `Pay for ${str(r[THING_LABEL]) || "this"} on secure checkout` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const priced = things.filter((r) => Number(r[PRICE]) > 0);
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Pay securely with card through Stripe. Your receipt shows up under My payments.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {link && (
        <a href={link.url} rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary/5 p-4 font-medium text-foreground">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> {link.label}</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {priced.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing to pay right now.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {priced.map((r) => {
            const state = stateOf(r.id);
            return (
              <li key={str(r.id)} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{str(r[THING_LABEL]) || "Item"}</p>
                  <p className="text-sm text-muted-foreground">{money(Number(r[PRICE]))}</p>
                </div>
                {state === "paid" ? (
                  <span className="inline-flex items-center gap-1 text-sm text-foreground"><CheckCircle className="h-4 w-4 text-primary" /> Paid</span>
                ) : (
                  <button type="button" disabled={busy !== ""} onClick={() => void pay(r)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
                    {busy === str(r.id) ? "Preparing" : state === "pending" ? "Try again" : `Pay ${money(Number(r[PRICE]))}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
