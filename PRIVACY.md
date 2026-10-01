# Privacy policy — TDCv2 for AI agents

This covers the TDCv2 plugin, skill and MCP server (`tdcv2-mcp`) published from this
repository. They are open source (MIT) and run entirely on your computer.

## What we collect

Nothing. There is no telemetry, no analytics, no account and no server of ours. The
skill, the MCP server and the TDCv2 engine do not send your data, your configs or the
files they generate anywhere.

## What stays on your machine

- The MCP server reads `.tdc` configs and data files, and writes generated files, only
  inside the project folder it is started in.
- The engine generates every row locally. The same config gives the same file on every
  run; nothing is looked up online.

## Network access, all of it

- **Starting the server.** The plugin runs `npx -y tdcv2-mcp@0.1.2`, its own version
  (`scripts/mcp-launch.mjs`). The first start downloads that exact version and its
  dependencies — the TDCv2 engine among them — from the npm registry; npm caches them.
- **Running the engine.** The agent and the skill's scripts run the engine with
  `npx -y tdcv2@0.3.3 …` — one exact version, which npm downloads the first time the same way.
- **Engine docs of another version.** The skill carries the engine's documentation for
  one version. If your engine is a different version, the agent may read that version's
  page from `raw.githubusercontent.com` (public GitHub). That is a plain download of a
  public page; nothing of yours is sent.
- **Data packs.** Downloaded only when you or the agent run `tdcv2 pack add`.
- **HTTP generators.** Only if a config you run uses `<gen type="http" src="…">`: the
  engine then sends the named values to the URL written in that config. No config does
  this unless someone writes it.

## Your AI provider

The agent you use is a service of its own. Whatever it reads while working — a config, a
preview of generated rows (the server returns at most 50 lines), a file summary — becomes
part of your conversation with that provider, under its terms. This plugin adds nothing
to that and sends nothing to us.

## Children

Not directed at children.

## Changes and contact

Changes to this policy are made in this file; its history is in the repository.
Questions and issues: https://github.com/NickLiapin/tdcv2-agents/issues
