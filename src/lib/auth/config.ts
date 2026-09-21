export const OWNER_USERNAME = process.env.APP_USER ?? "owner";
export const SESSION_COOKIE_NAME = "vetter_owner_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 10;
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
