declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE?: string;
      FRONTEND_BASE_PATH?: string;
    };
  }
}

export {};
