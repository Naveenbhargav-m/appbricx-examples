import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type CommentThreadProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const SUBJECT = "{{param.attach_to}}";
const SUBJECT_LABEL = "{{param.attach_to.label_field}}";
const PEOPLE = "{{param.author_role}}";
const PEOPLE_LABEL = "{{param.author_role.label_field}}";
/** Organisation scope (optional param): the subject's organisation ref. */
const ORG_FIELD: string = "{{param.org_field}}";

const str = (v: unknown) => (v == null ? "" : String(v));
const ago = (iso: string, now: number) => {
  const t = new Date(iso).getTime();
  if (!iso || !Number.isFinite(t) || !now) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function CommentThread({ title = "Discussion", app }: CommentThreadProps) {
  const routeId = app?.params?.id ?? "";
  const subjects = app?.rows(SUBJECT) ?? [];
  const people = app?.rows(PEOPLE) ?? [];
  const me = app?.me(PEOPLE) ?? "";
  const [picked, setPicked] = useState("");
  const subjectId = routeId || picked || str(subjects[0]?.id);
  const [comments, setComments] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [mentioned, setMentioned] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const box = useRef<HTMLTextAreaElement | null>(null);
  const revision = app?.revision("comment") ?? 0;

  useEffect(() => setNow(Date.now()), [revision]);
  useEffect(() => (app ? app.live("comment") : undefined), [app]);
  useEffect(() => {
    if (!app || !subjectId) { setComments([]); return; }
    let live = true;
    app.query("comment", { where: { subject_id: subjectId }, sort: { field: "created_at", dir: "asc" }, limit: 200 })
      .then((r) => { if (live) setComments(r.rows); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [app, subjectId, revision]);

  const nameOf = (id: unknown) => str(people.find((p) => str(p.id) === str(id))?.[PEOPLE_LABEL]) || "Someone";
  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: unknown) => comments.filter((c) => str(c.parent_id) === str(id));

  // @mention suggestions: the word being typed after "@".
  const query = useMemo(() => /(?:^|\s)@([\p{L}\p{N}_-]{1,30})$/u.exec(text)?.[1]?.toLowerCase() ?? "", [text]);
  const suggestions = query ? people.filter((p) => str(p[PEOPLE_LABEL]).toLowerCase().includes(query)).slice(0, 5) : [];

  function mention(p: Row) {
    const name = str(p[PEOPLE_LABEL]);
    setText((t) => t.replace(/@([\p{L}\p{N}_-]{1,30})$/u, `@${name} `));
    setMentioned((m) => (m.includes(str(p.id)) ? m : [...m, str(p.id)]));
    box.current?.focus();
  }

  async function send() {
    if (!app || !text.trim()) return;
    setError("");
    const body = text.trim();
    const mentions = mentioned.filter((id) => body.includes(`@${nameOf(id)}`)).join(",");
    try {
      if (editing) {
        await app.update("comment", str(editing.id), { body, mentions, edited_at: new Date().toISOString() });
      } else {
        const org = ORG_FIELD ? str(subjects.find((x) => str(x.id) === subjectId)?.[ORG_FIELD]) : "";
        await app.create("comment", { subject_id: subjectId, author_id: me, body, mentions, ...(org ? { organisation_id: org } : {}), ...(replyTo ? { parent_id: str(replyTo.parent_id) || str(replyTo.id) } : {}) });
      }
      setText(""); setReplyTo(null); setEditing(null); setMentioned([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(c: Row) {
    if (!app) return;
    try { await app.remove("comment", str(c.id)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  const item = (c: Row, reply: boolean) => {
    const mine = !!me && str(c.author_id) === me;
    return (
      <li key={str(c.id)} className={reply ? "ml-8 border-l border-border pl-4" : ""}>
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-foreground">{nameOf(c.author_id)}</span>
          <span className="text-xs text-muted-foreground">{ago(str(c.created_at), now)}{c.edited_at ? " · edited" : ""}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{str(c.body)}</p>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <button type="button" className="hover:text-foreground" onClick={() => { setReplyTo(c); setEditing(null); box.current?.focus(); }}>Reply</button>
          {mine && (
            <>
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { setEditing(c); setReplyTo(null); setText(str(c.body)); box.current?.focus(); }}>
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button type="button" className="inline-flex items-center gap-1 hover:text-destructive" onClick={() => void remove(c)}>
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {!routeId && subjects.length > 0 && (
          <select
            aria-label="What to discuss"
            value={subjectId}
            onChange={(e) => setPicked(e.target.value)}
            className="max-w-[16rem] rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {subjects.map((s) => (
              <option key={str(s.id)} value={str(s.id)}>{str(s[SUBJECT_LABEL]) || str(s.id)}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {!subjectId ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing to discuss yet.</p>
      ) : roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No comments yet. Start the conversation below.</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {roots.map((c) => (
            <li key={str(c.id)}>
              <ul className="space-y-3">
                {item(c, false)}
                {repliesOf(c.id).map((r) => item(r, true))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {subjectId && me && (
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="space-y-2 rounded-xl border border-border bg-card p-3"
        >
          {(replyTo || editing) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{editing ? "Editing your comment" : `Replying to ${nameOf(replyTo?.author_id)}`}</span>
              <button type="button" aria-label="Cancel" onClick={() => { setReplyTo(null); setEditing(null); setText(""); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <textarea
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Write a comment. Type @ to mention someone."
            aria-label="Comment"
            className="w-full resize-y rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
          {suggestions.length > 0 && (
            <ul className="rounded-lg border border-border bg-background text-sm">
              {suggestions.map((p) => (
                <li key={str(p.id)}>
                  <button type="button" className="w-full px-3 py-1.5 text-left hover:bg-muted" onClick={() => mention(p)}>
                    @{str(p[PEOPLE_LABEL])}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={!text.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" /> {editing ? "Save" : replyTo ? "Reply" : "Comment"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
