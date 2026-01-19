// Use the same key as Admin.tsx for consistency
const ADMIN_TOKEN_KEY = 'optiflow_admin_token_v1';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    console.error('Failed to store admin token');
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    console.error('Failed to clear admin token');
  }
}
