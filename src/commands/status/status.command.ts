import { exit } from 'node:process';
import { renderCommandHelp } from '@finografic/cli-kit/render-help';
import { statusHelp } from 'commands/status/status.help.js';
import pc from 'picocolors';

import { readConfig } from 'utils/config.utils.js';
import { assertGhAvailable } from 'utils/gh.utils.js';
import { fetchPrSections, renderDisplay } from 'utils/pr-sections.utils.js';

import { DEFAULT_LIVE_INTERVAL_SECONDS, DEFAULT_PR_TITLE_MAX_CHARS } from 'config/defaults.constants.js';
import { DEFAULT_PR_TITLE_SLICE_START } from 'config/ui.constants.js';

interface RunStatusCommandParams {
  argv: string[];
}

/**
 * Run the status command — same output as `gli live`, exits after one render.
 */
export async function runStatusCommand({ argv }: RunStatusCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    renderCommandHelp(statusHelp);
    return;
  }

  // Check gh availability
  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.error(pc.red('Error:'), error instanceof Error ? error.message : 'GitHub CLI not available');
    exit(1);
  }

  try {
    const config = await readConfig();
    const sections = await fetchPrSections();
    const compact = argv.includes('--compact');

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const liveInterval = config.live?.interval ?? DEFAULT_LIVE_INTERVAL_SECONDS;

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: false,
      compact,
      jiraConfig: config.jira,
    });

    console.log(output);
  } catch (error: unknown) {
    console.error(`\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    exit(1);
  }
}
