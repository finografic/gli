import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

export const statusHelp: CommandHelpConfig = {
  command: 'gli status',
  description: 'Snapshot of PR status (same as gli live, exits immediately)',
  usage: 'gli status',
  options: [
    {
      flag: '--compact',
      description: 'Show compact view (hides title, shows only status icons)',
    },
  ],
  examples: [
    {
      command: 'gli status',
      description: 'Print PR status and exit',
    },
    {
      command: 'gli status --compact',
      description: 'Print compact PR status and exit',
    },
  ],
};
