# Appbricx examples and tools

Everything you need to build on [Appbricx](https://www.appbricx.com) from your own machine: a complete example app, ten app templates, the Claude Code plugin, the CLI, a Cursor config and the HyperFrames templates behind our demo videos.

Your coding agent builds the app; Appbricx runs it: Postgres per project with separate dev and prod databases, per-role access enforced by the database, sign-in, workflows, realtime, in-app AI, payments, releases tested as every user, and one-click rollback.

| Folder | What it is |
|---|---|
| [`studio-bookings/`](studio-bookings) | The app from the [end-to-end tutorial](https://www.appbricx.com/docs/tutorials/booking-app): contract, custom screens, a server function and a workflow. Live at [example-bookings.apps.appbricx.com](https://example-bookings.apps.appbricx.com). |
| [`templates/`](templates) | The ten [showcase apps](https://www.appbricx.com/showcase) as contracts you can apply: Tablefor, Kanbo, Atelier, Clinicly, Eventra, Learnly, Relay, Nook, Ledgerly and Stride. |
| [`plugins/claude-code/`](plugins/claude-code) | The Claude Code plugin and skill. |
| [`cli/`](cli) | `appbricx`, the command-line tool: log in, check, apply, verify, deploy, run SQL, edit rows, take snapshots. |
| [`cursor/`](cursor) | MCP config for Cursor (browser sign-in or a token header). |
| [`video/hyperframes/`](video/hyperframes) | HyperFrames compositions and scripts to record and render walkthroughs, reels, terminal replays and slides of your own app. |

## Connect your coding agent

```sh
# Claude Code: connect, then run /mcp → appbricx → Authenticate (opens your browser)
claude mcp add --transport http appbricx https://www.appbricx.com/api/mcp

# or install the plugin (adds the skill too)
/plugin marketplace add Naveenbhargav-m/appbricx-examples
/plugin install appbricx@appbricx
```

Then ask your agent to build something, or to apply one of the templates.

## Use the CLI

```sh
git clone https://github.com/Naveenbhargav-m/appbricx-examples
cd appbricx-examples/cli && npm link     # puts `appbricx` on your PATH
appbricx login                           # opens your browser, click Authorize
appbricx create "My app" && appbricx apply ../templates/kanbo/app.json
```

## Docs

- [Quickstart with a coding agent](https://www.appbricx.com/docs/quickstart/agent)
- [Guides](https://www.appbricx.com/docs) for every feature
- Reference: [SDK](https://www.appbricx.com/docs/reference/sdk), [HTTP API](https://www.appbricx.com/docs/reference/api), [MCP tools](https://www.appbricx.com/docs/reference/mcp), [CLI](https://www.appbricx.com/docs/reference/cli), [integrations](https://www.appbricx.com/docs/integrations)

## License

The contents of this repository are MIT licensed (see [LICENSE](LICENSE)). The Appbricx platform itself is covered by the Appbricx Self-Hosted License; see [pricing](https://www.appbricx.com/pricing#self-host).
