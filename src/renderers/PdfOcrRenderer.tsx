import React, { useCallback, useState, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { createWorker } from "tesseract.js";
import type { RendererProps } from "../types";
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

/**
 * Canvas device pixel ratio: combines the host's resolutionScale (for sharper
 * embedded images) with the real device pixel ratio. This only affects the
 * internal canvas bitmap size, NOT the on-screen display size.
 */
function getCanvasDpr(resolutionScale?: number): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return (resolutionScale ?? 1) * dpr;
}

/** Set high-quality image smoothing on the canvas 2D context so embedded images scale better (e.g. in Edge). */
function setCanvasImageSmoothing(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = "high";
  }
}

interface OcrWord {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
}

interface PageOcrResult {
  words: OcrWord[];
  canvasWidth: number;
  canvasHeight: number;
  displayWidth: number;
  displayHeight: number;
  top: number;
}

/**
 * PDF renderer with Tesseract OCR text layer overlay for scanned PDFs.
 * Renders the raster at high DPI, then runs OCR on each page canvas and
 * overlays transparent text for selection/copy.
 */
export function PdfOcrRenderer({ src, options }: RendererProps) {
  const workerSrc = getPdfWorkerSrc();
  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }
  const [numPages, setNumPages] = useState<number | null>(null);
  const [ocrResults, setOcrResults] = useState<PageOcrResult[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoom = options?.zoom ?? 1;
  const canvasDpr = getCanvasDpr(options?.resolutionScale);
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    setCanvasImageSmoothing(el);
  }, []);

  useEffect(() => {
    if (!numPages || !containerRef.current) return;
    const container = containerRef.current;
    const canvases = container.querySelectorAll("canvas");
    if (canvases.length === 0) return;

    let cancelled = false;
    const containerRect = container.getBoundingClientRect();

    const runOcr = async () => {
      const worker = await createWorker("eng", 1, {
        logger: () => {},
      });
      try {
        const results: PageOcrResult[] = [];

        for (let i = 0; i < canvases.length && !cancelled; i++) {
          const canvas = canvases[i];
          const rect = canvas.getBoundingClientRect();
          const cw = canvas.width;
          const ch = canvas.height;
          const dw = rect.width;
          const dh = rect.height;
          const top = rect.top - containerRect.top + container.scrollTop;

          const {
            data: { words },
          } = await worker.recognize(canvas);
          if (cancelled) break;

          results.push({
            words: (words || []).map((w: { bbox: OcrWord["bbox"]; text: string }) => ({
              bbox: w.bbox,
              text: w.text,
            })),
            canvasWidth: cw,
            canvasHeight: ch,
            displayWidth: dw,
            displayHeight: dh,
            top,
          });
        }

        if (!cancelled) setOcrResults(results);
      } catch (e) {
        if (!cancelled)
          setOcrError(e instanceof Error ? e.message : "OCR failed");
      } finally {
        await worker.terminate();
      }
    };

    const t = setTimeout(runOcr, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [numPages, src]);

  return (
    <div
      ref={containerRef}
      className="document-viewer-pdf-ocr"
      data-testid="pdf-ocr-renderer"
      style={{ position: "relative" }}
    >
      <Document
        file={src}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={<div className="document-viewer-loading">Loading PDF…</div>}
        error={<div className="document-viewer-error">Failed to load PDF</div>}
      >
        {numPages !== null &&
          Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
              width={A4_WIDTH_PX}
              scale={zoom}
              devicePixelRatio={canvasDpr}
              canvasRef={canvasRef}
              renderTextLayer={false}
              renderAnnotationLayer={true}
            />
          ))}
      </Document>
      {ocrError && (
        <div className="document-viewer-error" style={{ padding: "0.5rem" }}>
          OCR: {ocrError}
        </div>
      )}
      {ocrResults.map((pageResult, pageIndex) => (
        <div
          key={pageIndex}
          className="document-viewer-pdf-ocr-layer"
          style={{
            position: "absolute",
            left: 0,
            top: pageResult.top,
            width: pageResult.displayWidth,
            height: pageResult.displayHeight,
            pointerEvents: "none",
            overflow: "hidden",
          }}
          aria-hidden
        >
          {pageResult.words.map((w, wi) => {
            const { bbox } = w;
            const scaleX = pageResult.displayWidth / pageResult.canvasWidth;
            const scaleY = pageResult.displayHeight / pageResult.canvasHeight;
            return (
              <span
                key={wi}
                style={{
                  position: "absolute",
                  left: bbox.x0 * scaleX,
                  top: bbox.y0 * scaleY,
                  width: (bbox.x1 - bbox.x0) * scaleX,
                  height: (bbox.y1 - bbox.y0) * scaleY,
                  fontSize: `${(bbox.y1 - bbox.y0) * scaleY}px`,
                  lineHeight: 1,
                  color: "transparent",
                  userSelect: "text",
                  pointerEvents: "auto",
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
