/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly MQTT_URL: string;
  readonly MQTT_USER: string;
  readonly MQTT_PASS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
