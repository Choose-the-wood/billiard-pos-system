/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALI_SPEECH_APP_KEY: string;
  readonly VITE_ALI_ACCESS_KEY_ID: string;
  readonly VITE_ALI_ACCESS_KEY_SECRET: string;
  readonly VITE_QWEN_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
