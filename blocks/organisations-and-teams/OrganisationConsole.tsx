import { useEffect, useState } from "react";
import { Building2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type OrganisationConsoleProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const PEOPLE = "{{param.member_role}}";
const PEOPLE_LABEL = "{{param.member_role.label_field}}";
const ROLES = ["owner", "admin", "member"] as const;
const str = (v: unknown) => (v == null ? "" : String(v));

export default function OrganisationConsole({ title = "Organisation", app }: OrganisationConsoleProps) {
  const orgId = app?.params?.id ?? "";
  const me = app?.me(PEOPLE) ?? "";
  const people = app?.rows(PEOPLE) ?? [];
  const [org, setOrg] = useState<Row | null>(null);
  const [members, setMembers] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Row[]>([]);
  const [invites, setInvites] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [teamName, setTeamName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const rev = (app?.revision("membership") ?? 0) + (app?.revision("team") ?? 0) + (app?.revision("invitation") ?? 0);

  useEffect(() => (app ? app.live("membership") : undefined), [app]);
  useEffect(() => {
    if (!app || !orgId) return;
    let live = true;
    const where = { organisation_id: orgId };
    Promise.all([
      app.get("organisation", orgId),
      app.query("membership", { where, limit: 200 }),
      app.query("team", { where, limit: 100 }),
      app.query("invitation", { where, sort: { field: "created_at", dir: "desc" }, limit: 50 }),
    ])
      .then(([o, m, t, i]) => { if (!live) return; setOrg(o); setMembers(m.rows); setTeams(t.rows); setInvites(i.rows); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [app, orgId, rev]);

  const nameOf = (id: unknown) => str(people.find((p) => str(p.id) === str(id))?.[PEOPLE_LABEL]) || "Member";
  const teamName0 = (id: unknown) => str(teams.find((t) => str(t.id) === str(id))?.name);
  const mine = members.find((m) => str(m.member_id) === me);
  const isAdmin = str(org?.owner_id) === me || str(mine?.role) === "owner" || str(mine?.role) === "admin";

  async function run(label: string, fn: () => Promise<unknown>) {
    setError(""); setNote("");
    try { await fn(); setNote(label); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  if (!orgId) return <p className="p-6 text-sm text-muted-foreground">Open an organisation to manage it.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="flex items-start gap-3">
        <Building2 className="mt-1 h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{str(org?.name) || title}</h1>
          {str(org?.about) && <p className="text-sm text-muted-foreground">{str(org?.about)}</p>}
          <p className="text-sm text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}{mine ? ` · you are ${str(mine.role)}` : ""}</p>
        </div>
      </header>
      {note && <p className="rounded-lg bg-muted p-3 text-sm text-foreground">{note}</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users className="h-4 w-4" /> Members</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {members.map((m) => (
            <li key={str(m.id)} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{nameOf(m.member_id)}{str(m.member_id) === me ? " (you)" : ""}</p>
                {teamName0(m.team_id) && <p className="text-sm text-muted-foreground">{teamName0(m.team_id)}</p>}
              </div>
              {isAdmin && str(m.role) !== "owner" ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Role of ${nameOf(m.member_id)}`}
                    value={str(m.role)}
                    onChange={(e) => void run("Role updated.", () => app!.update("membership", str(m.id), { role: e.target.value }))}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                  >
                    {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="button" aria-label={`Remove ${nameOf(m.member_id)}`} onClick={() => void run("Removed.", () => app!.remove("membership", str(m.id)))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{str(m.role)}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Teams</h2>
        {teams.length === 0 ? <p className="text-sm text-muted-foreground">No teams yet.</p> : (
          <ul className="flex flex-wrap gap-2">
            {teams.map((t) => <li key={str(t.id)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">{str(t.name)}</li>)}
          </ul>
        )}
        {isAdmin && (
          <form onSubmit={(e) => { e.preventDefault(); if (teamName.trim()) void run("Team added.", async () => { await app!.create("team", { organisation_id: orgId, name: teamName.trim() }); setTeamName(""); }); }} className="flex gap-2">
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New team name" aria-label="New team name" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">Add team</button>
          </form>
        )}
      </section>

      {isAdmin && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><UserPlus className="h-4 w-4" /> Invite someone</h2>
          <form onSubmit={(e) => { e.preventDefault(); void run(`Invitation sent to ${email}.`, async () => { await app!.create("invitation", { organisation_id: orgId, email: email.trim(), role: inviteRole, status: "pending", invited_by: me }); setEmail(""); }); }} className="flex flex-wrap gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" aria-label="Email" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} aria-label="Role" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">Send invite</button>
          </form>
          {invites.length > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
              {invites.map((i) => (
                <li key={str(i.id)} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="flex min-w-0 items-center gap-2 truncate text-foreground"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{str(i.email)}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {str(i.status)}
                    {str(i.status) === "pending" && (
                      <button type="button" onClick={() => void run("Invitation withdrawn.", () => app!.remove("invitation", str(i.id)))} className="underline hover:text-foreground">Withdraw</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
