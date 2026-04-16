import type { CommandHelpConfig } from '@finografic/cli-kit/render-help';

/**
 * Help copy mirrors runtime defaults: live interval 60s, auto-rebase every 4th refresh, compact toggle on
 * space — see `config/defaults.constants.ts` and `config/ui.constants.ts`.
 */
export const liveHelp: CommandHelpConfig = {
  command: 'gli live',
  description: 'Live-updating PR status dashboard (⭐ RECOMMENDED)',
  usage: 'gli live',
  options: [
    {
      flag: '--compact',
      description: 'Start in compact view (toggle anytime with [space])',
    },
    {
      flag: '--auto-rebase',
      description: 'Silently rebase stale branches every 4 refreshes',
    },
  ],
  examples: [
    {
      command: 'gli live',
      description: 'Start live dashboard (refreshes every 60s by default)',
    },
    {
      command: 'gli live --auto-rebase',
      description: 'Live dashboard with background auto-rebase of stale branches',
    },
    {
      command: 'gli config edit',
      description: 'Customize refresh interval, enable auto-rebase by default, and other settings',
    },
  ],
  sections: [
    {
      title: 'DESCRIPTION',
      content: `  Live-updating terminal dashboard for PR status, like htop but for your PRs.
  Perfect for running in a terminal panel to monitor pull requests in real-time.

  The dashboard shows:
  - PR list with status indicators (clickable PR numbers and repo names)
  - Build and approval status columns
  - Config path footer

  Refresh interval defaults to 60s. Customize via \`gli config edit\` (live.interval).

  Auto-rebase mode (--auto-rebase or live.autoRebase: true in config) silently rebases
  stale branches every 4 refreshes. Conflicts are skipped with a
  warning shown in the footer. No prompts — fully automatic.`,
    },
  ],
};
