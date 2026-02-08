import React, { useState, useEffect } from "react";
import mammoth from "mammoth";
import DOMPurify from "dompurify";
import type { RendererProps } from "../types";

export function DocxRenderer({ src, originalSrc }: RendererProps) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let arrayBuffer: ArrayBuffer;
        if (typeof src === "string" && src.startsWith("http")) {
          const res = await fetch(src);
          if (!res.ok) throw new Error("Failed to fetch document");
          arrayBuffer = await res.arrayBuffer();
        } else if (originalSrc instanceof Blob) {
          arrayBuffer = await originalSrc.arrayBuffer();
        } else {
          const res = await fetch(src);
          arrayBuffer = await res.arrayBuffer();
        }
        if (cancelled) return;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(DOMPurify.sanitize(result.value));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load DOCX");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [src, originalSrc]);

  if (error) {
    return (
      <div className="document-viewer-error" data-testid="docx-renderer-error">
        {error}
      </div>
    );
  }

  return (
    <div
      className="document-viewer-docx"
      data-testid="docx-renderer"
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
