import type { HelpConfig } from '@finografic/cli-kit/render-help';

export const cliHelp: HelpConfig = {
  main: {
    bin: 'gli',
    args: '<command> [options]',
  },

  commands: {
    title: 'Commands',
    list: [
      { label: 'live', description: 'Live-updating PR status dashboard' },
      { label: 'status', description: 'Show merge status of your open PRs' },
      { label: 'rebase', description: 'Interactively rebase branches that are behind' },
      { label: 'select', description: 'Interactively checkout a branch for one of your PRs' },
      { label: 'config', description: 'Manage multi-repo configuration' },
    ],
  },

  examples: {
    title: 'Examples',
    list: [
      { label: 'Start live PR dashboard', description: 'gli live' },
      { label: 'Snapshot of PR status (exits)', description: 'gli status' },
      { label: 'Select and rebase a branch', description: 'gli rebase' },
      { label: 'Rebase all stale branches, auto-confirm each', description: 'gli rebase --all -y' },
      { label: 'Add a repo to config (watch)', description: 'gli config watch' },
      { label: 'Edit config in $EDITOR', description: 'gli config edit' },
    ],
  },

  footer: {
    title: 'Show Help',
    list: [
      { label: 'gli help', description: '' },
      { label: 'gli <command> --help', description: '' },
    ],
  },
};
