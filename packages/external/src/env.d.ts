declare namespace NodeJS {
  interface ProcessEnv {
    NPM_REGISTRY: string;
    NPM_TOKEN: string;
    MAX_FILE_SIZE: string;
    CHUNK_SIZE: string;
  }
} 