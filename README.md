# TDCv2 for AI agents

A **data generator** for your coding agent: **fake, mock, synthetic and test data** with
[TDCv2](https://nickliapin.github.io/tdcv2/) — realistic names, emails, addresses, phone
numbers, IBANs and more. The agent writes a small `.tdc` config, the TDCv2 engine generates
the rows **on your machine**, and the same config gives the same file, byte for byte, every
time you run it. CSV, JSON, SQL inserts or any text format; fields that agree with each
other; exact shares; related tables; data packs for 95 languages and 198 countries. Think
Faker, but for whole datasets: database seeds, test fixtures, demo data.

Two parts, one version:

- **a skill** — teaches the agent the TDC language, the workflow and the traps
  (`skills/tdcv2`);
- **an MCP server**, `tdcv2-mcp` — the same, as tools: check a config, generate, find and
  install data packs, summarise a file, read the docs (`mcp/`).


## Install

**Claude Code and Cowork** — the plugin brings both the skill and the server. The simplest
way: in claude.ai or the Claude app, **Customize → Plugins → Discover**, find **TDCv2 — Fake &
Test Data Generator**, **Add**; Claude Code picks it up at the next session and keeps it updated.
Or from this repository's marketplace:

```sh
claude plugin marketplace add NickLiapin/tdcv2-agents
claude plugin install tdcv2@tdcv2
```

Install one way, not both — otherwise the skill loads twice and two servers start.

**Codex, Copilot, Gemini CLI, Cursor and other agents that read skills** — put the skill
where your agent looks for it:

```sh
npx -y tdcv2-mcp@0.1.6 install-skill            # ~/.claude/skills/tdcv2
npx -y tdcv2-mcp@0.1.6 install-skill --agents   # ~/.agents/skills/tdcv2
npx -y tdcv2-mcp@0.1.6 install-skill --project  # ./.claude/skills/tdcv2
npx -y tdcv2-mcp@0.1.6 install-skill --dir <skills folder>
```

**Any MCP client** (Claude Desktop, Cursor, VS Code…):

```json
{ "mcpServers": { "tdcv2": { "command": "npx", "args": ["-y", "tdcv2-mcp@0.1.6"] } } }
```

On Windows use `"command": "npx.cmd"` if the client cannot start `npx`. Everything needs
Node.js 20 or newer.

Step by step for each agent and client: [TDC for AI agents](https://nickliapin.github.io/tdcv2/docs/ai-agents/overview).

Then ask in plain words — *"500 customers from 20 countries as CSV"*, *"a pytest test for
validate_user on 50 different users"* — and the agent takes it from there: writes the
config, checks it with the engine, generates, and hands you the file together with the
config that reproduces it.

## Privacy

The engine runs locally. Neither the skill nor the server sends your data or your configs
anywhere. The server reads `.tdc` files and writes generated files only inside the project
folder it is started in.

Network access, all of it:

- the plugin starts the server with `npx -y tdcv2-mcp@0.1.6`, its own version
  (`scripts/mcp-launch.mjs`), so the first start downloads that exact version and its
  dependencies, the TDCv2 engine among them, from the npm registry;
- `npx -y tdcv2-mcp@0.1.6 …` in the commands above does the same, and so does `npx -y tdcv2@0.3.6 …`,
  the exact engine version the agent runs;
- with an engine of another version, the agent may read that version's doc page from
  `raw.githubusercontent.com`;
- data packs are downloaded only when you or the agent run `tdcv2 pack add` (through the
  server: `tdc_pack_add`, which your client asks you to allow);
- a config with `<gen type="http" src="…">` sends the named values to that URL — only if
  someone writes such a config.

Nothing else is fetched, and nothing is sent. The full policy: [PRIVACY.md](PRIVACY.md).

## Versions

This release, 0.1.6, is checked against TDCv2 0.3.6. The skill's reference is
built from the engine's documentation for that version; with another engine version the
agent reads that version's pages, and the engine's own `check` has the last word.

## License

MIT
