// ⚠️ AVOID EDITING THIS FILE DIRECTLY — changes must be propagated to all @finografic CLI repos
import pc from 'picocolors';
import type { CommandHelpConfig, HelpConfig } from './help.types.js';

function colorizeArgs(str: string): string {
  return str.replace(/<[^>]+>/g, (m) => pc.dim(pc.cyan(m)));
}

function colorizeUsage(usage: string): string {
  return usage
    .replace(/^([^\s<[]+(?:\s+[^\s<[]+)*)/, (m) => pc.cyanBright(m))
    .replace(/<[^>]+>/g, (m) => pc.dim(pc.cyan(m)));
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

export function renderCommandHelp({
  command,
  description,
  usage,
  subcommands,
  options,
  examples,
  requirements,
  howItWorks,
  sections,
}: CommandHelpConfig): void {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${pc.bold(command)} - ${description}`);
  lines.push('');

  lines.push(pc.bold('USAGE'));
  lines.push(`  ${colorizeUsage(usage)}`);
  lines.push('');

  if (subcommands && subcommands.length > 0) {
    lines.push(pc.bold('SUBCOMMANDS'));
    const maxLen = Math.max(...subcommands.map((s) => s.name.length));
    for (const sub of subcommands) {
      lines.push(`  ${pc.cyan(sub.name)}${' '.repeat(maxLen - sub.name.length + 4)}${sub.description}`);
    }
    lines.push('');
  }

  if (options && options.length > 0) {
    lines.push(pc.bold('OPTIONS'));
    const maxLen = Math.max(...options.map((f) => f.flag.length));
    for (const opt of options) {
      lines.push(`  ${opt.flag.padEnd(maxLen + 4)}${opt.description}`);
    }
    lines.push('');
  }

  if (examples && examples.length > 0) {
    lines.push(pc.bold('EXAMPLES'));
    const maxLen = Math.max(...examples.map((e) => e.command.length));
    for (const ex of examples) {
      lines.push(`  ${ex.command.padEnd(maxLen + 4)}${pc.dim('# ' + ex.description)}`);
    }
    lines.push('');
  }

  if (requirements && requirements.length > 0) {
    lines.push(pc.bold('REQUIREMENTS'));
    for (const req of requirements) {
      lines.push(`  - ${req}`);
    }
    lines.push('');
  }

  if (howItWorks && howItWorks.length > 0) {
    lines.push(pc.bold('HOW IT WORKS'));
    for (let i = 0; i < howItWorks.length; i++) {
      lines.push(`  ${i + 1}. ${howItWorks[i]}`);
    }
    lines.push('');
  }

  if (sections && sections.length > 0) {
    for (const section of sections) {
      lines.push(pc.bold(section.title));
      lines.push(section.content);
      lines.push('');
    }
  }

  console.log(lines.join('\n'));
}
