#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { runConfigCommand } from 'commands/config/index.js';
import { runLiveCommand } from 'commands/live/index.js';
import { runRebaseCommand } from 'commands/rebase/index.js';
import { runSelectCommand } from 'commands/select/index.js';
import { runStatusCommand } from 'commands/status/index.js';

import { renderHelp } from 'utils/render-help/index.js';
import { cliHelp } from './cli.help.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

type CommandHandler = () => Promise<void> | void;

async function main(): Promise<void> {
  const [, , ...argv] = process.argv;
  const [command] = argv;
  const args = argv.slice(1);

  /* ────────────────────────────────────────────────────────── */
  /* Root help / version                                        */
  /* ────────────────────────────────────────────────────────── */

  if (!command || command === '--help' || command === '-h') {
    renderHelp(cliHelp);
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    return;
  }

  /* ────────────────────────────────────────────────────────── */
  /* Command registry                                           */
  /* ────────────────────────────────────────────────────────── */

  const commands: Record<string, CommandHandler> = {
    config: async () => {
      await runConfigCommand({ argv: args });
    },
    live: async () => {
      await runLiveCommand({ argv: args });
    },
    rebase: async () => {
      await runRebaseCommand({ argv: args });
    },
    select: async () => {
      await runSelectCommand({ argv: args });
    },
    status: async () => {
      await runStatusCommand({ argv: args });
    },
    help: () => {
      renderHelp(cliHelp);
    },
  };

  /* ────────────────────────────────────────────────────────── */
  /* Guards                                                     */
  /* ────────────────────────────────────────────────────────── */

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    renderHelp(cliHelp);
    exit(1);
    return;
  }

  /* ────────────────────────────────────────────────────────── */
  /* Execute                                                    */
  /* ────────────────────────────────────────────────────────── */

  await commands[command]();
}

/* ────────────────────────────────────────────────────────── */
/* Bootstrap                                                  */
/* ────────────────────────────────────────────────────────── */

main().catch((error: unknown) => {
  console.error(error);
  exit(1);
});
