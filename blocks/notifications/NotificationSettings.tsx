import { useEffect, useState } from "react";
import { Mail, MessageSquare, Bell } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type NotificationSettingsProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const PEOPLE = "{{param.recipient_role}}";
const str = (v: unknown) => (v == null ? "" : String(v));

function Toggle({ label, hint, on, onChange, icon: Icon }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; icon: typeof Bell }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <span>
          <span className="block font-medium text-foreground">{label}</span>
          <span className="block text-sm text-muted-foreground">{hint}</span>
        </span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]" />
    </label>
  );
}

export default function NotificationSettings({ title = "Notifications", app }: NotificationSettingsProps) {
  const me = app?.me(PEOPLE) ?? "";
  const [pref, setPref] = useState<Row | null>(null);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!app || !me) return;
    let live = true;
    app.query("notification_preference", { where: { person_id: me }, limit: 1 })
      .then((r) => {
        if (!live) return;
        const p = r.rows[0] ?? null;
        setPref(p);
        if (p) { setEmail(p.email !== false); setSms(p.sms === true); setPhone(str(p.phone)); }
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [app, me]);

  async function save() {
    if (!app || !me) return;
    setError(""); setSaved("");
    const values = { email, sms, phone: phone.trim() };
    try {
      if (pref) await app.update("notification_preference", str(pref.id), values);
      else setPref(await app.create("notification_preference", { person_id: me, ...values }));
      setSaved("Saved. We'll reach you this way from now on.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Choose how we reach you. Everything also lands in your inbox here.</p>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
        <Toggle icon={Bell} label="In the app" hint="Always on: your inbox keeps every update." on onChange={() => undefined} />
        <Toggle icon={Mail} label="Email" hint="A copy of each update by email." on={email} onChange={setEmail} />
        <Toggle icon={MessageSquare} label="Text message" hint="Short updates by SMS, when the app has texting set up." on={sms} onChange={setSms} />
      </div>
      {sms && (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Mobile number</span>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" />
        </label>
      )}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-lg bg-muted p-3 text-sm text-foreground">{saved}</p>}
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save preferences</button>
    </form>
  );
}
