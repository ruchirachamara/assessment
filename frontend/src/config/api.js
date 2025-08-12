const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3001',
    timeout: 10000,
  },
  production: {
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 15000,
  },
  test: {
    baseURL: 'http://localhost:3001',
    timeout: 5000,
  }
};

const environment = process.env.NODE_ENV || 'development';
const config = API_CONFIG[environment];

export const API_BASE_URL = config.baseURL;
export const API_TIMEOUT = config.timeout;

export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}/api${endpoint}`;
};