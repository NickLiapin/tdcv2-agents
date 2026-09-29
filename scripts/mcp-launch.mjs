#!/usr/bin/env node
/**
 * Starts the tdcv2 MCP server for the Claude Code plugin — the tdcv2-mcp package
 * of the same version as this plugin, through npx. A launcher rather than `npx`
 * in .mcp.json: on Windows npx is npx.cmd, which starts only through a shell.
 * TDCV2_MCP_LOCAL=<path to src/cli.mjs> runs a local checkout instead.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'));
const local = process.env.TDCV2_MCP_LOCAL;
const [cmd, args] = local ? [process.execPath, [local]] : ['npx', ['-y', `tdcv2-mcp@${version}`]];
const child = spawn(cmd, args, { stdio: 'inherit', shell: !local && process.platform === 'win32' });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s));
