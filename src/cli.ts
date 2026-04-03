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

import { printHelp } from './gli.help.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getVersion = (): string => {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
};

async function main(): Promise<void> {
  const [, , ...argv] = process.argv;
  const [command] = argv;

  if (
    !command
    || command === 'help'
    || command === '--help'
    || command === '-h'
  ) {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    return;
  }

  if (command === 'config') {
    await runConfigCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'live') {
    await runLiveCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'rebase') {
    await runRebaseCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'select') {
    await runSelectCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'status') {
    await runStatusCommand({ argv: argv.slice(1) });
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  exit(1);
});
