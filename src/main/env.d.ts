/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly MQTT_URL: string;
  readonly MQTT_USER: string;
  readonly MQTT_PASS: string;
  readonly AGENT_BEARER?: string;
  readonly AGENT_PORT?: string;
  readonly GEMMA_BASE_URL?: string;
  readonly GEMMA_BEARER?: string;
  readonly GEMMA_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
