// Global type definitions for window extensions and other global types

interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

export {};

