import { spawnSync } from 'node:child_process';
import { cwd } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { getConfigFilePath, tildeify } from 'utils/config.utils.js';
import { getGitHubUrlFromPath } from 'utils/git.utils.js';
import { printCommandHelp } from 'utils/help.utils.js';
import { addRepo, listRepos, removeRepo } from 'utils/repos.utils.js';
import { GITHUB_URL_PATTERN } from 'config/defaults.constants.js';

interface RunConfigCommandParams {
  argv: string[];
}

const printHelp = () => {
  printCommandHelp({
    command: 'gli config',
    description: 'Manage multi-repo configuration',
    usage: 'gli config <subcommand>',
    subcommands: [
      { name: 'add', description: 'Add a repository to the config' },
      { name: 'list', description: 'List all configured repositories' },
      { name: 'remove', description: 'Remove a repository from the config' },
      { name: 'path', description: 'Show the config file path' },
      { name: 'edit', description: 'Open config file in $EDITOR' },
    ],
    examples: [
      { command: 'gli config add', description: 'Add current directory' },
      { command: 'gli config list', description: 'Show all repos' },
      { command: 'gli config remove', description: 'Remove a repo' },
      { command: 'gli config path', description: 'Show config file location' },
      { command: 'gli config edit', description: 'Edit config in $EDITOR / vim' },
    ],
  });
};

const runAddRepo = async () => {
  clack.intro('Add Repo');

  const currentPath = cwd();

  const localPath = await clack.text({
    message: 'Local repository path',
    placeholder: currentPath,
    defaultValue: currentPath,
  });

  if (clack.isCancel(localPath)) {
    clack.outro('Cancelled');
    return;
  }

  const pathToUse = (localPath as string) || currentPath;

  // Auto-detect GitHub URL for the selected path
  const detectedUrl = getGitHubUrlFromPath({ localPath: pathToUse });

  const remote = await clack.text({
    message: 'GitHub repository URL',
    placeholder: 'https://github.com/owner/repo',
    initialValue: detectedUrl || '',
    validate: (value = '') => {
      if (!GITHUB_URL_PATTERN.test(value)) {
        return 'Must be a valid GitHub URL (e.g. https://github.com/owner/repo)';
      }
    },
  });

  if (clack.isCancel(remote)) {
    clack.outro('Cancelled');
    return;
  }

  if (listRepos().some((r) => r.remote === remote)) {
    clack.log.warn(`${pc.cyan(remote as string)} is already in your config`);
    clack.outro('Nothing to add');
    return;
  }

  addRepo({ localPath: pathToUse, remote });
  clack.log.success(`Added ${pc.cyan(remote)}`);
  clack.log.info(`  ${pc.dim(tildeify(pathToUse))}`);
  clack.outro('Done');
};

const runList = () => {
  const repos = listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Run `gli config add` to add one.');
    return;
  }

  clack.intro('Configured Repos');

  for (const repo of repos) {
    clack.log.message(`${pc.bold(repo.remote)}\n  ${pc.dim(tildeify(repo.localPath))}`);
  }

  clack.outro(`${repos.length} repo${repos.length === 1 ? '' : 's'} configured`);
};

const runRemoveRepo = async () => {
  const repos = listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Nothing to remove.');
    return;
  }

  clack.intro('Remove Repo');

  const selected = await clack.select({
    message: 'Which repo do you want to remove?',
    options: repos.map((repo) => ({
      value: repo.remote,
      label: repo.remote,
      hint: repo.localPath,
    })),
  });

  if (clack.isCancel(selected)) {
    clack.outro('Cancelled');
    return;
  }

  removeRepo({ remote: selected });
  clack.log.success(`Removed ${pc.bold(selected)}`);
  clack.outro('Done');
};

const runPath = () => {
  console.log(getConfigFilePath());
};

const runEdit = () => {
  const configPath = getConfigFilePath();
  const editor = process.env['EDITOR'] || process.env['VISUAL'] || 'vim';
  const result = spawnSync(editor, [configPath], { stdio: 'inherit' });
  if (result.error) {
    console.error(pc.red(`Failed to open editor "${editor}": ${result.error.message}`));
    process.exit(1);
  }
};

export const runConfigCommand = async ({ argv }: RunConfigCommandParams) => {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (subcommand === 'add') {
    await runAddRepo();
    return;
  }

  if (subcommand === 'list') {
    runList();
    return;
  }

  if (subcommand === 'remove') {
    await runRemoveRepo();
    return;
  }

  if (subcommand === 'path') {
    runPath();
    return;
  }

  if (subcommand === 'edit') {
    runEdit();
    return;
  }

  console.error(`Unknown config subcommand: ${subcommand}`);
  printHelp();
};
