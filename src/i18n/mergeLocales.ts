/** Shallow-merge locale JSON modules into one i18next resource object. */
export function mergeLocales(...parts: Record<string, unknown>[]): Record<string, unknown> {
  return Object.assign({}, ...parts);
}
