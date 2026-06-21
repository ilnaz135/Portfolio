(function () {
  const API_PORT = "8001";
  const API_HOST = "127.0.0.1";
  const API_PREFIX = "/api/v1";

  const configuredOrigin = String(window.PORTFOLIO_API_ORIGIN || "").replace(/\/+$/, "");
  const apiOrigin = configuredOrigin || `http://${API_HOST}:${API_PORT}`;

  window.PORTFOLIO_API_PORT = API_PORT;
  window.PORTFOLIO_API_BASE = `${apiOrigin}${API_PREFIX}`;
})();
