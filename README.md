# TDCv2 for AI agents

Let your coding agent make **test data** with [TDCv2](https://nickliapin.github.io/tdcv2/):
it writes a small `.tdc` config, the TDCv2 engine generates the rows **on your machine**,
and the same config gives the same file, byte for byte, every time you run it. CSV, JSON,
SQL inserts or any text format; fields that agree with each other; exact shares; related
tables; data packs for 95 languages and 198 countries.

Two parts, one version:

- **a skill** — teaches the agent the TDC language, the workflow and the traps
  (`skills/tdcv2`);
- **an MCP server**, `tdcv2-mcp` — the same, as tools: check a config, generate, find data
  packs, summarise a file, read the docs (`mcp/`).


## Install

**Claude Code** — the plugin brings both the skill and the server:

```sh
claude plugin marketplace add NickLiapin/tdcv2-agents
claude plugin install tdcv2@tdcv2
```

**Codex, Copilot, Gemini CLI, Cursor and other agents that read skills** — put the skill
where your agent looks for it:

```sh
npx -y tdcv2-mcp install-skill            # ~/.claude/skills/tdcv2
npx -y tdcv2-mcp install-skill --agents   # ~/.agents/skills/tdcv2
npx -y tdcv2-mcp install-skill --project  # ./.claude/skills/tdcv2
npx -y tdcv2-mcp install-skill --dir <skills folder>
```

**Any MCP client** (Claude Desktop, Cursor, VS Code…):

```json
{ "mcpServers": { "tdcv2": { "command": "npx", "args": ["-y", "tdcv2-mcp"] } } }
```

On Windows use `"command": "npx.cmd"` if the client cannot start `npx`. Everything needs
Node.js 20 or newer.

Then ask in plain words — *"500 customers from 20 countries as CSV"*, *"a pytest test for
validate_user on 50 different users"* — and the agent takes it from there: writes the
config, checks it with the engine, generates, and hands you the file together with the
config that reproduces it.

## Privacy

The engine runs locally. Neither the skill nor the server sends your data or your configs
anywhere. The server reads `.tdc` files and writes generated files only inside the project
folder it is started in.

Network access, all of it:

- the plugin starts the server with `npx -y tdcv2-mcp@<the plugin's version>`
  (`scripts/mcp-launch.mjs`), so the first start downloads that exact version and its
  dependencies, the TDCv2 engine among them, from the npm registry;
- `npx -y tdcv2-mcp …` in the commands above does the same, and so does `npx -y tdcv2 …`
  when the agent runs the engine in a project that has none of its own;
- with an engine of another version, the agent may read that version's doc page from
  `raw.githubusercontent.com`;
- data packs are downloaded only when you or the agent run `tdcv2 pack add`;
- a config with `<gen type="http" src="…">` sends the named values to that URL — only if
  someone writes such a config.

Nothing else is fetched, and nothing is sent. The full policy: [PRIVACY.md](PRIVACY.md).

## Versions

This release, 0.1.1, is checked against TDCv2 0.3.3. The skill's reference is
built from the engine's documentation for that version; with another engine version the
agent reads that version's pages, and the engine's own `check` has the last word.

## License

MIT
