import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

export const configHelp: CommandHelpConfig = {
  command: 'gli config',
  description: 'Manage multi-repo configuration',
  usage: 'gli config <subcommand>',
  subcommands: [
    { name: 'watch', description: 'Add a repository to the config (prompts for path and GitHub URL)' },
    { name: 'list', description: 'List all configured repositories' },
    { name: 'remove', description: 'Remove a repository from the config' },
    { name: 'edit', description: 'Open config file in $EDITOR' },
  ],
  examples: [
    { command: 'gli config watch', description: 'Add current directory (or chosen path) to config' },
    { command: 'gli config list', description: 'Show all repos' },
    { command: 'gli config remove', description: 'Remove a repo' },
    { command: 'gli config edit', description: 'Edit config in $EDITOR / vim' },
  ],
};
