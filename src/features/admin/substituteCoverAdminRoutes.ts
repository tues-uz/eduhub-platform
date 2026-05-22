/** Deep links for admin substitute workflow (notifications + detail page). */

export const ADMIN_SUBSTITUTE_REQUESTS_BASE = "/dashboard/admin/substitute-requests";

export type SubstituteInviteRefLike = {
  refId?: string;
  href?: string;
};

export function resolveAdminSubstituteInviteId(n: SubstituteInviteRefLike): string | null {
  const rid = n.refId?.trim();
  if (rid) return rid;
  const href = n.href?.trim();
  if (!href?.startsWith(`${ADMIN_SUBSTITUTE_REQUESTS_BASE}/`)) return null;
  const rest = href.slice(`${ADMIN_SUBSTITUTE_REQUESTS_BASE}/`.length).split(/[?#]/)[0]?.trim();
  return rest || null;
}

export function adminSubstituteDetailHref(inviteId: string): string {
  return `${ADMIN_SUBSTITUTE_REQUESTS_BASE}/${inviteId}`;
}
