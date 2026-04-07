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

export const resolveUsername = (params: {
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
  fallbackId?: string | null;
}) => {
  if (params.username && params.username.trim()) return params.username;

  const fromName = normalizeUsernameInput(params.fullName || "");
  if (fromName.length >= 3) return fromName;

  const fromEmail = normalizeUsernameInput((params.email || "").split("@")[0] || "");
  if (fromEmail.length >= 3) return fromEmail;

  const fromId = normalizeUsernameInput((params.fallbackId || "").replace(/-/g, "").slice(0, 12));
  if (fromId.length >= 3) return fromId;

  return "usuario";
};
