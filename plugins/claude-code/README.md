# Appbricx plugin for Claude Code

Adds the Appbricx remote MCP server and the `appbricx` skill (how to write,
check, apply, verify and deploy an app contract).

```text
/plugin marketplace add Naveenbhargav-m/appbricx-examples
/plugin install appbricx@appbricx
```

## Signing in

Nothing to configure. The first time Claude Code connects, the server asks it
to sign in: run `/mcp`, pick **appbricx**, choose **Authenticate**, and a
browser window opens. Sign in to Appbricx, check the permissions (read,
apply, deploy) and the workspace, and click **Authorize**. Claude Code keeps
and refreshes the tokens itself.

You can see and revoke the authorization any time in **Workspace settings,
Coding agents, Authorized agents**.

Without the plugin, the same server is one command:

```sh
claude mcp add --transport http appbricx https://www.appbricx.com/api/mcp
```

To pin one project, so tools default to it, add the server yourself with
`?project=<id>` on the URL instead of using the plugin's entry. When
self-hosting, use your own API base in place of `https://www.appbricx.com/api`.

## CI and headless machines: a token instead

Where no browser can open, use a personal access token from **Workspace
settings, Coding agents, Access tokens for CI**, and send it as a header:

```sh
claude mcp add --transport http appbricx https://www.appbricx.com/api/mcp \
  --header "Authorization: Bearer $APPBRICX_TOKEN"
```

or in a project `.mcp.json`:

```json
{
  "mcpServers": {
    "appbricx": {
      "type": "http",
      "url": "https://www.appbricx.com/api/mcp",
      "headers": { "Authorization": "Bearer ${APPBRICX_TOKEN}" }
    }
  }
}
```

Cursor: `cursor/mcp.json` (browser sign-in) or
`cursor/mcp.token.json` (token header) goes in `.cursor/mcp.json`.
