const API_BASE = "http://localhost:8000/api/v1";
const AUTH_STORAGE_KEY = "portfolio_auth_session";

let refreshPromise = null;
let currentUserCache = null;

function readStoredSession(storage) {
  const rawValue = storage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function getStoredSession() {
  return readStoredSession(sessionStorage) || readStoredSession(localStorage);
}

function writeStoredSession(sessionData) {
  const targetStorage = sessionData.remember_me ? localStorage : sessionStorage;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
}

function setStoredSession(authPayload, rememberMe = false) {
  const sessionData = {
    ...authPayload,
    remember_me: rememberMe,
  };
  writeStoredSession(sessionData);
  currentUserCache = authPayload.user || null;
  return sessionData;
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  currentUserCache = null;
}

function hasSession() {
  const session = getStoredSession();
  return Boolean(session?.access_token && session?.refresh_token);
}

function buildApiUrl(path) {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function parseApiError(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data.detail || data.message || fallbackMessage;
  } catch (error) {
    return fallbackMessage;
  }
}

async function refreshAccessToken() {
  const currentSession = getStoredSession();
  if (!currentSession?.refresh_token) {
    clearStoredSession();
    throw new Error("AUTH_REQUIRED");
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(buildApiUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: currentSession.refresh_token,
      }),
    });

    if (!response.ok) {
      clearStoredSession();
      throw new Error(await parseApiError(response, "Session expired"));
    }

    const data = await response.json();
    setStoredSession(data, currentSession.remember_me === true);
    return data;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchWithAuth(path, options = {}, retry = true) {
  const currentSession = getStoredSession();
  if (!currentSession?.access_token) {
    throw new Error("AUTH_REQUIRED");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${currentSession.access_token}`);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && retry) {
    await refreshAccessToken();
    return fetchWithAuth(path, options, false);
  }

  if (response.status === 401) {
    clearStoredSession();
    throw new Error("AUTH_REQUIRED");
  }

  return response;
}

async function fetchJsonWithAuth(path, options = {}, retry = true) {
  const response = await fetchWithAuth(path, options, retry);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Request failed"));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function persistCurrentUser(user) {
  const currentSession = getStoredSession();
  if (!currentSession) {
    return;
  }

  writeStoredSession({
    ...currentSession,
    user,
  });
  currentUserCache = user;
}

async function fetchCurrentUser({ force = false } = {}) {
  if (!force && currentUserCache) {
    return currentUserCache;
  }

  const user = await fetchJsonWithAuth("/auth/me");
  persistCurrentUser(user);
  return user;
}

async function requireAuth({ loginPath = "loginindex.html" } = {}) {
  if (!hasSession()) {
    window.location.href = loginPath;
    throw new Error("AUTH_REQUIRED");
  }

  try {
    return await fetchCurrentUser();
  } catch (error) {
    clearStoredSession();
    window.location.href = loginPath;
    throw error;
  }
}

async function redirectIfAuthenticated(redirectTo = "index.html") {
  if (!hasSession()) {
    return false;
  }

  try {
    await fetchCurrentUser();
    window.location.href = redirectTo;
    return true;
  } catch (error) {
    clearStoredSession();
    return false;
  }
}

async function logout({ redirectTo } = {}) {
  const currentSession = getStoredSession();
  try {
    if (currentSession?.access_token) {
      await fetch(buildApiUrl("/auth/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });
    }
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    clearStoredSession();
  }

  if (redirectTo) {
    window.location.href = redirectTo;
  }
}

window.AuthClient = {
  API_BASE,
  clearStoredSession,
  fetchCurrentUser,
  fetchJsonWithAuth,
  fetchWithAuth,
  getStoredSession,
  hasSession,
  logout,
  redirectIfAuthenticated,
  refreshAccessToken,
  requireAuth,
  setStoredSession,
};
