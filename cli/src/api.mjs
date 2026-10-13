// A thin client for the developer API (/dev/v1). Every command is one
// call; the server owns all logic, so the CLI, MCP and the builder agree.

export class ApiError extends Error {
  /** @param {number} status @param {Record<string, any>} body */
  constructor(status, body) {
    super(typeof body?.error === "string" ? body.error : typeof body?.message === "string" ? body.message : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {{ api: string, token: string | null }} cfg
 */
export function client(cfg) {
  const base = cfg.api.replace(/\/+$/, "");
  /**
   * @param {string} method @param {string} p @param {unknown} [body]
   * @returns {Promise<Record<string, any>>}
   */
  async function call(method, p, body) {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    /** @type {Record<string, any>} */
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text.slice(0, 300) };
    }
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  }
  /** @param {string} id */
  const proj = (id) => `/dev/v1/projects/${encodeURIComponent(id)}`;
  /** A query string of the defined values ("" when none).
   *  @param {Record<string, string | number | undefined>} q */
  const qs = (q) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.size > 0 ? `?${p}` : "";
  };
  return {
    /** @param {string} email @param {string} password */
    login: (email, password) => call("POST", "/auth/login", { email, password }),
    me: () => call("GET", "/dev/v1/me"),
    /** @param {Record<string, unknown>} body */
    mintToken: (body) => call("POST", "/dev/v1/tokens", body),
    listTokens: () => call("GET", "/dev/v1/tokens"),
    /** @param {string} id */
    revokeToken: (id) => call("DELETE", `/dev/v1/tokens/${encodeURIComponent(id)}`),
    docs: async () => {
      const res = await fetch(`${base}/dev/v1/docs`, { headers: cfg.token ? { authorization: `Bearer ${cfg.token}` } : {} });
      if (!res.ok) throw new ApiError(res.status, { error: await res.text() });
      return res.text();
    },
    listProjects: () => call("GET", "/dev/v1/projects"),
    /** @param {string} name */
    createProject: (name) => call("POST", "/dev/v1/projects", { name }),
    /** @param {string} id */
    project: (id) => call("GET", proj(id)),
    /** @param {string} id */
    contract: (id) => call("GET", `${proj(id)}/contract`),
    /** @param {string} id @param {unknown} contract */
    check: (id, contract) => call("POST", `${proj(id)}/check`, { contract }),
    /** @param {string} id @param {unknown} contract @param {boolean} force */
    apply: (id, contract, force) => call("POST", `${proj(id)}/apply`, { contract, force }),
    /** @param {string} id @param {unknown} edits @param {boolean} dryRun */
    patch: (id, edits, dryRun) => call("POST", `${proj(id)}/patch`, { edits, dryRun }),
    /** @param {string} id */
    verify: (id) => call("POST", `${proj(id)}/verify`, {}),
    /** @param {string} id @param {Record<string, unknown>} q */
    query: (id, q) => call("POST", `${proj(id)}/data/query`, q),
    /** @param {string} id @param {{ limit?: number, workflow?: string }} q */
    logs: (id, q) => {
      const qs = new URLSearchParams();
      if (q.limit) qs.set("limit", String(q.limit));
      if (q.workflow) qs.set("workflow", q.workflow);
      return call("GET", `${proj(id)}/logs${qs.size > 0 ? `?${qs}` : ""}`);
    },
    /** @param {string} id @param {Record<string, unknown>} body */
    deploy: (id, body) => call("POST", `${proj(id)}/deploy`, body),

    // Operate the running app (dev-api/operate.ts).
    /** @param {string} id @param {{ sql: string, env?: string }} body */
    sql: (id, body) => call("POST", `${proj(id)}/sql`, body),
    /** @param {string} id @param {Record<string, unknown>} body */
    rows: (id, body) => call("POST", `${proj(id)}/rows`, body),
    /** @param {string} id @param {string | undefined} env */
    schema: (id, env) => call("GET", `${proj(id)}/schema${qs({ env })}`),
    /** @param {string} id @param {string | undefined} env */
    snapshots: (id, env) => call("GET", `${proj(id)}/snapshots${qs({ env })}`),
    /** @param {string} id @param {string | undefined} env */
    createSnapshot: (id, env) => call("POST", `${proj(id)}/snapshots`, env ? { env } : {}),
    /** @param {string} id @param {string} snapshotId */
    restoreSnapshot: (id, snapshotId) => call("POST", `${proj(id)}/snapshots/${encodeURIComponent(snapshotId)}/restore`, {}),
    /** @param {string} id @param {{ environment?: string, limit?: number }} q */
    deploys: (id, q) => call("GET", `${proj(id)}/deploys${qs(q)}`),
    /** @param {string} id @param {string} deploymentId */
    rollback: (id, deploymentId) => call("POST", `${proj(id)}/deploys/${encodeURIComponent(deploymentId)}/rollback`, {}),
    /** @param {string} id @param {string} workflowId @param {Record<string, unknown>} body */
    runWorkflow: (id, workflowId, body) => call("POST", `${proj(id)}/workflows/${encodeURIComponent(workflowId)}/run`, body),
    /** @param {string} id @param {string} runId */
    getRun: (id, runId) => call("GET", `${proj(id)}/runs/${encodeURIComponent(runId)}`),
    /** @param {string} id @param {number | undefined} limit */
    deadLetters: (id, limit) => call("GET", `${proj(id)}/dead-letters${qs({ limit })}`),
    /** @param {string} id @param {string[] | undefined} ids */
    replay: (id, ids) => call("POST", `${proj(id)}/dead-letters/replay`, ids && ids.length > 0 ? { ids } : {}),
    /** @param {string} id @param {{ kind: string, env?: string, since?: string, limit?: number }} q */
    tail: (id, q) => call("GET", `${proj(id)}/tail${qs(q)}`),
    /** @param {string} id */
    secrets: (id) => call("GET", `${proj(id)}/secrets`),
    /** @param {string} id @param {string} name @param {string} value @param {string | undefined} env */
    setSecret: (id, name, value, env) => call("PUT", `${proj(id)}/secrets/${encodeURIComponent(name)}`, { value, ...(env ? { env } : {}) }),
    // Templates (dev-api/templates.ts).
    /** @param {{ query?: string, kind?: string, category?: string, limit?: number }} q */
    searchTemplates: (q) => call("GET", `/dev/v1/templates${qs(q)}`),
    /** @param {string} slug */
    template: (slug) => call("GET", `/dev/v1/templates/${encodeURIComponent(slug)}`),
    /** @param {string} slug @param {Record<string, unknown>} body */
    useTemplate: (slug, body) => call("POST", `/dev/v1/templates/${encodeURIComponent(slug)}/use`, body),
    /** @param {string} id @param {string} name @param {string | undefined} env */
    deleteSecret: (id, name, env) => call("DELETE", `${proj(id)}/secrets/${encodeURIComponent(name)}${qs({ env })}`),
  };
}
