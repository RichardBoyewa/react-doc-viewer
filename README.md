# Document Viewer

A reusable React document viewer for **PDF** (normal and scanned/OCR), **DOCX**, and **PPTX** (via Office→PDF conversion). Uses only open-source libraries; high-fidelity rendering; portable API.

## Installation

```bash
npm install document-viewer react react-dom
```

Peer dependencies: `react`, `react-dom`. The viewer also depends on `react-pdf`, `mammoth`, `tesseract.js`, `dompurify`, `jszip` (see package.json).

## Usage

```tsx
import { DocumentViewer } from "document-viewer";

<DocumentViewer
  src={urlOrBlobOrFile}
  mimeType="application/pdf"
  options={{ enableOCR: false, resolutionScale: 1.5, zoom: 1, conversionWorkerUrl: "http://localhost:3333/convert" }}
  theme={{ primary: "#1a1a2e", textPrimary: "#eee" }}
  onRetry={() => {}}
  onConversionError={(err) => console.error(err)}
/>
```

## Local development

### Run the library + playground locally

```bash
# from repo root
npm install
npm run build
cd playground
npm install
npm run dev
```

The playground serves a patched PDF.js worker at `/pdf.worker.js`. When integrating into your own app, make sure that file is available at the web root (see "PDF image quality" below).

### Use this repo in another local app

There are two easy ways to consume the local package from a separate project.

**Option A: file dependency (recommended)**

In your app’s `package.json`:

```json
{
  "dependencies": {
    "document-viewer": "file:../PDFViewer"
  }
}
```

Then:

```bash
npm install
```

Whenever you change the library, rebuild it so your app picks up the latest `dist` output:

```bash
cd /path/to/PDFViewer
npm run build
```

**Option B: npm link**

```bash
# in this repo
npm run build
npm link

# in your app
npm link document-viewer
```

If you use `npm link`, you still need to run `npm run build` after library changes.

### Serve the PDF.js worker in your app

The viewer expects a worker at `/pdf.worker.js`. Copy it into your app’s public folder on each build:

```bash
cp /path/to/PDFViewer/dist/pdf.worker.js /path/to/your-app/public/pdf.worker.js
```

If you see blurred images, ensure you’re serving the patched worker from this repo’s `dist` folder (see "PDF image quality" below).

### Next.js + pnpm + monorepo

If your app lives in a pnpm workspace, add the package using the workspace protocol.

**1) Workspace setup**

`pnpm-workspace.yaml` (at monorepo root):

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Put this repo at `packages/document-viewer` (or any workspace package folder), then run:

```bash
pnpm -w install
```

**2) Add to your Next app**

`apps/your-next-app/package.json`:

```json
{
  "dependencies": {
    "document-viewer": "workspace:*"
  }
}
```

Then:

```bash
pnpm -w install
```

**3) Build the library**

The app consumes `dist`, so build the library after changes:

```bash
pnpm -w --filter document-viewer build
```

You can optionally run it in watch mode (if you add a `dev` script) and keep your Next app running.

**4) Serve the worker in Next**

Copy the worker into your Next app’s `public` folder so it’s served at `/pdf.worker.js`:

```bash
cp packages/document-viewer/dist/pdf.worker.js apps/your-next-app/public/pdf.worker.js
```

You can automate this in your Next app’s `package.json`:

```json
{
  "scripts": {
    "dev": "pnpm -w --filter document-viewer build && cp ../../packages/document-viewer/dist/pdf.worker.js public/pdf.worker.js && next dev",
    "build": "pnpm -w --filter document-viewer build && cp ../../packages/document-viewer/dist/pdf.worker.js public/pdf.worker.js && next build"
  }
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string \| Blob \| File` | Document URL or file. |
| `mimeType` | `string` (optional) | MIME type; inferred from URL/extension if omitted. |
| `options` | `ViewerOptions` (optional) | See below. |
| `theme` | `ViewerTheme` (optional) | Colors for container and default loading/error UI. |
| `onRequestPdfConversion` | `(file, mimeType) => Promise<string>` (optional) | Callback to convert Office (DOCX/PPTX) to PDF URL. |
| `onConversionError` | `(error: Error) => void` (optional) | Called when conversion fails (e.g. worker error). |
| `onRetry` | `() => void` (optional) | When provided, error UI shows a "Retry" button that calls this. |
| `className` | `string` (optional) | Extra class for the container. |
| `style` | `React.CSSProperties` (optional) | Inline styles for the container. |

## Exports

- `PdfToolbar` – standalone toolbar component used by the PDF renderer.
- `PdfToolbarProps` – props type for `PdfToolbar`.
- `PdfViewerApi` – API shape passed to `onViewerReady`.

### ViewerOptions

- **`enableOCR`** (boolean): Enable OCR overlay for scanned PDFs (Tesseract).
- **`resolutionScale`** (number): PDF canvas scale factor (e.g. 1.5). Combined with `devicePixelRatio`. Higher values (e.g. 2–2.5) improve sharpness for image-heavy PDFs but use more memory.
- **`showToolbar`** (boolean): Show the built-in PDF toolbar (page nav, zoom, actions). Default: `true`.
- **`showSearch`** (boolean): Show the search input in the PDF toolbar. Default: `true`.
- **`showPrint`** (boolean): Show the print button in the PDF toolbar. Default: `true`.
- **`showFullscreen`** (boolean): Show the fullscreen button in the PDF toolbar. Default: `true`.
- **`showSidebar`** (boolean): Show the left thumbnail sidebar in the PDF viewer. Default: `true`.
- **`sidebarMode`** (`"none" | "thumbnails" | "outline" | "both"`): Sidebar content mode. Overrides `showSidebar` when provided. Default: `"thumbnails"`.
- **`viewerBackgroundColor`** (string): Background color of the viewer area (outside the page).
- **`pageBackgroundColor`** (string): Background color of the PDF page surface.
- **`toolbarBackgroundColor`** (string): Background color of the toolbar.
- **`zoom`** (number): Zoom multiplier for PDF (e.g. 1.5). Combined with `resolutionScale` and `devicePixelRatio`. Host can hold zoom state and pass it here; add +/- buttons that update `options.zoom`.
- **`conversionWorkerUrl`** (string): URL of conversion worker. When set (non-empty after trim), Office files (DOCX/PPTX) are POSTed here (multipart `file`); response must be `application/pdf` body or JSON `{ url }`. Empty or whitespace-only is treated as not set.
- **`onViewerReady`** (function): Provides an API to control the PDF viewer (e.g. `scrollToPage`). Signature: `(api) => void`.
- **`onDownload`** (function): Callback when user clicks download in the toolbar. Signature: `(source, mimeType) => void`.
- **`downloadFileName`** (string): File name used by the default download handler.
- **`onPrint`** (function): Callback when user clicks print in the toolbar. Signature: `(source, mimeType) => void`.
- **`onFullscreen`** (function): Callback when user clicks fullscreen in the toolbar. Signature: `(containerEl) => void`.
- **`searchHighlightStyle`** (object): Inline style applied to search highlight spans (e.g. `{ backgroundColor: \"#ffe58f\" }`).
- **`searchTextHighlightStyle`** (object): Alias of `searchHighlightStyle`.
- **`searchHighlightClassName`** (string): Class name applied to search highlight spans. Default: `document-viewer-search-hit`.
- **`searchActiveHighlightStyle`** (object): Inline style applied to active match spans on the active match page.
- **`searchActiveHighlightClassName`** (string): Class name applied to active match spans. Default: `document-viewer-search-hit-active`.
- **`highlightPageText`** (`"none" | "current" | "page" | "both"`): Highlight all text on the current page, a specific page, both, or none.
- **`highlightPageNumber`** (number): Page number (1-based) to highlight when using `"page"` or `"both"`.
- **`highlightPageTextStyle`** (object): Inline style applied to full-page text highlight spans.

### ViewerTheme

Optional theme for container and default loading/error UI: `primary`, `secondary`, `tertiary`, `textPrimary`, `textSecondary`, `textTertiary`, `disableThemeScrollbar`. When `theme` is not provided, default styles are used.

## Conversion worker

For DOCX/PPTX, you can either:

1. Provide **`onRequestPdfConversion`**: your callback receives the file and returns a PDF URL.
2. Set **`options.conversionWorkerUrl`**: the viewer POSTs the file to that URL and uses the PDF response.

Worker contract: `POST /convert`, `multipart/form-data` field `file`, response `Content-Type: application/pdf` (raw PDF bytes) or JSON `{ "url": "https://..." }`. The viewer creates an object URL from the PDF bytes when needed and revokes it on unmount or when `src`/renderer changes.

If conversion fails (network, CORS, 4xx/5xx, or empty response), the viewer shows a clear error (e.g. "Conversion failed: [message]") and calls **`onConversionError`** when provided. Provide **`onRetry`** to show a "Retry" button that re-triggers load/conversion.

## PDF image quality

- **Why some parts look pixelated:** Non-selectable content in a PDF is often embedded as raster images; sharpness is limited by (a) the resolution of that image inside the PDF and (b) the viewer’s render scale. Text stays sharp because it’s vector.
- **Improving sharpness:** Increase **Resolution scale** (e.g. 2–2.5) for image-heavy pages; higher values use more memory. The viewer also enables high-quality canvas image smoothing where supported (e.g. Edge).
- **Patched PDF.js:** We patch PDF.js to always enable image interpolation for embedded raster images (removes the blocky look when the PDF’s `Interpolate` flag is false). The patch is applied by `scripts/patch-pdfjs.js` (run on `postinstall` and before/after `build`). It also copies a patched worker to `playground/public/pdf.worker.js` and `dist/pdf.worker.js`.
- **Worker packaging:** The viewer expects the worker at `/pdf.worker.js`. The build copies the patched worker to `dist/pdf.worker.js`. Ensure your app serves that file at the web root in production (e.g., copy it into your app’s `public/` folder).
- **Browser:** Chrome often renders PDF.js canvas more consistently than Edge; if quality differs, try Chrome.
- **Source PDF:** PDFs produced by “Microsoft Edge PDF Document” (or similar) may embed low-resolution images; quality is source-dependent and cannot be fixed entirely in the viewer.

## PDF.js patch maintenance

- **Current PDF.js version:** `pdfjs-dist@4.0.379` (via `react-pdf`).
- **What’s patched:** `getImageSmoothingEnabled()` in `pdf.js` and the `Interpolate` flag handling in `pdf.worker.js` (forced to `true`).
- **How to update:** After upgrading `react-pdf` or `pdfjs-dist`, re-run `npm install` (runs `postinstall`) and verify the patch is applied by running `node scripts/patch-pdfjs.js`. Re-test your blur cases and ensure `dist/pdf.worker.js` is deployed.

## Loading and error UI

- Loading: single loading state (e.g. "Loading…" or "Converting to PDF…" when waiting on conversion). Use class `document-viewer-loading` for host styling.
- Error: single error component (message + optional Retry button when `onRetry` is set). Use class `document-viewer-error` for host styling.

## PDF links

External annotation links (http/https/mailto) open in a new browser tab by default. Internal PDF links (outline/anchors) continue to navigate within the document.

## Playground

```bash
npm run build
cd playground && npm install && npm run dev
```

Open the playground to try samples, file picker, options (OCR, resolution scale, conversion worker URL), and retry.

## Scripts

- `npm run build` – build the library (tsup).
- `npm run test` / `npm run test:ci` – unit tests (Vitest).
- `npm run playground` – run playground (from repo root, if script exists).
- `npm run worker` – run conversion worker (see `worker/README.md`).

## License

MIT.
