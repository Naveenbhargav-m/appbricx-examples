# @appbricx/cli

The appbricx developer CLI: write an app **contract** (tables, roles,
row-level access, workflows, seeds, pages), apply it to a dev environment,
verify it and deploy it, from your terminal, CI or a coding agent.

Not on npm yet: run it from a clone (Node 20+, no dependencies):

```sh
git clone https://github.com/Naveenbhargav-m/appbricx-examples
cd appbricx-examples/cli && npm link     # puts `appbricx` on your PATH

appbricx login                        # opens your browser: sign in, click Authorize
                                      # (--api defaults to https://appbricx.com/api)
appbricx create "Field Desk"          # creates a project, links this directory
appbricx docs > GUIDE.md              # the contract reference
$EDITOR appbricx.json                 # write the contract
appbricx check                        # normalize + report, no changes
appbricx apply                        # build dev: database, RLS, workflows, pages
appbricx verify                       # JSON-backed report; exit 1 when red
appbricx query job --where status=open
appbricx logs --workflow job-assigned
appbricx deploy                       # verify-gated publish
```

Small changes without resending the contract:

```sh
echo '[{"op":"add_field","entity":"job","field":{"name":"due","type":"date"}}]' > ops.json
appbricx patch ops.json --dry-run && appbricx patch ops.json
```

Start from a template instead of a blank contract (apps, blocks, workflows
and components, all checked; browse them at appbricx.com/templates):

```sh
appbricx templates search "stripe subscription"          # find one
appbricx templates show booking-calendar                  # what it adds, its params
appbricx templates use relay --name "Help desk"           # an app: a new project, linked here
appbricx templates use booking-calendar --param attach_to=room --dry-run   # the diff + check
appbricx templates use booking-calendar --param attach_to=room             # apply to dev
```

## Signing in

`appbricx login` signs in with your browser (OAuth 2.1 with PKCE). The CLI
listens on a random `http://127.0.0.1` port, opens Appbricx, and after you
click **Authorize** it stores an access token (1 hour) and a refresh token
(90 days, rotated on every use) in `~/.config/appbricx/config.json`
(mode 0600). It refreshes the access token by itself. The CLI then shows up
under **Workspace settings, Coding agents, Authorized agents**, where you can
revoke it; `appbricx logout` revokes it too.

- No browser on this machine? `appbricx login --no-browser` prints the URL to
  open elsewhere (the callback still has to reach this machine's 127.0.0.1).
- CI and headless machines: create a personal access token in
  **Workspace settings, Coding agents** and use `appbricx login --token apx_pat_…`,
  or set `APPBRICX_API` and `APPBRICX_TOKEN` and skip `login` entirely.
- Self-hosted: `appbricx login --api https://your-host/api`.

Operate the running app (`--env dev|prod`, default dev). Every prod write
takes a database snapshot first and prints its id:

```sh
appbricx schema --env prod                         # the real schema; which tables the contract manages
appbricx sql "CREATE INDEX job_due ON job (due)"   # any SQL, like the builder's SQL editor
appbricx sql --file fix.sql --env prod             # needs a deploy-scope token
appbricx rows update job --id 42 --patch '{"status":"done"}' --as dispatcher
appbricx snapshots && appbricx snapshots restore <id>
appbricx deploys && appbricx deploys rollback <deployment-id>
appbricx run workflow nightly-digest --input '{"day":"mon"}'
appbricx run dead-letters && appbricx run replay
appbricx tail errors --since 1h --env prod
appbricx secrets set STRIPE_KEY - < key.txt         # values are never printed back
```

Hand-made schema (indexes, views, functions, triggers, extra tables and
columns) survives contract apply and publish; `appbricx schema` marks it.

Coding agents: `appbricx mcp-config` prints the `.mcp.json` entry for the
remote MCP server (same operations as tools). Without a token header, the
agent signs in with the browser on first connect; `--token-header` adds an
`Authorization: Bearer ${APPBRICX_TOKEN}` header for CI. The Claude Code
plugin lives in `plugins/claude-code` of this repo.

`--json` prints the server's JSON as is. `APPBRICX_API`, `APPBRICX_TOKEN`,
`APPBRICX_PROJECT` and `APPBRICX_CONFIG` override the saved config (for CI).
Exit codes: 0 ok, 1 the server said no (invalid contract, red verify), 2 usage.
