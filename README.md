# Hive React Document Viewer

A powerful React component for viewing **PDF**, **DOCX**, and **PPTX** documents. Features include thumbnail navigation, text search, zoom controls, fullscreen mode, and optional OCR support for scanned documents.

[![npm version](https://img.shields.io/npm/v/hive-react-document-viewer.svg)](https://www.npmjs.com/package/hive-react-document-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 📄 **PDF viewing** with high-fidelity rendering
- 📑 **Thumbnail sidebar** with page navigation
- 🔍 **Text search** with match highlighting
- 🔎 **Zoom controls** (fit to page, zoom in/out)
- 📥 **Download & Print** support
- 🖥️ **Fullscreen mode**
- 📝 **DOCX support** (rendered as HTML)
- 📊 **PPTX support** (via PDF conversion)
- 🔤 **OCR support** for scanned PDFs (via Tesseract.js)
- 🎨 **Customizable theming**

## Installation

```bash
npm install hive-react-document-viewer
```

**Peer dependencies:** `react` and `react-dom` (>=16.8.0)

## Quick Start

```tsx
import { DocumentViewer } from "hive-react-document-viewer";

function App() {
  return (
    <div style={{ height: "100vh" }}>
      <DocumentViewer
        src="/path/to/document.pdf"
        mimeType="application/pdf"
      />
    </div>
  );
}
```

## Usage Examples

### Basic PDF Viewer

```tsx
<DocumentViewer src="https://example.com/document.pdf" />
```

### With Options

```tsx
<DocumentViewer
  src={fileUrl}
  mimeType="application/pdf"
  options={{
    showToolbar: true,
    showSidebar: true,
    sidebarMode: "thumbnails",
    resolutionScale: 2,
    zoom: 1,
  }}
/>
```

### With Viewer API

```tsx
import { DocumentViewer, PdfViewerApi } from "hive-react-document-viewer";

function App() {
  const [viewerApi, setViewerApi] = useState<PdfViewerApi | null>(null);

  return (
    <>
      <button onClick={() => viewerApi?.scrollToPage(5)}>Go to Page 5</button>
      <DocumentViewer
        src="/document.pdf"
        options={{
          onViewerReady: setViewerApi,
        }}
      />
    </>
  );
}
```

### File Upload

```tsx
function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <input
        type="file"
        accept=".pdf,.docx,.pptx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && <DocumentViewer src={file} />}
    </>
  );
}
```

### Office Documents (DOCX/PPTX)

For DOCX/PPTX files, you can either render DOCX as HTML directly, or convert to PDF using a conversion endpoint:

```tsx
<DocumentViewer
  src={officeFile}
  options={{
    conversionWorkerUrl: "https://your-api.com/convert",
  }}
  onConversionError={(err) => console.error("Conversion failed:", err)}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string \| Blob \| File` | Document URL or file object |
| `mimeType` | `string` | MIME type (auto-detected if omitted) |
| `options` | `ViewerOptions` | Viewer configuration options |
| `theme` | `ViewerTheme` | Theme customization |
| `onRetry` | `() => void` | Retry callback (shows retry button on error) |
| `onConversionError` | `(error: Error) => void` | Called when Office conversion fails |
| `className` | `string` | Additional CSS class |
| `style` | `CSSProperties` | Inline styles |

## ViewerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showToolbar` | `boolean` | `true` | Show the toolbar |
| `showSidebar` | `boolean` | `true` | Show the thumbnail sidebar |
| `sidebarMode` | `"none" \| "thumbnails" \| "outline" \| "both"` | `"thumbnails"` | Sidebar content |
| `showSearch` | `boolean` | `true` | Show search in toolbar |
| `showPrint` | `boolean` | `true` | Show print button |
| `showFullscreen` | `boolean` | `true` | Show fullscreen button |
| `zoom` | `number` | `1` | Zoom level multiplier |
| `resolutionScale` | `number` | `1` | Canvas resolution scale (higher = sharper) |
| `enableOCR` | `boolean` | `false` | Enable OCR for scanned PDFs |
| `conversionWorkerUrl` | `string` | - | URL for Office→PDF conversion |
| `viewerBackgroundColor` | `string` | `#525659` | Viewer background color |
| `pageBackgroundColor` | `string` | `#ffffff` | Page background color |
| `toolbarBackgroundColor` | `string` | - | Toolbar background color |
| `onViewerReady` | `(api: PdfViewerApi) => void` | - | Callback with viewer API |
| `onDownload` | `(src, mime) => void` | - | Custom download handler |
| `onPrint` | `(src, mime) => void` | - | Custom print handler |
| `onFullscreen` | `(el) => void` | - | Custom fullscreen handler |
| `downloadFileName` | `string` | - | Custom download filename |

## Viewer API

The `onViewerReady` callback provides an API to control the viewer programmatically:

```ts
interface PdfViewerApi {
  scrollToPage: (page: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}
```

## Exports

```tsx
import {
  DocumentViewer,
  PdfToolbar,
  registerRenderer,
  getRenderer,
  listRenderers,
  type PdfViewerApi,
  type PdfToolbarProps,
  type ViewerOptions,
  type ViewerTheme,
} from "hive-react-document-viewer";
```

## PDF.js Worker Setup

For optimal PDF rendering, serve the bundled PDF.js worker at `/pdf.worker.js`:

```bash
# Copy from node_modules after install
cp node_modules/hive-react-document-viewer/dist/pdf.worker.js public/pdf.worker.js
```

The package runs a postinstall script that patches PDF.js for better image quality.

## Conversion Worker

For DOCX/PPTX files, provide a conversion endpoint that accepts:

- **Request:** `POST` with `multipart/form-data`, field `file`
- **Response:** Either raw PDF bytes (`Content-Type: application/pdf`) or JSON `{ "url": "..." }`

## Theming

```tsx
<DocumentViewer
  src={file}
  theme={{
    primary: "#1a1a2e",
    textPrimary: "#ffffff",
  }}
/>
```

## CSS Classes

Style the viewer using these CSS classes:

- `.document-viewer` - Main container
- `.document-viewer-loading` - Loading state
- `.document-viewer-error` - Error state
- `.document-viewer-search-hit` - Search match highlight
- `.document-viewer-search-hit-active` - Active search match

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT
