/// <reference types="vite/client" />

declare global {
  interface Window {
    box2dwasm: () => Promise<any>;
  }
}

export {};
