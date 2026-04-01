import { exit } from 'node:process';

import pc from 'picocolors';

import {
  DEFAULT_LIVE_INTERVAL,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from '../../config/defaults.constants.js';
import { DEFAULT_PR_TITLE_SLICE_START } from '../../config/ui.constants.js';
import { readConfig } from '../../utils/config.utils.js';
import { assertGhAvailable } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { fetchPrSections, renderDisplay } from '../../utils/pr-sections.utils.js';

interface RunStatusCommandParams {
  argv: string[];
}

/**
 * Run the status command — same output as `gli live`, exits after one render.
 */
export async function runStatusCommand({ argv }: RunStatusCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
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
    });
    return;
  }

  // Check gh availability
  try {
    await assertGhAvailable();
  } catch (error: unknown) {
    console.error(
      pc.red('Error:'),
      error instanceof Error ? error.message : 'GitHub CLI not available',
    );
    exit(1);
  }

  try {
    const config = readConfig();
    const sections = await fetchPrSections();
    const compact = argv.includes('--compact');

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const liveInterval = config.liveInterval ?? DEFAULT_LIVE_INTERVAL;

    const output = renderDisplay({
      sections,
      showTitle,
      titleMaxChars,
      titleSliceStart,
      liveInterval,
      isLive: false,
      compact,
    });

    console.log(output);
  } catch (error: unknown) {
    console.error(
      `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    exit(1);
  }
}
