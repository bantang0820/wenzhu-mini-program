const ADMIN_TOKEN_KEY = 'wenzhu_admin_token';

export const getAdminToken = (): string => localStorage.getItem(ADMIN_TOKEN_KEY) || '';

export const setAdminToken = (token: string): void => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminToken = (): void => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const isAdminLoggedIn = (): boolean => Boolean(getAdminToken());
