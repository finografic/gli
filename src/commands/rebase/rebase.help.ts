import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

export const rebaseHelp: CommandHelpConfig = {
  command: 'gli rebase',
  description: 'Interactively rebase branches that are behind the default branch',
  usage: 'gli rebase [options]',
  options: [
    {
      flag: '--all',
      description: 'Rebase all branches that need it (with confirmation)',
    },
    {
      flag: '-y',
      description: 'Auto-accept all prompts including the initial --all confirm',
    },
    {
      flag: '-i, --interactive',
      description: 'Interactive rebase (manual pick/squash/edit)',
    },
    {
      flag: '-s, --squash',
      description: 'Auto-squash multiple commits into one',
    },
    {
      flag: '--stay',
      description: "Stay on rebased branch (don't return to original)",
    },
  ],
  examples: [
    {
      command: 'gli rebase',
      description: 'Select a branch to rebase',
    },
    {
      command: 'gli rebase --all',
      description: 'Rebase all stale branches',
    },
    {
      command: 'gli rebase -i',
      description: 'Interactive rebase with manual control',
    },
    {
      command: 'gli rebase -s',
      description: 'Auto-squash commits before rebasing',
    },
    {
      command: 'gli rebase --all --stay',
      description: 'Rebase all, stay on last branch',
    },
    {
      command: 'gli rebase --all -y',
      description: 'Rebase all stale branches, auto-confirm everything',
    },
  ],
  howItWorks: [
    'Fetches your open PRs and shows status',
    'Identifies branches that are BEHIND or have CONFLICTS',
    'For each branch: fetch, checkout, rebase, prompt to push',
    'Uses --force-with-lease for safe force-pushing',
    'Returns to original branch (unless --stay flag)',
  ],
};
