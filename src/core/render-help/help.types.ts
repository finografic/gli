export interface HelpConfig {
  main: {
    bin: string;
    args?: string;
  };
  commands?: HelpNote;
  examples?: HelpNote;
  footer?: HelpNote;
  minWidth?: number;
}

export interface HelpMainNote {
  bin: string;
  args?: string;
}

export interface HelpNote {
  title: string;
  list: Array<{
    label: string;
    description: string;
  }>;
  options?: HelpNoteOptions;
}

export interface HelpNoteOptions {
  minWidth?: number;
  labels: {
    minWidth: number;
  };
}

export type HelpNoteReturn = [string, string, { format: (line: string) => string }];

export interface CommandHelpConfig {
  /** Command name as displayed in the header, e.g. 'gli config' */
  command: string;
  /** Brief one-line description */
  description: string;
  /** Usage pattern, e.g. 'gli config <subcommand>' */
  usage: string;
  /** Subcommands section */
  subcommands?: Array<{ name: string; description: string }>;
  /** Options/flags section */
  options?: Array<{ flag: string; description: string }>;
  /** Examples section — command is the exact invocation, description is the human comment */
  examples?: Array<{ command: string; description: string }>;
  /** Requirements section — rendered as a bulleted list */
  requirements?: string[];
  /** How it works section — rendered as a numbered list */
  howItWorks?: string[];
  /** Arbitrary additional sections with pre-formatted content */
  sections?: CommandHelpSection[];
}

export interface CommandHelpSection {
  title: string;
  content: string;
}
