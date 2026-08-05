type AvatarStore = {
  byEmail: Record<string, string>;
  byName: Record<string, string>;
};

const memoryAvatars: AvatarStore = { byEmail: {}, byName: {} };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export const instructorProfileAvatarsStore = {
  set(email: string, name: string, avatarUrl: string | undefined): void {
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

  getByEmail(email: string): string | undefined {
    const url = memoryAvatars.byEmail[normalizeEmail(email)];
    return url?.trim() || undefined;
  },

  getByName(name: string): string | undefined {
    const url = memoryAvatars.byName[normalizeName(name)];
    return url?.trim() || undefined;
  },
};

