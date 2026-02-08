import { describe, it, expect } from "vitest";
import { getRendererKey } from "./FormatRouter";

describe("getRendererKey", () => {
  it("returns pdf for PDF URL", () => {
    expect(getRendererKey("https://example.com/doc.pdf")).toEqual({
      rendererKey: "pdf",
      mimeType: "application/pdf",
    });
  });

  it("returns pdf-ocr when enableOCR is true for PDF", () => {
    expect(getRendererKey("https://example.com/doc.pdf", undefined, true)).toEqual({
      rendererKey: "pdf-ocr",
      mimeType: "application/pdf",
    });
  });

  it("returns pdf for application/pdf MIME", () => {
    expect(getRendererKey("https://example.com/x", "application/pdf")).toEqual({
      rendererKey: "pdf",
      mimeType: "application/pdf",
    });
  });

  it("returns docx for DOCX URL", () => {
    expect(getRendererKey("https://example.com/doc.docx")).toEqual({
      rendererKey: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("returns docx for DOCX MIME", () => {
    expect(
      getRendererKey("https://example.com/x", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toEqual({
      rendererKey: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("returns office-pdf for PPTX URL", () => {
    expect(getRendererKey("https://example.com/slide.pptx")).toEqual({
      rendererKey: "office-pdf",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  });

  it("returns office-pdf for PPTX MIME", () => {
    expect(
      getRendererKey("https://example.com/x", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    ).toEqual({
      rendererKey: "office-pdf",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  });

  it("uses extension fallback when MIME is missing", () => {
    expect(getRendererKey("https://example.com/file.pdf")).toEqual({
      rendererKey: "pdf",
      mimeType: "application/pdf",
    });
    expect(getRendererKey("/path/to/doc.docx")).toEqual({
      rendererKey: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("returns unsupported for unknown extension", () => {
    expect(getRendererKey("https://example.com/file.xyz")).toEqual({
      rendererKey: "unsupported",
      mimeType: undefined,
    });
  });

  it("returns unsupported for unknown MIME", () => {
    expect(getRendererKey("https://example.com/x", "application/unknown")).toEqual({
      rendererKey: "unsupported",
      mimeType: "application/unknown",
    });
  });

  it("returns correct key for Blob with PDF type", () => {
    const blob = new Blob([], { type: "application/pdf" });
    expect(getRendererKey(blob)).toEqual({
      rendererKey: "pdf",
      mimeType: "application/pdf",
    });
    expect(getRendererKey(blob, undefined, true)).toEqual({
      rendererKey: "pdf-ocr",
      mimeType: "application/pdf",
    });
  });

  it("returns docx for Blob with DOCX type", () => {
    const blob = new Blob([], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(getRendererKey(blob)).toEqual({
      rendererKey: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });
});
