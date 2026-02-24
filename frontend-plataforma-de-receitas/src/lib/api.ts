import axios from "axios";

const api = axios.create();

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    // Só retry em erros de rede ou 5xx, não em 4xx
    const isRetryable =
      !error.response || (error.response.status >= 500 && error.response.status < 600);

    if (config.__retryCount >= MAX_RETRIES || !isRetryable) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return api(config);
  }
);

export default api;
