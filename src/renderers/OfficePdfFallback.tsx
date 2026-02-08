import React from "react";
import type { RendererProps } from "../types";

/**
 * OfficePdfFallback is used when the host provides onRequestPdfConversion.
 * DocumentViewer should call that callback and then render the returned PDF URL
 * with PdfRenderer. This component is only mounted when we already have a PDF URL
 * from conversion (handled by DocumentViewer routing). So here we just show
 * a message if someone lands on this renderer without conversion.
 */
export function OfficePdfFallback({ originalSrc }: RendererProps) {
  const isBlob = originalSrc instanceof Blob;
  return (
    <div className="document-viewer-office-fallback" data-testid="office-pdf-fallback">
      {isBlob ? (
        <p>
          For high-fidelity viewing of Office documents, provide{" "}
          <code>onRequestPdfConversion</code> to convert this file to PDF on the server.
        </p>
      ) : (
        <p>Provide a PDF URL after server conversion, or use DOCX renderer for semantic preview.</p>
      )}
    </div>
  );
}
