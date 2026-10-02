#!/usr/bin/env node
/**
 * The package's command: `npx -y tdcv2-mcp@0.1.2` runs the MCP server over stdio;
 * `npx -y tdcv2-mcp@0.1.2 install-skill` puts the skill where an agent reads skills.
 */
const [cmd] = process.argv.slice(2);
if (cmd === 'install-skill') await import('./install-skill.mjs');
else if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  console.log(`tdcv2-mcp — TDCv2 for AI agents

  npx -y tdcv2-mcp@0.1.2                  run the MCP server over stdio (what an MCP client starts)
  npx -y tdcv2-mcp@0.1.2 install-skill    put the TDCv2 skill where your agent reads skills
                                    (--help after it for the options)`);
} else await import('./server.mjs');
