// Módulo compartilhado para configuração de ambiente
// Centraliza a leitura de variáveis de ambiente com fallback
// Utiliza env-config.json se disponível, caso contrário usa __ENV

const DEFAULT_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: '123456',
};

export function getConfig() {
  return {
    BASE_URL: __ENV.BASE_URL || DEFAULT_CONFIG.BASE_URL,
    USERNAME: __ENV.ADMIN_USERNAME || DEFAULT_CONFIG.ADMIN_USERNAME,
    PASSWORD: __ENV.ADMIN_PASSWORD || DEFAULT_CONFIG.ADMIN_PASSWORD,
  };
}

export const BASE_URL = __ENV.BASE_URL || DEFAULT_CONFIG.BASE_URL;
export const USERNAME = __ENV.ADMIN_USERNAME || DEFAULT_CONFIG.ADMIN_USERNAME;
export const PASSWORD = __ENV.ADMIN_PASSWORD || DEFAULT_CONFIG.ADMIN_PASSWORD;
