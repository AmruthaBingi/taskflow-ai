const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5050/api`;

let onUnauthorized = null;
let authExpiredFlag = false;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !authExpiredFlag) {
    authExpiredFlag = true;
    try {
      if (typeof onUnauthorized === 'function') onUnauthorized(data);
    } finally {
      authExpiredFlag = false;
    }
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
