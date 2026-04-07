export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const normalizeUsernameInput = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 20);

export const formatUsername = (username?: string | null) =>
  username ? `@${username}` : "@usuario";
