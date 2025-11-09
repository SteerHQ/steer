/**
 * Глобальная конфигурация API
 */
class ApiConfig {
  private static instance: ApiConfig;
  private apiKey: string = '';

  private constructor() {}

  static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }
}

export const apiConfig = ApiConfig.getInstance();
