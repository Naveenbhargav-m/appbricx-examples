import { useEffect, useState } from "react";
import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type BillingPanelProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const str = (v: unknown) => (v == null ? "" : String(v));
const price = (p: Row) => {
  const n = Number(p.price);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: str(p.currency).toUpperCase() || "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `${n}`;
  }
};
const LABEL: Record<string, string> = { pending: "Waiting for payment", active: "Active", past_due: "Payment overdue", canceled: "Cancelled" };

export default function BillingPanel({ title = "Plans and billing", app }: BillingPanelProps) {
  const plans = (app?.rows("plan") ?? []).filter((p) => p.active !== false).sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0) || Number(a.price ?? 0) - Number(b.price ?? 0));
  const subs = [...(app?.rows("subscription") ?? [])].sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));
  const current = subs.find((s) => str(s.status) === "active" || str(s.status) === "past_due");
  const pending = subs.find((s) => str(s.status) === "pending");
  const [link, setLink] = useState<{ url: string; label: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [waited, setWaited] = useState(false);

  // Stripe tells the app (a signed webhook) and the row updates live; the
  // server decides, the browser never does.
  useEffect(() => (app ? app.live("subscription") : undefined), [app]);
  // Still pending a while after coming back: offer the manual check.
  useEffect(() => {
    setWaited(false);
    if (!pending) return;
    const t = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(t);
  }, [pending]);

  async function checkNow() {
    if (!app || !pending) return;
    setChecking(true); setError("");
    try {
      await app.call("subscription-sync", { subscription_id: str(pending.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }

  async function go(kind: "checkout" | "portal", planId?: string) {
    if (!app) return;
    setBusy(planId ?? kind); setError(""); setLink(null);
    try {
      const r = kind === "checkout"
        ? await app.call<{ url: string }>("subscription-checkout", { plan_id: planId })
        : await app.call<{ url: string }>("billing-portal", { subscription_id: str(current?.id) });
      setLink({ url: r.url, label: kind === "checkout" ? "Continue to secure checkout" : "Open billing settings" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const currentPlan = plans.find((p) => str(p.id) === str(current?.plan_id));
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {current ? (
          <p className="text-sm text-muted-foreground">
            {str(currentPlan?.name) || "Your plan"}: {LABEL[str(current.status)] ?? str(current.status)}
            {str(current.current_period_end) ? `, renews ${new Date(str(current.current_period_end)).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}.
          </p>
        ) : pending ? (
          <p className="text-sm text-muted-foreground">
            Finishing your checkout. This page updates as soon as Stripe confirms the payment.
            {waited && (
              <button type="button" onClick={() => void checkNow()} disabled={checking} className="ml-2 font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60">
                {checking ? "Checking" : "Check with Stripe"}
              </button>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Pick a plan. You can change or cancel it any time.</p>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {link && (
        <a href={link.url} rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary/5 p-4 font-medium text-foreground">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> {link.label}</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No plans yet. They appear here once they're set up.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const mine = str(p.id) === str(current?.plan_id);
            return (
              <li key={str(p.id)} className={`flex flex-col rounded-xl border bg-card p-5 ${mine ? "border-primary" : "border-border"}`}>
                <p className="flex items-center gap-2 font-semibold text-foreground">{str(p.name)}{mine && <Sparkles className="h-4 w-4 text-primary" />}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{price(p)}<span className="text-sm font-normal text-muted-foreground"> / {str(p.interval) || "month"}</span></p>
                {str(p.description) && <p className="mt-2 text-sm text-muted-foreground">{str(p.description)}</p>}
                <ul className="mt-3 flex-1 space-y-1 text-sm text-foreground">
                  {str(p.features).split(/\n|;/).map((f) => f.trim()).filter(Boolean).map((f) => (
                    <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>
                  ))}
                </ul>
                {mine ? (
                  <button type="button" onClick={() => void go("portal")} disabled={busy !== ""} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60">
                    {busy === "portal" ? "Opening" : "Manage billing"}
                  </button>
                ) : (
                  <button type="button" onClick={() => void go("checkout", str(p.id))} disabled={busy !== "" || Boolean(current)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                    {busy === str(p.id) ? "Preparing checkout" : current ? "Switch in billing settings" : `Choose ${str(p.name)}`}
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
