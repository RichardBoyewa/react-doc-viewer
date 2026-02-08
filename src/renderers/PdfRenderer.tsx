import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Outline, Page, Thumbnail } from "react-pdf";
import { pdfjs } from "react-pdf";
import type { PdfSidebarMode, RendererProps } from "../types";
import { PdfToolbar } from "../components/PdfToolbar";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type WindowWithWorkerOverride = Window & {
  __DOCUMENT_VIEWER_WORKER_SRC__?: string;
};

function getPdfWorkerSrc(): string {
  if (typeof window !== "undefined") {
    const override = (window as WindowWithWorkerOverride).__DOCUMENT_VIEWER_WORKER_SRC__;
    if (typeof override === "string" && override.trim().length > 0) {
      return override;
    }
  }
  return "pdf.worker.js";
}

/** A4 width in CSS pixels (210 mm at 96 dpi). */
const A4_WIDTH_PX = 794;
const SIDEBAR_WIDTH = 180;

const SPIN_KEYFRAMES = `
@keyframes document-viewer-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

function getCanvasDpr(resolutionScale?: number): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return (resolutionScale ?? 1) * dpr;
}

function setCanvasImageSmoothing(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = "high";
  }
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    width: "100%",
    background: "#525659",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#333",
    fontSize: 14,
  },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    position: "relative" as const,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    minWidth: SIDEBAR_WIDTH,
    background: "#f7f7f7",
    borderRight: "1px solid #d4d4d4",
    overflowY: "auto" as const,
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    alignItems: "center",
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 5,
    transition: "transform 0.2s ease, opacity 0.2s ease",
    willChange: "transform, opacity",
  },
  sidebarClosed: {
    transform: `translateX(-${SIDEBAR_WIDTH}px)`,
    opacity: 0,
    pointerEvents: "none" as const,
  },
  sidebarTabs: {
    display: "flex",
    gap: 4,
    marginBottom: 6,
  },
  sidebarTab: (active: boolean) => ({
    fontSize: 12,
    padding: "4px 6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: active ? "#e0e0e0" : "#fff",
    cursor: "pointer",
  }),
  sidebarThumb: (active: boolean) => ({
    border: active ? "2px solid #4A90D9" : "2px solid transparent",
    borderRadius: 3,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    background: "#fff",
  }),
  sidebarLabel: (active: boolean) => ({
    fontSize: 11,
    color: active ? "#4A90D9" : "#666",
    textAlign: "center" as const,
    marginTop: 2,
  }),
  outlineWrapper: {
    width: "100%",
    padding: "0 6px",
    fontSize: 12,
    color: "#333",
  },
  viewer: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "16px 0",
    gap: 12,
    width: "100%",
  },
  viewerContentShift: (shift: number) => ({
    marginLeft: shift,
    transition: "margin-left 0.2s ease",
    width: shift ? `calc(100% - ${shift}px)` : "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
  }),
  pageWrapper: {
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    background: "#fff",
    lineHeight: 0,
  },
};

const spinnerStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  border: "2px solid #c7c7c7",
  borderTopColor: "#6b6b6b",
  borderRadius: "50%",
  animation: "document-viewer-spin 1s linear infinite",
};

const NON_PX_PROPERTIES = new Set(["opacity", "zIndex", "fontWeight", "lineHeight"]);

function styleToInline(style?: React.CSSProperties): string {
  if (!style) return "";
  return Object.entries(style)
    .map(([key, value]) => {
      if (value == null) return "";
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      if (typeof value === "number" && !NON_PX_PROPERTIES.has(key)) {
        return `${cssKey}:${value}px`;
      }
      return `${cssKey}:${String(value)}`;
    })
    .filter(Boolean)
    .join(";");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const EXTERNAL_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function isExternalLinkHref(href: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.href);
    return EXTERNAL_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function getDownloadFileName(source: RendererProps["originalSrc"], fallback?: string): string {
  if (fallback && fallback.trim().length > 0) return fallback;
  if (typeof source === "string") {
    try {
      const url = new URL(source, window.location.href);
      const last = url.pathname.split("/").filter(Boolean).pop();
      if (last) return decodeURIComponent(last);
    } catch {
      return "";
    }
  }
  if (source instanceof File && source.name) return source.name;
  return "";
}

/* ── Main component ───────────────────────────────────────────────── */

export function PdfRenderer({ src, originalSrc, mimeType, options }: RendererProps) {
  const workerSrc = getPdfWorkerSrc();
  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const pdfDocRef = useRef<any>(null);
  const [zoom, setZoom] = useState(options?.zoom ?? 1);
  const [zoomMode, setZoomMode] = useState<"custom" | "pageFit">("pageFit");
  const viewerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollingToPage = useRef(false);
  const viewerReadyCalledRef = useRef(false);
  const showToolbar = options?.showToolbar ?? true;
  const showSearch = options?.showSearch ?? true;
  const showPrint = options?.showPrint ?? true;
  const showFullscreen = options?.showFullscreen ?? true;
  const sidebarMode: PdfSidebarMode = options?.sidebarMode ?? (options?.showSidebar === false ? "none" : "thumbnails");
  const sidebarToggleEnabled = sidebarMode !== "none";
  const [sidebarOpen, setSidebarOpen] = useState(sidebarToggleEnabled);
  const [sidebarTab, setSidebarTab] = useState<"thumbnails" | "outline">(
    sidebarMode === "outline" ? "outline" : "thumbnails"
  );
  const searchHighlightClassName =
    options?.searchHighlightClassName ?? "document-viewer-search-hit";
  const searchHighlightStyle = options?.searchTextHighlightStyle ?? options?.searchHighlightStyle;
  const searchHighlightStyleString = useMemo(
    () => styleToInline(searchHighlightStyle),
    [searchHighlightStyle]
  );
  const searchActiveHighlightClassName =
    options?.searchActiveHighlightClassName ?? "document-viewer-search-hit-active";
  const searchActiveHighlightStyle = options?.searchActiveHighlightStyle;
  const searchActiveHighlightStyleString = useMemo(
    () => styleToInline(searchActiveHighlightStyle),
    [searchActiveHighlightStyle]
  );
  const highlightPageTextMode = options?.highlightPageText ?? "none";
  const highlightPageNumber = options?.highlightPageNumber;
  const highlightPageTextStyle = options?.highlightPageTextStyle ?? { backgroundColor: "#daf0f6" };
  const highlightPageTextStyleString = useMemo(
    () => styleToInline(highlightPageTextStyle),
    [highlightPageTextStyle]
  );
  const activeMatchPage = searchMatches.length > 0 ? searchMatches[searchIndex] : null;

  const canvasDpr = getCanvasDpr(options?.resolutionScale);
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    setCanvasImageSmoothing(el);
  }, []);

  // Page-fit: compute zoom so page fits the viewport width
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (zoomMode !== "pageFit" || !viewerRef.current) return;
    const el = viewerRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomMode]);

  const effectiveZoom = useMemo(() => {
    if (zoomMode === "pageFit" && containerWidth > 0) {
      const padding = 48; // 24px each side
      return Math.min((containerWidth - padding) / A4_WIDTH_PX, 2);
    }
    return zoom;
  }, [zoomMode, containerWidth, zoom]);

  useEffect(() => {
    if (sidebarMode !== "both") {
      setSidebarTab(sidebarMode === "outline" ? "outline" : "thumbnails");
    }
    if (sidebarMode === "none") {
      setSidebarOpen(false);
    }
  }, [sidebarMode]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!isExternalLinkHref(href)) return;
      event.preventDefault();
      event.stopPropagation();
      window.open(href, "_blank", "noopener,noreferrer");
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  // Sync page input display
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  const scrollToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    if (!el) return;
    scrollingToPage.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentPage(page);
    setTimeout(() => { scrollingToPage.current = false; }, 500);
  }, []);

  const nextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const next = (searchIndex + 1) % searchMatches.length;
    setSearchIndex(next);
    scrollToPage(searchMatches[next]);
  }, [searchMatches, searchIndex, scrollToPage]);

  const prevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prev = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchIndex(prev);
    scrollToPage(searchMatches[prev]);
  }, [searchMatches, searchIndex, scrollToPage]);

  const viewerApi = useMemo(() => ({
    scrollToPage,
    setSearchQuery,
    nextMatch,
    prevMatch,
  }), [scrollToPage, nextMatch, prevMatch]);

  useEffect(() => {
    if (!options?.onViewerReady || viewerReadyCalledRef.current) return;
    viewerReadyCalledRef.current = true;
    options.onViewerReady(viewerApi);
  }, [options?.onViewerReady, viewerApi]);

  // Track which page is visible while scrolling
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !numPages) return;
    let ticking = false;
    const onScroll = () => {
      if (scrollingToPage.current) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const viewerRect = viewer.getBoundingClientRect();
        let closest = 1;
        let closestRatio = 0;
        pageRefs.current.forEach((el, page) => {
          const rect = el.getBoundingClientRect();
          const intersectionHeight = Math.max(
            0,
            Math.min(rect.bottom, viewerRect.bottom) - Math.max(rect.top, viewerRect.top)
          );
          const ratio = rect.height > 0 ? intersectionHeight / rect.height : 0;
          if (ratio > closestRatio) {
            closestRatio = ratio;
            closest = page;
          }
        });
        if (closestRatio > 0) setCurrentPage(closest);
      });
    };
    viewer.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => viewer.removeEventListener("scroll", onScroll);
  }, [numPages]);

  // scrollToPage is defined above with useCallback

  function handlePageInputSubmit() {
    const n = parseInt(pageInputValue, 10);
    if (!isNaN(n) && n >= 1 && numPages && n <= numPages) {
      scrollToPage(n);
    } else {
      setPageInputValue(String(currentPage));
    }
  }

  function handleZoomChange(value: string) {
    if (value === "pageFit") {
      setZoomMode("pageFit");
    } else {
      setZoomMode("custom");
      setZoom(parseFloat(value));
    }
  }

  function handleZoomIn() {
    setZoomMode("custom");
    setZoom((z) => {
      const next = [0.5, 0.75, 1, 1.25, 1.5, 2, 3].find((p) => p > z + 0.01);
      return next ?? Math.min(z + 0.25, 5);
    });
  }

  function handleZoomOut() {
    setZoomMode("custom");
    setZoom((z) => {
      const next = [...[0.5, 0.75, 1, 1.25, 1.5, 2, 3]].reverse().find((p) => p < z - 0.01);
      return next ?? Math.max(z - 0.25, 0.25);
    });
  }

  function handleDownload() {
    if (options?.onDownload) {
      options.onDownload(originalSrc, mimeType);
      return;
    }
    const downloadName = getDownloadFileName(originalSrc, options?.downloadFileName);
    if (typeof originalSrc === "string") {
      const a = document.createElement("a");
      a.href = originalSrc;
      if (downloadName) a.download = downloadName;
      a.click();
      return;
    }
    const url = URL.createObjectURL(originalSrc);
    const a = document.createElement("a");
    a.href = url;
    if (downloadName) a.download = downloadName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handlePrint() {
    if (options?.onPrint) {
      options.onPrint(originalSrc, mimeType);
      return;
    }
    const openAndPrint = (url: string) => {
      const w = window.open(url);
      if (w) {
        w.addEventListener("load", () => w.print());
      }
    };
    if (typeof originalSrc === "string") {
      openAndPrint(originalSrc);
      return;
    }
    const url = URL.createObjectURL(originalSrc);
    openAndPrint(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleFullscreen() {
    if (options?.onFullscreen) {
      options.onFullscreen(rootRef.current);
      return;
    }
    const el = rootRef.current;
    if (el) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        el.requestFullscreen?.();
      }
    }
  }

  const handleOutlineClick = useCallback(({ pageIndex, pageNumber }: { pageIndex?: number; pageNumber?: number }) => {
    if (typeof pageNumber === "number") {
      scrollToPage(pageNumber);
    } else if (typeof pageIndex === "number") {
      scrollToPage(pageIndex + 1);
    }
  }, [scrollToPage]);

  // nextMatch/prevMatch are defined above with useCallback

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || !pdfDocRef.current || !numPages) {
      setSearchMatches([]);
      setSearchIndex(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const matches: number[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
        const page = await pdfDocRef.current.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<{ str?: string }>;
        const joined = items.map((item) => item.str ?? "").join("").toLowerCase();
        const joinedWithSpaces = items.map((item) => item.str ?? "").join(" ").toLowerCase();
        if (joined.includes(query) || joinedWithSpaces.includes(query)) {
          matches.push(pageNum);
        }
      }
      if (!cancelled) {
        setSearchMatches(matches);
        setSearchIndex(0);
        if (matches.length > 0) {
          scrollToPage(matches[0]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, numPages]);

  const highlightPageSet = useMemo(() => {
    const set = new Set<number>();
    if (highlightPageTextMode === "current" || highlightPageTextMode === "both") {
      set.add(currentPage);
    }
    if (
      (highlightPageTextMode === "page" || highlightPageTextMode === "both") &&
      typeof highlightPageNumber === "number" &&
      highlightPageNumber > 0
    ) {
      set.add(highlightPageNumber);
    }
    return set;
  }, [highlightPageTextMode, highlightPageNumber, currentPage]);

  const customTextRenderer = useMemo(() => {
    const query = searchQuery.trim();
    const enableFullHighlight = highlightPageTextMode !== "none";
    if (!query && !enableFullHighlight) return undefined;
    const queryLower = query.toLowerCase();
    return ({ str, pageNumber }: { str: string; pageNumber?: number }) => {
      if (!str) return "";
      const shouldHighlightAll = pageNumber != null && highlightPageSet.has(pageNumber);
      let result = "";
      if (query) {
        const lower = str.toLowerCase();
        const isActivePage = pageNumber != null && activeMatchPage === pageNumber;
        let idx = 0;
        while (true) {
          const found = lower.indexOf(queryLower, idx);
          if (found === -1) {
            result += escapeHtml(str.slice(idx));
            break;
          }
          result += escapeHtml(str.slice(idx, found));
          const match = str.slice(found, found + query.length);
          const className = isActivePage
            ? `${searchHighlightClassName} ${searchActiveHighlightClassName}`.trim()
            : searchHighlightClassName;
          const style = isActivePage
            ? [searchHighlightStyleString, searchActiveHighlightStyleString].filter(Boolean).join(";")
            : searchHighlightStyleString;
          result += `<span class="${className}" style="${style}">${escapeHtml(match)}</span>`;
          idx = found + query.length;
        }
      } else {
        result = escapeHtml(str);
      }

      if (enableFullHighlight && shouldHighlightAll) {
        return `<span style="${highlightPageTextStyleString}">${result}</span>`;
      }
      return result;
    };
  }, [
    searchQuery,
    searchHighlightClassName,
    searchHighlightStyleString,
    searchActiveHighlightClassName,
    searchActiveHighlightStyleString,
    activeMatchPage,
    highlightPageTextMode,
    highlightPageSet,
    highlightPageTextStyleString,
  ]);

  const handleDocumentLoadSuccess = useCallback((pdf: { numPages: number }) => {
    pdfDocRef.current = pdf;
    setNumPages(pdf.numPages);
  }, []);

  const pageNodes = useMemo(() => {
    if (numPages === null) return null;
    return Array.from({ length: numPages }, (_, i) => {
      const page = i + 1;
      return (
        <div
          key={page}
          ref={(el) => { if (el) pageRefs.current.set(page, el); else pageRefs.current.delete(page); }}
          style={{
            ...styles.pageWrapper,
            ...(options?.pageBackgroundColor ? { background: options.pageBackgroundColor } : {}),
          }}
        >
          <Page
            pageNumber={page}
            width={A4_WIDTH_PX}
            scale={effectiveZoom}
            devicePixelRatio={canvasDpr}
            canvasRef={canvasRef}
            customTextRenderer={customTextRenderer}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </div>
      );
    });
  }, [numPages, options?.pageBackgroundColor, effectiveZoom, canvasDpr, customTextRenderer, canvasRef]);

  const mainDocument = useMemo(() => (
    <Document
      file={src}
      onItemClick={handleOutlineClick}
      onLoadSuccess={handleDocumentLoadSuccess}
      loading={
        <div className="document-viewer-loading" style={{ padding: 32, display: "flex", justifyContent: "center" }}>
          <div style={spinnerStyle} aria-label="Loading PDF" />
        </div>
      }
      error={<div className="document-viewer-error" style={{ padding: 32, color: "#c44" }}>Failed to load PDF</div>}
    >
      {pageNodes}
    </Document>
  ), [src, handleOutlineClick, handleDocumentLoadSuccess, pageNodes]);

  return (
    <div
      style={{
        ...styles.root,
        ...(options?.viewerBackgroundColor ? { background: options.viewerBackgroundColor } : {}),
      }}
      data-testid="pdf-renderer"
      ref={rootRef}
    >
      <style>{SPIN_KEYFRAMES}</style>
      {showToolbar && (
        <PdfToolbar
          currentPage={currentPage}
          totalPages={numPages}
          pageInputValue={pageInputValue}
          onPageInputChange={setPageInputValue}
          onPageInputSubmit={handlePageInputSubmit}
          onPrevPage={() => scrollToPage(Math.max(1, currentPage - 1))}
          onNextPage={() => scrollToPage(Math.min(numPages ?? 1, currentPage + 1))}
          zoomMode={zoomMode}
          effectiveZoom={effectiveZoom}
          onZoomChange={handleZoomChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          showSidebarToggle={sidebarToggleEnabled}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
            showSearch={showSearch}
            searchQuery={searchQuery}
            matchIndex={searchMatches.length ? searchIndex + 1 : 0}
            matchCount={searchMatches.length}
            onSearchQueryChange={showSearch ? setSearchQuery : undefined}
            onSearchPrev={showSearch ? prevMatch : undefined}
            onSearchNext={showSearch ? nextMatch : undefined}
          showPrint={showPrint}
          showFullscreen={showFullscreen}
          backgroundColor={options?.toolbarBackgroundColor}
          onDownload={handleDownload}
          onPrint={handlePrint}
          onFullscreen={handleFullscreen}
        />
      )}

      <div style={styles.body}>
        {sidebarToggleEnabled && numPages && (
          <div
            style={{
              ...styles.sidebar,
              ...(sidebarOpen ? {} : styles.sidebarClosed),
            }}
            className="document-viewer-sidebar"
          >
            {sidebarMode === "both" && (
              <div style={styles.sidebarTabs}>
                <button type="button" style={styles.sidebarTab(sidebarTab === "thumbnails")} onClick={() => setSidebarTab("thumbnails")}>
                  Thumbs
                </button>
                <button type="button" style={styles.sidebarTab(sidebarTab === "outline")} onClick={() => setSidebarTab("outline")}>
                  Outline
                </button>
              </div>
            )}
            <Document
              file={src}
              onItemClick={handleOutlineClick}
              loading={
                <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
                  <div style={spinnerStyle} aria-label="Loading thumbnails" />
                </div>
              }
            >
              {sidebarTab === "thumbnails" && (
                <>
                  {Array.from({ length: numPages }, (_, i) => {
                    const page = i + 1;
                    const active = page === currentPage;
                    return (
                      <div
                        key={page}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          scrollToPage(page);
                        }}
                        onClickCapture={(e) => {
                          // Prevent any nested links from opening new tabs
                          if ((e.target as HTMLElement).tagName === 'A') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        style={{ cursor: "pointer", marginBottom: 4 }}
                      >
                        <div style={{ ...styles.sidebarThumb(active), pointerEvents: "none" }}>
                          <Thumbnail pageNumber={page} width={SIDEBAR_WIDTH - 24} />
                        </div>
                        <div style={styles.sidebarLabel(active)}>{page}</div>
                      </div>
                    );
                  })}
                </>
              )}
              {sidebarTab === "outline" && (
                <div style={styles.outlineWrapper}>
                  <Outline onItemClick={handleOutlineClick} />
                </div>
              )}
            </Document>
          </div>
        )}

        <div ref={viewerRef} style={styles.viewer} className="document-viewer-pdf-viewer">
          <div style={styles.viewerContentShift(sidebarToggleEnabled && sidebarOpen ? SIDEBAR_WIDTH : 0)}>
            {mainDocument}
          </div>
        </div>
      </div>
    </div>
  );
}
