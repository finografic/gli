import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

export const configHelp: CommandHelpConfig = {
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
};
