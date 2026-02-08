import React, { useState, useCallback } from "react";
import { DocumentViewer } from "document-viewer";
import type { PdfViewerApi } from "document-viewer";

const SAMPLES = [
  { label: "Sample PDF", url: "/samples/sample.pdf", mime: "application/pdf" as const },
  { label: "EFG_Investment_Opportunities_Meeting PDF", url: "/samples/EFG_Investment_Opportunities_Meeting.pdf", mime: "application/pdf" as const },
];

export default function App() {
  const [src, setSrc] = useState<string | File | null>(SAMPLES[0].url);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [enableOCR, setEnableOCR] = useState(false);
  const [resolutionScale, setResolutionScale] = useState(2);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showSearch, setShowSearch] = useState(true);
  const [showPrint, setShowPrint] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<"none" | "thumbnails" | "outline" | "both">("thumbnails");
  const [viewerBackgroundColor, setViewerBackgroundColor] = useState("#525659");
  const [pageBackgroundColor, setPageBackgroundColor] = useState("#ffffff");
  const [toolbarBackgroundColor, setToolbarBackgroundColor] = useState("#f0f0f0");
  const [conversionWorkerUrl, setConversionWorkerUrl] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [viewerApi, setViewerApi] = useState<PdfViewerApi | null>(null);

  const effectiveSrc = src ?? undefined;
  const options = {
    enableOCR,
    resolutionScale,
    showToolbar,
    showSearch,
    showPrint,
    showFullscreen,
    showSidebar,
    sidebarMode,
    viewerBackgroundColor,
    pageBackgroundColor,
    toolbarBackgroundColor,
    searchHighlightStyle: { backgroundColor: "#ffe58f", color: "#000" },
    searchActiveHighlightStyle: { backgroundColor: "#ffb74d", color: "#000" },
    onViewerReady: (api: PdfViewerApi) => setViewerApi(api),
    conversionWorkerUrl: conversionWorkerUrl.trim() || undefined,
  };

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrc(file);
      setMimeType(undefined);
    }
  };

  const handleSample = (url: string, mime: string) => {
    setSrc(url);
    setMimeType(mime);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Minimal settings bar (viewer toolbar is built-in) */}
      <header
        style={{
          padding: "8px 16px",
          background: "#2b2b2b",
          borderBottom: "1px solid #444",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          fontSize: 13,
          color: "#ccc",
        }}
      >
        <select
          value={typeof src === "string" && SAMPLES.some((s) => s.url === src) ? src : ""}
          onChange={(e) => {
            const s = SAMPLES.find((s) => s.url === e.target.value);
            if (s) handleSample(s.url, s.mime);
          }}
          style={{ fontSize: 13 }}
        >
          <option value="">—</option>
          {SAMPLES.map((s) => (
            <option key={s.url} value={s.url}>{s.label}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          File <input type="file" accept=".pdf,.docx,.pptx" onChange={handleFile} style={{ fontSize: 12 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={enableOCR} onChange={(e) => setEnableOCR(e.target.checked)} /> OCR
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} /> Toolbar
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showSearch} onChange={(e) => setShowSearch(e.target.checked)} /> Search
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showPrint} onChange={(e) => setShowPrint(e.target.checked)} /> Print
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showFullscreen} onChange={(e) => setShowFullscreen(e.target.checked)} /> Fullscreen
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Viewer BG
          <input type="color" value={viewerBackgroundColor} onChange={(e) => setViewerBackgroundColor(e.target.value)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Page BG
          <input type="color" value={pageBackgroundColor} onChange={(e) => setPageBackgroundColor(e.target.value)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Toolbar BG
          <input type="color" value={toolbarBackgroundColor} onChange={(e) => setToolbarBackgroundColor(e.target.value)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showSidebar} onChange={(e) => setShowSidebar(e.target.checked)} /> Sidebar
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Sidebar mode
          <select value={sidebarMode} onChange={(e) => setSidebarMode(e.target.value as typeof sidebarMode)} style={{ fontSize: 13 }}>
            <option value="thumbnails">Thumbnails</option>
            <option value="outline">Outline</option>
            <option value="both">Both</option>
            <option value="none">None</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => viewerApi?.scrollToPage(2)}
          disabled={!viewerApi}
          style={{ fontSize: 12 }}
        >
          Go to page 2
        </button>
        <button
          type="button"
          onClick={() => viewerApi?.setSearchQuery("market")}
          disabled={!viewerApi}
          style={{ fontSize: 12 }}
        >
          Search \"market\"
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Quality
          <input
            type="number"
            min={1}
            max={3}
            step={0.5}
            value={resolutionScale}
            onChange={(e) => setResolutionScale(Number(e.target.value))}
            style={{ width: 48, fontSize: 13 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Conversion URL
          <input
            type="text"
            placeholder="http://localhost:3333/convert"
            value={conversionWorkerUrl}
            onChange={(e) => setConversionWorkerUrl(e.target.value)}
            style={{ width: 200, fontSize: 12 }}
          />
        </label>
      </header>

      {/* Document viewer fills the remaining space */}
      <main key={retryKey} style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {effectiveSrc ? (
          <DocumentViewer
            src={effectiveSrc}
            mimeType={mimeType}
            options={options}
            onRetry={handleRetry}
            style={{ flex: 1, minHeight: 0 }}
          />
        ) : (
          <div style={{ padding: 24, color: "#888" }}>Select a sample or file.</div>
        )}
      </main>
    </div>
  );
}
