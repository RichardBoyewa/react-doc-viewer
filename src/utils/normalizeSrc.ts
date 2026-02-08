import type { DocumentSource } from "../types";

/**
 * Normalizes document source to a string URL.
 * - string: returned as-is (assumed to be URL).
 * - Blob/File: creates object URL; caller must revoke when done.
 */
export function normalizeSrcToUrl(src: DocumentSource): { url: string; revoke?: () => void } {
  if (typeof src === "string") {
    return { url: src };
  }
  if (src instanceof Blob) {
    const url = URL.createObjectURL(src);
    return {
      url,
      revoke: () => URL.revokeObjectURL(url),
    };
  }
  return { url: "" };
}
