import pc from 'picocolors';

export function printHelp(): void {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${pc.bold('gli')} - Git utilities for monitoring and managing PRs from the terminal`);
  lines.push('');

  lines.push(pc.bold('USAGE'));
  lines.push(`  ${pc.cyanBright('gli')} ${pc.dim(pc.cyan('<command>'))} [options]`);
  lines.push('');

  lines.push(pc.bold('COMMANDS'));
  const commands = [
    { name: 'live', desc: 'Live-updating PR status dashboard (⭐ FEATURE)' },
    { name: 'status', desc: 'Show merge status of your open PRs' },
    { name: 'rebase', desc: 'Interactively rebase branches that are behind' },
    { name: 'select', desc: 'Interactively checkout a branch for one of your PRs' },
    { name: 'config', desc: 'Manage multi-repo configuration' },
  ];
  const maxNameLength = Math.max(...commands.map((c) => c.name.length));
  for (const cmd of commands) {
    lines.push(
      `  ${pc.cyan(cmd.name)}${' '.repeat(maxNameLength - cmd.name.length + 4)}${cmd.desc}`,
    );
  }
  lines.push('');

  lines.push(pc.bold('OPTIONS'));
  lines.push('  -h, --help       Show help for a command');
  lines.push('  -v, --version    Show version number');
  lines.push('');

  lines.push(pc.bold('EXAMPLES'));
  const examples = [
    { cmd: 'gli live', comment: 'Start live PR dashboard' },
    { cmd: 'gli status', comment: 'Snapshot of PR status (exits)' },
    { cmd: 'gli rebase', comment: 'Select and rebase a branch' },
    { cmd: 'gli rebase --all -y', comment: 'Rebase all stale branches, auto-confirm each' },
    { cmd: 'gli config add', comment: 'Add current repo to config' },
    { cmd: 'gli config edit', comment: 'Edit config in $EDITOR' },
  ];
  const maxCmdLength = Math.max(...examples.map((e) => e.cmd.length));
  for (const ex of examples) {
    lines.push(
      `  ${ex.cmd}${' '.repeat(maxCmdLength - ex.cmd.length + 4)}${pc.dim('# ' + ex.comment)}`,
    );
  }
  lines.push('');

  lines.push(pc.bold('GET HELP'));
  lines.push(
    `  ${pc.cyanBright('gli')} ${pc.dim(pc.cyan('<command>'))} --help       ${
      pc.dim('# Show detailed help for a command')
    }`,
  );
  lines.push('');

  console.log(lines.join('\n'));
}
