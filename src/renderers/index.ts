import { registerRenderer } from "../RendererRegistry";
import type { RendererKey } from "../types";

registerRenderer("pdf", () =>
  import("./PdfRenderer").then((m) => ({ default: m.PdfRenderer }))
);
registerRenderer("pdf-ocr", () =>
  import("./PdfOcrRenderer").then((m) => ({ default: m.PdfOcrRenderer }))
);
registerRenderer("docx", () =>
  import("./DocxRenderer").then((m) => ({ default: m.DocxRenderer }))
);
registerRenderer("office-pdf", () =>
  import("./OfficePdfFallback").then((m) => ({ default: m.OfficePdfFallback }))
);
