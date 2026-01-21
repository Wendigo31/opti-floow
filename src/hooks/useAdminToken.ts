// Use sessionStorage for better security (cleared on tab close)
const ADMIN_TOKEN_KEY = 'optiflow_admin_token_v2';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    console.error('Failed to store admin token');
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    // Also clear legacy localStorage key if exists
    localStorage.removeItem('optiflow_admin_token_v1');
  } catch {
    console.error('Failed to clear admin token');
  }
}
