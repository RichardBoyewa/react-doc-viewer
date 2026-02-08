import React, { useEffect, useRef, useState } from "react";

export const DEFAULT_ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export interface PdfToolbarProps {
  currentPage: number;
  totalPages: number | null;
  pageInputValue: string;
  onPageInputChange: (value: string) => void;
  onPageInputSubmit: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  zoomMode: "custom" | "pageFit";
  effectiveZoom: number;
  zoomPresets?: number[];
  onZoomChange: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  showSearch?: boolean;
  searchQuery?: string;
  matchIndex?: number;
  matchCount?: number;
  onSearchQueryChange?: (value: string) => void;
  onSearchNext?: () => void;
  onSearchPrev?: () => void;
  showPrint?: boolean;
  showFullscreen?: boolean;
  backgroundColor?: string;
  onDownload?: () => void;
  onPrint?: () => void;
  onFullscreen?: () => void;
}

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ChevronUp = () => <Icon d="M18 15l-6-6-6 6" />;
const ChevronDown = () => <Icon d="M6 9l6 6 6-6" />;
const SearchIcon = () => <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />;
const ZoomOut = () => <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M8 11h6" />;
const ZoomIn = () => <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const PrintIcon = () => <Icon d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />;
const FullscreenIcon = () => <Icon d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />;
const SidebarIcon = () => <Icon d="M3 3h18v18H3zM9 3v18" />;

const styles = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    minHeight: 40,
    padding: "0 8px",
    background: "#f0f0f0",
    borderBottom: "1px solid #d4d4d4",
    gap: 4,
    flexShrink: 0,
    zIndex: 10,
    position: "relative" as const,
  },
  toolbarGroup: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  toolbarBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    background: "transparent",
    borderRadius: 4,
    cursor: "pointer",
    color: "#444",
    padding: 0,
    transition: "background 0.15s",
  },
  toolbarBtnHover: {
    background: "#ddd",
  },
  pageInput: {
    width: 40,
    height: 26,
    border: "1px solid #ccc",
    borderRadius: 4,
    textAlign: "center" as const,
    fontSize: 13,
    background: "#fff",
    outline: "none",
    padding: 0,
  },
  pageTotal: {
    fontSize: 13,
    color: "#666",
    marginLeft: 2,
    userSelect: "none" as const,
  },
  zoomSelect: {
    height: 26,
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: 13,
    background: "#fff",
    paddingLeft: 6,
    paddingRight: 2,
    cursor: "pointer",
    outline: "none",
  },
  zoomWrap: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
  },
  zoomButton: {
    height: 30,
    minWidth: 70,
    border: "1px solid #cfcfcf",
    borderRadius: 6,
    background: "#fff",
    padding: "0 10px",
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#333",
  },
  zoomCaret: {
    marginTop: 2,
  },
  zoomDropdown: {
    position: "absolute" as const,
    top: "100%",
    marginTop: 6,
    left: 0,
    background: "#fff",
    border: "1px solid #d4d4d4",
    borderRadius: 8,
    boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
    minWidth: 150,
    padding: "6px 0",
    zIndex: 20,
  },
  zoomCaretTip: {
    position: "absolute" as const,
    top: -6,
    left: 28,
    width: 12,
    height: 12,
    background: "#fff",
    borderLeft: "1px solid #d4d4d4",
    borderTop: "1px solid #d4d4d4",
    transform: "rotate(45deg)",
  },
  zoomItem: {
    fontSize: 13,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  zoomItemHover: {
    background: "#f0f0f0",
  },
  zoomDivider: {
    height: 1,
    background: "#e0e0e0",
    margin: "6px 0",
  },
  separator: {
    width: 1,
    height: 20,
    background: "#ccc",
    margin: "0 4px",
    flexShrink: 0,
  },
  searchWrap: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  searchDropdown: {
    position: "absolute" as const,
    top: "100%",
    marginTop: 0,
    left: 50,
    background: "#f2f2f2",
    border: "1px solid #d4d4d4",
    borderRadius: 8,
    padding: "10px 12px",
    minWidth: 320,
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    zIndex: 20,
  },
  searchInput: {
    height: 28,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 13,
    background: "#fff",
    outline: "none",
    padding: "0 8px 0 28px",
    width: 220,
  },
  searchIcon: {
    position: "absolute" as const,
    left: 10,
    color: "#777",
  },
  matchCount: {
    fontSize: 12,
    color: "#666",
    minWidth: 40,
    textAlign: "left" as const,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    color: "#666",
    padding: "2px 6px",
  },
};

function ToolbarBtn({ children, title, onClick, disabled, active }: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.toolbarBtn,
        ...(hover || active ? styles.toolbarBtnHover : {}),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ZoomItem({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.zoomItem,
        ...(hover || active ? styles.zoomItemHover : {}),
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </div>
  );
}

export function PdfToolbar({
  currentPage,
  totalPages,
  pageInputValue,
  onPageInputChange,
  onPageInputSubmit,
  onPrevPage,
  onNextPage,
  zoomMode,
  effectiveZoom,
  zoomPresets = DEFAULT_ZOOM_PRESETS,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  showSidebarToggle = false,
  sidebarOpen,
  onToggleSidebar,
  showSearch = true,
  searchQuery,
  matchIndex,
  matchCount,
  onSearchQueryChange,
  onSearchNext,
  onSearchPrev,
  showPrint = true,
  showFullscreen = true,
  backgroundColor,
  onDownload,
  onPrint,
  onFullscreen,
}: PdfToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomPercent = Math.round(effectiveZoom * 100);
  const zoomRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showSearch) setSearchOpen(false);
  }, [showSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!zoomRef.current) return;
      if (!zoomRef.current.contains(e.target as Node)) {
        setZoomOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [zoomOpen]);

  return (
    <div style={{ ...styles.toolbar, ...(backgroundColor ? { background: backgroundColor } : {}) }}>
      <div style={styles.toolbarGroup}>
        {showSidebarToggle && (
          <>
            <ToolbarBtn title="Toggle sidebar" onClick={onToggleSidebar} active={sidebarOpen}>
              <SidebarIcon />
            </ToolbarBtn>
            <div style={styles.separator} />
          </>
        )}
        {showSearch && (
          <ToolbarBtn title="Search" onClick={() => setSearchOpen((o) => !o)} active={searchOpen}>
            <SearchIcon />
          </ToolbarBtn>
        )}
        <ToolbarBtn title="Previous page" onClick={onPrevPage} disabled={currentPage <= 1}>
          <ChevronUp />
        </ToolbarBtn>
        <input
          style={styles.pageInput}
          value={pageInputValue}
          onChange={(e) => onPageInputChange(e.target.value)}
          onBlur={onPageInputSubmit}
          onKeyDown={(e) => e.key === "Enter" && onPageInputSubmit()}
        />
        <span style={styles.pageTotal}>/ {totalPages ?? "–"}</span>
        <ToolbarBtn title="Next page" onClick={onNextPage} disabled={!totalPages || currentPage >= totalPages}>
          <ChevronDown />
        </ToolbarBtn>
      </div>

      <div style={styles.toolbarGroup}>
        <ToolbarBtn title="Zoom out" onClick={onZoomOut}>
          <ZoomOut />
        </ToolbarBtn>
        <div style={styles.zoomWrap} ref={zoomRef}>
          <button
            type="button"
            style={styles.zoomButton}
            onClick={() => setZoomOpen((o) => !o)}
            title="Zoom level"
          >
            <span>{zoomPercent}%</span>
            <span style={styles.zoomCaret}><ChevronDown /></span>
          </button>
          {zoomOpen && (
            <div style={styles.zoomDropdown}>
              <div style={styles.zoomCaretTip} />
              {["Actual size", "Page fit", "Page width"].map((label) => (
                <ZoomItem
                  key={label}
                  label={label}
                  active={
                    label === "Actual size"
                      ? zoomPercent === 100 && zoomMode === "custom"
                      : label === "Page fit" && zoomMode === "pageFit"
                  }
                  onClick={() => {
                    if (label === "Actual size") {
                      onZoomChange("1");
                    } else {
                      onZoomChange("pageFit");
                    }
                    setZoomOpen(false);
                  }}
                />
              ))}
              <div style={styles.zoomDivider} />
              {zoomPresets.map((p) => (
                <ZoomItem
                  key={p}
                  label={`${Math.round(p * 100)}%`}
                  active={zoomMode === "custom" && Math.abs(p - effectiveZoom) < 0.001}
                  onClick={() => {
                    onZoomChange(String(p));
                    setZoomOpen(false);
                  }}
                />
              ))}
              {zoomMode === "custom" && !zoomPresets.includes(effectiveZoom) && (
                <ZoomItem
                  label={`${zoomPercent}%`}
                  active
                  onClick={() => setZoomOpen(false)}
                />
              )}
            </div>
          )}
        </div>
        <ToolbarBtn title="Zoom in" onClick={onZoomIn}>
          <ZoomIn />
        </ToolbarBtn>
      </div>

      <div style={styles.toolbarGroup}>
        <ToolbarBtn title="Download" onClick={onDownload}>
          <DownloadIcon />
        </ToolbarBtn>
        {showPrint && (
          <ToolbarBtn title="Print" onClick={onPrint}>
            <PrintIcon />
          </ToolbarBtn>
        )}
        {showFullscreen && (
          <ToolbarBtn title="Fullscreen" onClick={onFullscreen}>
            <FullscreenIcon />
          </ToolbarBtn>
        )}
      </div>
      {showSearch && searchOpen && (
        <div style={styles.searchDropdown}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}><SearchIcon /></span>
            <input
              style={styles.searchInput}
              placeholder="Enter to search"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              ref={searchInputRef}
            />
          </div>
          <span style={styles.matchCount}>
            {matchCount ? `${matchIndex ?? 0}/${matchCount}` : "0/0"}
          </span>
          <ToolbarBtn title="Previous match" onClick={onSearchPrev} disabled={!matchCount || !onSearchPrev}>
            <ChevronUp />
          </ToolbarBtn>
          <ToolbarBtn title="Next match" onClick={onSearchNext} disabled={!matchCount || !onSearchNext}>
            <ChevronDown />
          </ToolbarBtn>
          <button type="button" style={styles.closeBtn} onClick={() => setSearchOpen(false)}>×</button>
        </div>
      )}
    </div>
  );
}
