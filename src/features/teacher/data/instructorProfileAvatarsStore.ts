const STORAGE_KEY = "eduhub.instructorProfileAvatars.v1";

type AvatarStore = {
  byEmail: Record<string, string>;
  byName: Record<string, string>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function load(): AvatarStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byEmail: {}, byName: {} };
    const parsed = JSON.parse(raw) as Partial<AvatarStore>;
    return {
      byEmail: parsed.byEmail && typeof parsed.byEmail === "object" ? parsed.byEmail : {},
      byName: parsed.byName && typeof parsed.byName === "object" ? parsed.byName : {},
    };
  } catch {
    return { byEmail: {}, byName: {} };
  }
}

function save(data: AvatarStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const instructorProfileAvatarsStore = {
  set(email: string, name: string, avatarUrl: string | undefined): void {
    const data = load();
    const emailKey = normalizeEmail(email);
    const nameKey = normalizeName(name);
    const url = avatarUrl?.trim();

    if (url) {
      if (emailKey) data.byEmail[emailKey] = url;
      if (nameKey) data.byName[nameKey] = url;
    } else {
      if (emailKey) delete data.byEmail[emailKey];
      if (nameKey) delete data.byName[nameKey];
    }

    save(data);
  },

  getByEmail(email: string): string | undefined {
    const url = load().byEmail[normalizeEmail(email)];
    return url?.trim() || undefined;
  },

  getByName(name: string): string | undefined {
    const url = load().byName[normalizeName(name)];
    return url?.trim() || undefined;
  },
};
