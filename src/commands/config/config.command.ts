import { spawnSync } from 'node:child_process';
import { cwd } from 'node:process';
import { renderCommandHelp } from '@finografic/cli-kit/render-help';
import * as clack from '@clack/prompts';
import { configHelp } from 'commands/config/config.help.js';
import pc from 'picocolors';

import { getConfigFilePath, tildeify } from 'utils/config.utils.js';
import { getGitHubUrlFromPath } from 'utils/git.utils.js';
import { addRepo, listRepos, removeRepo } from 'utils/repos.utils.js';

import { GITHUB_URL_PATTERN } from 'config/defaults.constants.js';

interface RunConfigCommandParams {
  argv: string[];
}

async function runAddRepo(): Promise<void> {
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

  if ((await listRepos()).some((r) => r.remote === remote)) {
    clack.log.warn(`${pc.cyan(remote as string)} is already in your config`);
    clack.outro('Nothing to add');
    return;
  }

  await addRepo({ localPath: pathToUse, remote });
  clack.log.success(`Added ${pc.cyan(remote)}`);
  clack.log.info(`  ${pc.dim(tildeify(pathToUse))}`);
  clack.outro('Done');
}

async function runList(): Promise<void> {
  const repos = await listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Run `gli config add` to add one.');
    return;
  }

  clack.intro('Configured Repos');

  for (const repo of repos) {
    clack.log.message(`${pc.bold(repo.remote)}\n  ${pc.dim(tildeify(repo.localPath))}`);
  }

  clack.outro(`${repos.length} repo${repos.length === 1 ? '' : 's'} configured`);
}

async function runRemoveRepo(): Promise<void> {
  const repos = await listRepos();

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

  await removeRepo({ remote: selected as string });
  clack.log.success(`Removed ${pc.bold(selected as string)}`);
  clack.outro('Done');
}

function runPath(): void {
  console.log(getConfigFilePath());
}

function runEdit(): void {
  const configPath = getConfigFilePath();
  const editor = process.env['EDITOR'] || process.env['VISUAL'] || 'vim';
  const result = spawnSync(editor, [configPath], { stdio: 'inherit' });
  if (result.error) {
    console.error(pc.red(`Failed to open editor "${editor}": ${result.error.message}`));
    process.exit(1);
  }
}

export async function runConfigCommand({ argv }: RunConfigCommandParams): Promise<void> {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    renderCommandHelp(configHelp);
    return;
  }

  if (subcommand === 'add') {
    await runAddRepo();
    return;
  }

  if (subcommand === 'list') {
    await runList();
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
  renderCommandHelp(configHelp);
}
