import type { ReactNode } from "react";

/** Document source: URL string or Blob/File */
export type DocumentSource = string | Blob | File;

/** Renderer key returned by FormatRouter */
export type RendererKey =
  | "pdf"
  | "pdf-ocr"
  | "docx"
  | "office-pdf"
  | "unsupported";

/** PDF sidebar mode */
export type PdfSidebarMode = "none" | "thumbnails" | "outline" | "both";

export interface PdfViewerApi {
  scrollToPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

/** Options passed to DocumentViewer */
export interface ViewerOptions {
  /** Enable OCR for scanned PDFs (adds text layer) */
  enableOCR?: boolean;
  /** Resolution scale for PDF canvas (e.g. 1.5 for sharper rendering). Combined with devicePixelRatio. */
  resolutionScale?: number;
  /** Show the built-in PDF toolbar (page nav, zoom, actions). */
  showToolbar?: boolean;
  /** Show the search input in the PDF toolbar. */
  showSearch?: boolean;
  /** Show the print button in the PDF toolbar. */
  showPrint?: boolean;
  /** Show the fullscreen button in the PDF toolbar. */
  showFullscreen?: boolean;
  /** Background color for the viewer area (outside the page). */
  viewerBackgroundColor?: string;
  /** Background color for the PDF page surface. */
  pageBackgroundColor?: string;
  /** Background color for the toolbar. */
  toolbarBackgroundColor?: string;
  /** Show the left thumbnail sidebar in the PDF viewer. */
  showSidebar?: boolean;
  /** Sidebar mode for PDF viewer. Overrides showSidebar when provided. */
  sidebarMode?: PdfSidebarMode;
  /** Provides an API for controlling the PDF viewer (e.g. scrollToPage). */
  onViewerReady?: (api: PdfViewerApi) => void;
  /** Style overrides for search highlight spans in the PDF text layer. */
  searchHighlightStyle?: React.CSSProperties;
  /** Style overrides for search highlight spans (alias of searchHighlightStyle). */
  searchTextHighlightStyle?: React.CSSProperties;
  /** Class name applied to search highlight spans in the PDF text layer. */
  searchHighlightClassName?: string;
  /** Style overrides for the active search match spans in the PDF text layer. */
  searchActiveHighlightStyle?: React.CSSProperties;
  /** Class name applied to active search match spans in the PDF text layer. */
  searchActiveHighlightClassName?: string;
  /** Highlight all text on selected pages (current, specific page, both, or none). */
  highlightPageText?: "none" | "current" | "page" | "both";
  /** Page number (1-based) to highlight when highlightPageText is "page" or "both". */
  highlightPageNumber?: number;
  /** Style overrides for full-page text highlight spans. */
  highlightPageTextStyle?: React.CSSProperties;
  /** Called when the user triggers download in the PDF toolbar. */
  onDownload?: (source: DocumentSource, mimeType: string) => void;
  /** File name used by the default download handler. */
  downloadFileName?: string;
  /** Called when the user triggers print in the PDF toolbar. */
  onPrint?: (source: DocumentSource, mimeType: string) => void;
  /** Called when the user triggers fullscreen in the PDF toolbar. */
  onFullscreen?: (container: HTMLElement | null) => void;
  /** Prefer server conversion to PDF for Office (DOCX/PPTX) when onRequestPdfConversion is provided */
  preferPdfConversionForOffice?: boolean;
  /** URL of conversion worker: POST Office file to this URL to get PDF (multipart/form-data field "file"). Response: application/pdf body or JSON { url }. */
  conversionWorkerUrl?: string;
  /** Zoom multiplier for PDF (e.g. 1.5). Combined with resolutionScale and devicePixelRatio. */
  zoom?: number;
}

/** Theme overrides for the viewer UI */
export interface ViewerTheme {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
  disableThemeScrollbar?: boolean;
}

/** Props for DocumentViewer */
export interface DocumentViewerProps {
  /** Document source: URL string or Blob/File */
  src: DocumentSource;
  /** Optional MIME type (e.g. application/pdf). Inferred from URL/extension if omitted. */
  mimeType?: string;
  /** Viewer options */
  options?: ViewerOptions;
  /** Theme overrides */
  theme?: ViewerTheme;
  /** Callback to convert Office (DOCX/PPTX) to PDF URL for high-fidelity viewing */
  onRequestPdfConversion?: (file: Blob, mimeType: string) => Promise<string>;
  /** Called when conversion fails (e.g. worker error). */
  onConversionError?: (error: Error) => void;
  /** Optional retry callback; when provided, error UI can show a Retry button that calls this. */
  onRetry?: () => void;
  /** Additional CSS class for the container */
  className?: string;
  /** Inline styles for the container */
  style?: React.CSSProperties;
}

/** Props passed to each renderer (internal) */
export interface RendererProps {
  /** Resolved URL (for URL src) or object URL (for Blob/File) */
  src: string;
  /** Original document source */
  originalSrc: DocumentSource;
  /** Resolved MIME type */
  mimeType: string;
  /** Viewer options */
  options?: ViewerOptions;
  /** Theme */
  theme?: ViewerTheme;
}

/** Lazy-loaded renderer component type */
export type RendererComponent = React.ComponentType<RendererProps>;

/** Factory for lazy loading a renderer */
export type RendererFactory = () => Promise<{ default: RendererComponent }>;
