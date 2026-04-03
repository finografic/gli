import pc from 'picocolors';

interface HelpSection {
  title: string;
  content: string;
}

interface CommandHelpOptions {
  /** Command name (e.g., 'gli config') */
  command: string;
  /** Brief description */
  description: string;
  /** Usage pattern (e.g., 'gli config <subcommand>') */
  usage: string;
  /** Subcommands section */
  subcommands?: Array<{ name: string; description: string }>;
  /** Options/flags section */
  options?: Array<{ flag: string; description: string }>;
  /** Examples section */
  examples?: Array<{ command: string; description: string }>;
  /** Requirements section */
  requirements?: string[];
  /** How it works section */
  howItWorks?: string[];
  /** Additional custom sections */
  sections?: HelpSection[];
}

function colorizeUsage(usage: string): string {
  return usage
    .replace(/^([^\s<[]+(?:\s+[^\s<[]+)*)/, (m) => pc.cyanBright(m))
    .replace(/<[^>]+>/g, (m) => pc.dim(pc.cyan(m)));
}

/**
 * Format and print standardized help text for commands.
 * Based on V1's clean help template structure.
 */
export function printCommandHelp(options: CommandHelpOptions): void {
  const {
    command,
    description,
    usage,
    subcommands,
    options: flags,
    examples,
    requirements,
    howItWorks,
    sections,
  } = options;

  const lines: string[] = [];

  // Header: command name and description
  lines.push('');
  lines.push(`${pc.bold(command)} - ${description}`);
  lines.push('');

  // Usage section
  lines.push(pc.bold('USAGE'));
  lines.push(`  ${colorizeUsage(usage)}`);
  lines.push('');

  // Subcommands section
  if (subcommands && subcommands.length > 0) {
    lines.push(pc.bold('SUBCOMMANDS'));
    const maxNameLength = Math.max(...subcommands.map((s) => s.name.length));
    for (const sub of subcommands) {
      lines.push(
        `  ${pc.cyan(sub.name)}${' '.repeat(maxNameLength - sub.name.length + 4)}${sub.description}`,
      );
    }
    lines.push('');
  }

  // Options/flags section
  if (flags && flags.length > 0) {
    lines.push(pc.bold('OPTIONS'));
    const maxFlagLength = Math.max(...flags.map((f) => f.flag.length));
    for (const opt of flags) {
      lines.push(`  ${opt.flag.padEnd(maxFlagLength + 4)}${opt.description}`);
    }
    lines.push('');
  }

  // Examples section
  if (examples && examples.length > 0) {
    lines.push(pc.bold('EXAMPLES'));
    for (const ex of examples) {
      lines.push(`  ${ex.command.padEnd(40)}${pc.dim('# ' + ex.description)}`);
    }
    lines.push('');
  }

  // Requirements section
  if (requirements && requirements.length > 0) {
    lines.push(pc.bold('REQUIREMENTS'));
    for (const req of requirements) {
      lines.push(`  - ${req}`);
    }
    lines.push('');
  }

  // How it works section
  if (howItWorks && howItWorks.length > 0) {
    lines.push(pc.bold('HOW IT WORKS'));
    for (let i = 0; i < howItWorks.length; i++) {
      lines.push(`  ${i + 1}. ${howItWorks[i]}`);
    }
    lines.push('');
  }

  // Custom sections
  if (sections && sections.length > 0) {
    for (const section of sections) {
      lines.push(pc.bold(section.title));
      lines.push(section.content);
      lines.push('');
    }
  }

  console.log(lines.join('\n'));
}
