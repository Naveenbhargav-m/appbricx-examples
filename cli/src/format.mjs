// Human output for the reports. `--json` bypasses all of this and prints
// the server's body as is (what scripts and agents should read).

const MARK = /** @type {const} */ ({ pass: "✓", fail: "✗", warn: "⚠", skipped: "○" });

/** @param {string} status */
function mark(status) {
  return /** @type {Record<string, string>} */ (MARK)[status] ?? "·";
}

/**
 * The check/apply report (contract/index.ts ContractReport).
 * @param {{ ok: boolean, errors: string[], fixes: string[], warnings: string[], summary: any }} r
 * @returns {string}
 */
export function formatContractReport(r) {
  const out = [];
  out.push(r.ok ? "✓ contract is valid" : `✗ contract has ${r.errors.length} error(s)`);
  for (const e of r.errors) out.push(`  ✗ ${e}`);
  if (r.summary) {
    const s = r.summary;
    out.push(`  app: ${s.app}`);
    out.push(`  roles: ${s.roles.join(", ") || "(none)"}`);
    out.push(`  tables: ${s.entities.map((/** @type {any} */ e) => `${e.name}(${e.fields.length} fields, ${e.rows} rows)`).join(", ")}`);
    out.push(`  pages: ${s.pages.map((/** @type {any} */ p) => p.route).join(", ")}`);
    if (s.workflows.length > 0) out.push(`  workflows: ${s.workflows.map((/** @type {any} */ w) => `${w.id} (${w.trigger} → ${w.actions.join("+")})`).join(", ")}`);
  }
  if (r.fixes.length > 0) {
    out.push(`  the normalizer filled in ${r.fixes.length} thing(s) — make them explicit in the contract if they matter:`);
    for (const f of r.fixes) out.push(`    · ${f}`);
  }
  for (const w of r.warnings) out.push(`  ⚠ ${w}`);
  return out.join("\n");
}

/**
 * The verify report (verify/index.ts VerifyReport).
 * @param {{ project: string, status: string, ms: number, stages: Array<{ stage: string, status: string, reason?: string, checks?: Array<{ id: string, status: string, evidence: string, fix?: string, items?: string[] }> }> }} r
 * @returns {string}
 */
export function formatVerifyReport(r) {
  const out = [`${r.status === "pass" ? "✓" : "✗"} verify ${r.status} — ${r.project} (${(r.ms / 1000).toFixed(1)}s)`];
  for (const s of r.stages) {
    out.push(`  ${mark(s.status)} ${s.stage}${s.reason ? ` — ${s.reason}` : ""}`);
    for (const c of s.checks ?? []) {
      out.push(`    ${mark(c.status)} ${c.id}: ${c.evidence}`);
      for (const i of c.items ?? []) out.push(`        - ${i}`);
      if (c.fix && (c.status === "fail" || c.status === "warn")) out.push(`        fix: ${c.fix}`);
    }
  }
  return out.join("\n");
}

/**
 * The `sql` answer: what ran, the rows, and the snapshot taken first.
 * @param {Record<string, any>} r
 * @returns {string}
 */
export function formatSqlResult(r) {
  const out = [];
  if (r.snapshotId) out.push(`snapshot ${r.snapshotId} taken first (undo: appbricx snapshots restore ${r.snapshotId})`);
  if (r.statements.length > 1) {
    for (const s of r.statements) out.push(`  ${s.command ?? "·"} ${s.rowCount ?? ""}  ${s.sql.replace(/\s+/g, " ").slice(0, 80)}`);
  }
  if (r.rows.length > 0) out.push(formatRows(r.rows));
  out.push(`${r.readOnly ? "read" : "✓ wrote"} on ${r.env}: ${r.rowCount} row(s)${r.truncated ? " (showing the first 1000)" : ""} in ${r.durationMs} ms`);
  return out.join("\n");
}

/**
 * The `rows` answer: one line per failed row and a total.
 * @param {Record<string, any>} r
 * @returns {string}
 */
export function formatRowsResult(r) {
  const out = [`${r.failed === 0 ? "✓" : "✗"} ${r.op} ${r.table} on ${r.env}: ${r.succeeded} ok, ${r.failed} failed`];
  for (const x of r.results) if (!x.ok) out.push(`  ✗ ${x.id ?? "row"}: ${x.error}${x.code ? ` [${x.code}]` : ""}`);
  if (r.snapshotId) out.push(`  snapshot ${r.snapshotId} taken first`);
  return out.join("\n");
}

/**
 * The `schema` answer: one block per table, then views and functions.
 * @param {Record<string, any>} r
 * @returns {string}
 */
export function formatSchema(r) {
  const out = [`${r.env}: ${r.summary.tables} tables (${r.summary.contractTables} contract, ${r.summary.handMadeTables} hand-made), ${r.summary.views} views, ${r.summary.functions} functions, ${r.summary.triggers} triggers`];
  for (const t of r.tables) {
    if (t.internal) continue;
    out.push(`${t.name}  [${t.origin}]${t.rls ? "  rls" : ""}`);
    for (const c of t.columns) out.push(`  ${c.name}  ${c.type}${c.nullable ? "" : " not null"}${c.default ? ` = ${c.default}` : ""}${c.managedByContract === false ? "  (hand-made)" : ""}`);
    for (const f of t.foreignKeys) out.push(`  fk ${f.columns.join(", ")} → ${f.references.table}(${f.references.columns.join(", ")})`);
    for (const i of t.indexes) if (!i.primary) out.push(`  index ${i.name}${i.unique ? " (unique)" : ""}`);
    for (const g of t.triggers) out.push(`  trigger ${g.name} → ${g.function}()`);
  }
  const internal = r.tables.filter((/** @type {any} */ t) => t.internal).map((/** @type {any} */ t) => t.name);
  if (internal.length > 0) out.push(`internal: ${internal.join(", ")}`);
  for (const v of r.views) out.push(`view ${v.name}${v.materialized ? " (materialized)" : ""}`);
  for (const f of r.functions) out.push(`function ${f.name}(${f.args}) → ${f.returns}`);
  return out.join("\n");
}

/**
 * The `tail` answer: one line per event or request.
 * @param {Record<string, any>} r
 * @returns {string}
 */
export function formatTail(r) {
  if (r.kind === "events") {
    const ev = r.events ?? [];
    if (ev.length === 0) return "(no recent events)";
    return ev.map((/** @type {any} */ e) => (e.kind === "topic" ? `${e.at}  topic ${e.topic}` : `${e.at}  ${e.op} ${e.table}${e.rowPk ? ` ${e.rowPk}` : ""}${e.env ? `  (${e.env})` : ""}`)).join("\n");
  }
  const rq = r.requests ?? [];
  if (rq.length === 0) return r.kind === "errors" ? "(no errors)" : "(no requests logged)";
  return rq.map((/** @type {any} */ x) => `${x.at}  ${x.status}  ${x.method} ${x.path}  ${x.ms} ms${x.error ? `  ${x.error}` : ""}`).join("\n");
}

/**
 * Rows as an aligned text table (wide values truncated).
 * @param {Array<Record<string, unknown>>} rows
 * @returns {string}
 */
export function formatRows(rows) {
  if (rows.length === 0) return "(no rows)";
  const cols = Object.keys(rows[0] ?? {}).filter((c) => !["user_id", "created_by", "updated_at"].includes(c));
  const cell = (/** @type {unknown} */ v) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return s.length > 36 ? `${s.slice(0, 35)}…` : s;
  };
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length)));
  const line = (/** @type {string[]} */ vals) => vals.map((v, i) => v.padEnd(widths[i] ?? 0)).join("  ");
  return [line(cols), line(widths.map((w) => "-".repeat(w))), ...rows.map((r) => line(cols.map((c) => cell(r[c]))))].join("\n");
}

/**
 * Search results, one template per line.
 * @param {Array<Record<string, any>>} list
 * @returns {string}
 */
export function formatTemplateList(list) {
  if (list.length === 0) return "(no templates match: try fewer words or no filters)";
  const w = Math.max(...list.map((t) => String(t.slug).length));
  return [
    ...list.map((t) => `${String(t.slug).padEnd(w)}  ${String(t.kind).padEnd(9)}  ${t.summary}`),
    "",
    "appbricx templates show <slug> for what it adds and its params",
  ].join("\n");
}

/**
 * One template: what it adds, params, setup, how to use it.
 * @param {Record<string, any>} t
 * @returns {string}
 */
export function formatTemplate(t) {
  const out = [`${t.title} (${t.kind}, ${t.category_label})`, t.description ?? t.summary, ""];
  const a = t.adds ?? {};
  if (a.tables?.length) out.push(`tables:     ${a.tables.map((/** @type {any} */ x) => x.name).join(", ")}`);
  if (a.extends?.length) out.push(`fields:     ${a.extends.map((/** @type {any} */ x) => `${x.entity}.${x.fields.join(`, ${x.entity}.`)}`).join(", ")}`);
  if (a.roles?.length) out.push(`roles:      ${a.roles.map((/** @type {any} */ x) => x.id).join(", ")}`);
  if (a.pages?.length) out.push(`pages:      ${a.pages.map((/** @type {any} */ x) => x.route).join(", ")}`);
  if (a.workflows?.length) out.push(`workflows:  ${a.workflows.map((/** @type {any} */ x) => x.id).join(", ")}`);
  if (a.components?.length) out.push(`components: ${a.components.map((/** @type {any} */ x) => x.name).join(", ")}`);
  if (t.params?.length) {
    out.push("", "params:");
    for (const p of t.params) out.push(`  ${p.name} (${p.type}${p.required === false || p.default !== undefined ? ", optional" : ""}): ${p.description}`);
  }
  const req = t.requires ?? {};
  if (req.secrets?.length || req.integrations?.length) out.push("", `needs: ${[...(req.secrets ?? []), ...(req.integrations ?? []).map((/** @type {string} */ i) => `${i} integration`)].join(", ")}`);
  if (t.demo_url) out.push("", `live demo: ${t.demo_url}`);
  if (t.use?.cli) out.push("", `use it: ${t.use.cli}`);
  return out.join("\n");
}

/**
 * The answer of templates use (applied or dry run).
 * @param {Record<string, any>} r
 * @returns {string}
 */
export function formatTemplateUse(r) {
  const out = [];
  if (r.dry_run) out.push(`dry run: ${r.template}${r.project_id ? ` → project ${r.project_id}` : " → a new project"} (nothing changed)`);
  else if (r.created) out.push(`✓ created ${r.project?.name} (${r.project?.id}) from ${r.template} and linked this directory`);
  else out.push(`✓ added ${r.template} to ${r.project_id} (dev)`);
  if (r.params && Object.keys(r.params).length) out.push(`params: ${Object.entries(r.params).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${v}`).join(" ")}`);
  if (Array.isArray(r.diff)) out.push(...r.diff);
  if (r.report) out.push("", formatContractReport(r.report));
  if (r.summary) out.push("", r.summary);
  for (const w of r.warnings ?? []) out.push(`⚠ ${w}`);
  if (r.setup?.length) out.push("", `set up: ${r.setup.join(", ")}`);
  return out.join("\n");
}
