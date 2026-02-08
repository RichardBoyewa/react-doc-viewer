import React, { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { getRendererKey } from "./FormatRouter";
import { getRendererFactory } from "./RendererRegistry";
import { normalizeSrcToUrl } from "./utils/normalizeSrc";
import { convertViaWorker } from "./utils/conversionWorker";
import type { DocumentViewerProps, DocumentSource, RendererProps } from "./types";

function defaultLoading(theme?: DocumentViewerProps["theme"], label = "Loading…") {
  const style = theme
    ? {
        color: theme.textPrimary ?? theme.textSecondary,
        background: theme.secondary ?? theme.tertiary,
      }
    : undefined;
  return (
    <div
      data-testid="document-viewer-loading"
      className="document-viewer-loading"
      style={style}
    >
      {label}
    </div>
  );
}

function defaultError(
  message: string,
  theme?: DocumentViewerProps["theme"],
  onRetry?: () => void
) {
  const style = theme
    ? {
        color: theme.textPrimary ?? theme.textTertiary,
        background: theme.secondary ?? theme.tertiary,
      }
    : undefined;
  return (
    <div
      data-testid="document-viewer-error"
      className="document-viewer-error"
      style={style}
    >
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="document-viewer-retry">
          Retry
        </button>
      )}
    </div>
  );
}

function isBlobOrFile(src: DocumentSource): src is Blob | File {
  if (typeof src === "string") return false;
  return src instanceof Blob;
}

export function DocumentViewer({
  src,
  mimeType,
  options,
  theme,
  onRequestPdfConversion,
  onConversionError,
  onRetry,
  className,
  style,
}: DocumentViewerProps) {
  const { url, revoke } = useMemo(() => normalizeSrcToUrl(src), [src]);
  const [error, setError] = useState<string | null>(null);
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const convertedPdfUrlRevokeRef = useRef<(() => void) | null>(null);
  const enableOCR = options?.enableOCR ?? false;
  const conversionWorkerUrl = options?.conversionWorkerUrl?.trim() || undefined;

  useEffect(() => {
    return () => {
      revoke?.();
    };
  }, [revoke]);

  useEffect(() => {
    return () => {
      convertedPdfUrlRevokeRef.current?.();
      convertedPdfUrlRevokeRef.current = null;
    };
  }, []);

  const { rendererKey, mimeType: resolvedMime } = useMemo(
    () => getRendererKey(src, mimeType, enableOCR),
    [src, mimeType, enableOCR]
  );

  const shouldConvertOffice =
    rendererKey === "office-pdf" &&
    (onRequestPdfConversion != null || (conversionWorkerUrl != null && conversionWorkerUrl !== "")) &&
    isBlobOrFile(src);

  useEffect(() => {
    convertedPdfUrlRevokeRef.current?.();
    convertedPdfUrlRevokeRef.current = null;
    setConversionError(null);
    setConvertedPdfUrl(null);
  }, [src, rendererKey]);

  useEffect(() => {
    if (!shouldConvertOffice || !resolvedMime) return;
    let cancelled = false;
    const blob = src as Blob;

    const runConversion = (): Promise<void> => {
      if (onRequestPdfConversion) {
        return onRequestPdfConversion(blob, resolvedMime).then((pdfUrl) => {
          if (!cancelled) setConvertedPdfUrl(pdfUrl);
        });
      }
      if (!conversionWorkerUrl) return Promise.resolve();
      return convertViaWorker(conversionWorkerUrl, blob, resolvedMime).then(
        ({ pdfUrl, revoke: revokePdf }) => {
          if (!cancelled) {
            if (revokePdf) convertedPdfUrlRevokeRef.current = revokePdf;
            setConvertedPdfUrl(pdfUrl);
          } else if (revokePdf) revokePdf();
        }
      );
    };

    runConversion().catch((err) => {
      const message = err instanceof Error ? err.message : "Conversion failed";
      if (!cancelled) {
        setConversionError(message);
        onConversionError?.(err instanceof Error ? err : new Error(message));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shouldConvertOffice, src, resolvedMime, onRequestPdfConversion, conversionWorkerUrl, onConversionError]);

  const effectiveRendererKey =
    convertedPdfUrl != null ? "pdf" : rendererKey;
  const effectiveSrc = convertedPdfUrl != null ? convertedPdfUrl : url;
  const effectiveOriginalSrc =
    convertedPdfUrl != null ? convertedPdfUrl : src;

  const LazyRenderer = useMemo(() => {
    if (effectiveRendererKey === "unsupported") return null;
    const factory = getRendererFactory(effectiveRendererKey);
    if (!factory) return null;
    return React.lazy(factory);
  }, [effectiveRendererKey]);

  useEffect(() => {
    setError(null);
  }, [src, rendererKey]);

  const containerStyle = useMemo(() => {
    const base = { ...style };
    if (theme?.primary) (base as React.CSSProperties).backgroundColor = theme.primary;
    if (theme?.secondary) (base as React.CSSProperties).color = theme.textPrimary ?? theme.textSecondary;
    return base;
  }, [style, theme]);

  if (!url && typeof src !== "string") {
    return defaultError("Invalid document source", theme, onRetry);
  }

  if (conversionError) {
    return defaultError(conversionError, theme, onRetry ?? undefined);
  }

  if (shouldConvertOffice && convertedPdfUrl == null) {
    return (
      <div
        className={`document-viewer ${className ?? ""}`.trim()}
        style={containerStyle}
        data-testid="document-viewer"
      >
        {defaultLoading(theme, "Converting to PDF…")}
      </div>
    );
  }

  if (rendererKey === "unsupported") {
    return defaultError("Unsupported document type", theme, onRetry);
  }

  if (!LazyRenderer) {
    return defaultError("No renderer available for this format", theme, onRetry);
  }

  const rendererProps: RendererProps = {
    src: effectiveSrc,
    originalSrc: effectiveOriginalSrc,
    mimeType: convertedPdfUrl != null ? "application/pdf" : (resolvedMime ?? ""),
    options,
    theme,
  };

  return (
    <div
      className={`document-viewer ${className ?? ""}`.trim()}
      style={containerStyle}
      data-testid="document-viewer"
    >
      <ErrorBoundary
        fallback={(err) =>
          defaultError(
            err?.message ?? "Failed to load document",
            theme,
            onRetry
          )
        }
        onError={setError}
      >
        <Suspense fallback={defaultLoading(theme)}>
          <LazyRenderer {...rendererProps} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: (error: Error | null) => React.ReactNode;
    onError?: (message: string) => void;
  },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
