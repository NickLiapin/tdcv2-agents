# tdcv2-mcp

An MCP server that lets an AI agent make test data with [TDCv2](https://nickliapin.github.io/tdcv2/):
the agent writes a small `.tdc` config, the engine generates the rows **on your machine**,
and the same config gives the same file byte for byte on every run. Nothing is sent
anywhere — the server only runs the engine locally.

It is the same knowledge as the TDCv2 skill (`../skill/tdcv2`), as tools — for clients
without a terminal, or that prefer tools to skills.

> **Not on npm yet.** Until it is, run it from this repository: `npm ci` in `mcp/`, then
> use `node <repo>/mcp/src/cli.mjs` wherever the examples below say `npx -y tdcv2-mcp`.

## Connect it

Claude Code:

```sh
claude mcp add tdcv2 -- npx -y tdcv2-mcp
```

Claude Desktop, Cursor and other clients — the usual `mcpServers` entry:

```json
{ "mcpServers": { "tdcv2": { "command": "npx", "args": ["-y", "tdcv2-mcp"] } } }
```

Windows: use `"command": "npx.cmd"` if the client cannot start `npx`.

The server works in the folder the client starts it in — the project. It reads `.tdc`
files and writes generated files only inside that folder.

## Tools

| tool | what it does |
| :--- | :--- |
| `tdc_read_docs` | the guide (read once), traps `check` does not catch, test code in five languages, any reference page |
| `tdc_find_packs` | data packs installed here, by words — the paths for `<gen type="template">` |
| `tdc_check` | every diagnostic with code, line, column, hint and "did you mean" |
| `tdc_generate` | preview (at most 50 lines) or write the file; a failed `<assert>` comes back as row, message, condition, values |
| `tdc_peek` | a short summary of a CSV, JSON or SQL file — rows, splits, ranges |
| `tdc_format` | pretty-print a config like `tdcv2 format` |

Also a prompt, `tdcv2_guide`, and resources `tdcv2://guide`, `tdcv2://traps`,
`tdcv2://from-code`.

## Which engine

The project's own `tdcv2` if it has one (`npm i -D tdcv2`), then one on `PATH`, else the
server's own dependency. `TDCV2_ENGINE=<package folder>` pins one.

## Checked

`test/smoke.mjs` drives the server through a real MCP client over stdio — every tool, the
prompt, a resource — and checks that the file it writes is byte for byte the one the CLI
writes. CI runs it on Linux and Windows.
