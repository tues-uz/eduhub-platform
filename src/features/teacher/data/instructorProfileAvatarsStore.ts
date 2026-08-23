type AvatarStore = {
  byEmail: Record<string, string>;
  byName: Record<string, string>;
};

const memoryAvatars: AvatarStore = { byEmail: {}, byName: {} };

function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

function normalizeName(name?: string | null): string {
  return (name ?? "").trim().toLowerCase();
}

export const instructorProfileAvatarsStore = {
  set(email: string | undefined | null, name: string | undefined | null, avatarUrl: string | undefined): void {
    const emailKey = normalizeEmail(email);
    const nameKey = normalizeName(name);
    const url = avatarUrl?.trim();

    if (url) {
      if (emailKey) memoryAvatars.byEmail[emailKey] = url;
      if (nameKey) memoryAvatars.byName[nameKey] = url;
    } else {
      if (emailKey) delete memoryAvatars.byEmail[emailKey];
      if (nameKey) delete memoryAvatars.byName[nameKey];
    }
  },

  getByEmail(email?: string | null): string | undefined {
    const emailKey = normalizeEmail(email);
    if (!emailKey) return undefined;
    const url = memoryAvatars.byEmail[emailKey];
    return url?.trim() || undefined;
  },

  getByName(name?: string | null): string | undefined {
    const nameKey = normalizeName(name);
    if (!nameKey) return undefined;
    const url = memoryAvatars.byName[nameKey];
    return url?.trim() || undefined;
  },
};

