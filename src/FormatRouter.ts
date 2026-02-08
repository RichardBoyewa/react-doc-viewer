import type { DocumentSource, RendererKey } from "./types";

const MIME_TO_RENDERER: Record<string, RendererKey> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "office-pdf",
  "application/vnd.ms-powerpoint": "office-pdf",
  "application/msword": "office-pdf",
};

const EXT_TO_RENDERER: Record<string, RendererKey> = {
  pdf: "pdf",
  docx: "docx",
  doc: "office-pdf",
  pptx: "office-pdf",
  ppt: "office-pdf",
};

/**
 * Resolves MIME type from src when not provided.
 * - For URL: uses pathname extension.
 * - For Blob/File: uses type property (may be empty).
 */
function inferMimeType(src: DocumentSource): string | undefined {
  if (typeof src === "string") {
    try {
      const url = new URL(src, "https://example.com");
      const pathname = url.pathname || "";
      const ext = pathname.split(".").pop()?.toLowerCase();
      if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
    } catch {
      const ext = src.split(".").pop()?.toLowerCase();
      if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
    }
    return undefined;
  }
  if (src instanceof Blob && src.type) return src.type;
  return undefined;
}

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
};

/**
 * Selects the renderer key for the given document source and options.
 * - If mimeType is provided, it takes precedence.
 * - Otherwise infers from src (URL extension or Blob.type).
 * - For PDF, options.enableOCR selects "pdf-ocr" vs "pdf".
 */
export function getRendererKey(
  src: DocumentSource,
  mimeType?: string,
  enableOCR?: boolean
): { rendererKey: RendererKey; mimeType: string | undefined } {
  const resolvedMime = mimeType ?? inferMimeType(src);
  if (resolvedMime && MIME_TO_RENDERER[resolvedMime]) {
    let key = MIME_TO_RENDERER[resolvedMime];
    if (key === "pdf" && enableOCR) key = "pdf-ocr";
    return { rendererKey: key, mimeType: resolvedMime };
  }
  if (typeof src === "string") {
    try {
      const url = new URL(src, "https://example.com");
      const pathname = url.pathname || "";
      const ext = pathname.split(".").pop()?.toLowerCase();
      if (ext && EXT_TO_RENDERER[ext]) {
        let key = EXT_TO_RENDERER[ext];
        if (key === "pdf" && enableOCR) key = "pdf-ocr";
        return {
          rendererKey: key,
          mimeType: EXT_TO_MIME[ext] ?? resolvedMime,
        };
      }
    } catch {
      const ext = src.split(".").pop()?.toLowerCase();
      if (ext && EXT_TO_RENDERER[ext]) {
        let key = EXT_TO_RENDERER[ext];
        if (key === "pdf" && enableOCR) key = "pdf-ocr";
        return {
          rendererKey: key,
          mimeType: EXT_TO_MIME[ext] ?? resolvedMime,
        };
      }
    }
  }
  if (src instanceof Blob && src.type && MIME_TO_RENDERER[src.type]) {
    let key = MIME_TO_RENDERER[src.type];
    if (key === "pdf" && enableOCR) key = "pdf-ocr";
    return { rendererKey: key, mimeType: src.type };
  }
  return { rendererKey: "unsupported", mimeType: resolvedMime };
}
