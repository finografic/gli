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
