/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_MODE?: string;
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
