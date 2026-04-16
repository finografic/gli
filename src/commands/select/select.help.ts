import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

export const selectHelp: CommandHelpConfig = {
  command: 'gli select',
  description: 'Interactively checkout a branch from one of your open PRs',
  usage: 'gli select',
  examples: [
    {
      command: 'gli select',
      description: 'Show PR list and select a branch to checkout',
    },
  ],
};
