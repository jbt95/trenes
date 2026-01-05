/// <reference types="vite/client" />

// biome-ignore lint/correctness/noUnusedVariables: declaration merging for Vite env typing
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
