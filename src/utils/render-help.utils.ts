import pc from 'picocolors';

import type { HelpConfig } from 'types/help.types.js';

function colorizeArgs(str: string): string {
  return str.replace(/<[^>]+>/g, (m) => pc.dim(pc.cyan(m)));
}

export function renderHelp({ main, commands, examples, footer }: HelpConfig): void {
  const lines: string[] = [];

  // Header: binary name + optional args
  lines.push('');
  lines.push(pc.bold(pc.cyanBright(main.bin)) + (main.args ? ` ${colorizeArgs(main.args)}` : ''));
  lines.push('');

  // Commands section (label = command name, description = description)
  if (commands && commands.list.length > 0) {
    lines.push(pc.bold(commands.title.toUpperCase()));
    const maxLen = Math.max(...commands.list.map((c) => c.label.length));
    for (const item of commands.list) {
      lines.push(`  ${pc.cyan(item.label)}${' '.repeat(maxLen - item.label.length + 4)}${item.description}`);
    }
    lines.push('');
  }

  // Examples section (label = human comment, description = actual command)
  if (examples && examples.list.length > 0) {
    lines.push(pc.bold(examples.title.toUpperCase()));
    const maxLen = Math.max(...examples.list.map((e) => e.description.length));
    for (const item of examples.list) {
      const padding = ' '.repeat(maxLen - item.description.length + 4);
      const comment = item.label ? pc.dim('# ' + item.label) : '';
      lines.push(`  ${item.description}${padding}${comment}`);
    }
    lines.push('');
  }

  // Footer / show help section (label = text, description = optional note)
  if (footer && footer.list.length > 0) {
    lines.push(pc.bold(footer.title.toUpperCase()));
    for (const item of footer.list) {
      const desc = item.description ? `    ${pc.dim('# ' + item.description)}` : '';
      lines.push(`  ${colorizeArgs(item.label)}${desc}`);
    }
    lines.push('');
  }

  console.log(lines.join('\n'));
}
