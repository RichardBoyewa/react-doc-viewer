import "./renderers";

export { DocumentViewer } from "./DocumentViewer";
export { PdfToolbar } from "./components/PdfToolbar";
export { getRendererKey } from "./FormatRouter";
export { registerRenderer, getRendererFactory, hasRenderer } from "./RendererRegistry";
export type {
  DocumentViewerProps,
  DocumentSource,
  ViewerOptions,
  ViewerTheme,
  PdfSidebarMode,
  PdfViewerApi,
  RendererKey,
  RendererProps,
  RendererComponent,
  RendererFactory,
} from "./types";
export type { PdfToolbarProps } from "./components/PdfToolbar";
