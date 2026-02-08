/**
 * POSTs an Office file to the conversion worker URL and returns a PDF URL.
 * Request: multipart/form-data with field name "file".
 * Response: (a) 200 with Content-Type application/pdf → create object URL from blob, or
 *           (b) 200 with Content-Type application/json and body { url: string }.
 * Returns { pdfUrl, revoke } where revoke() must be called when done (only when pdfUrl was created from binary response).
 */
export async function convertViaWorker(
  workerUrl: string,
  file: Blob,
  _mimeType: string
): Promise<{ pdfUrl: string; revoke?: () => void }> {
  const form = new FormData();
  form.append("file", file, (file as File).name ?? "document");

  const res = await fetch(workerUrl, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conversion failed: ${res.status} ${text || res.statusText}. Check conversion worker URL and CORS.`);
  }

  const contentType = res.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/pdf")) {
    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error("Conversion failed: worker returned empty PDF.");
    }
    const url = URL.createObjectURL(blob);
    return { pdfUrl: url, revoke: () => URL.revokeObjectURL(url) };
  }

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as { url?: string };
    if (typeof json?.url === "string") return { pdfUrl: json.url };
    throw new Error("Conversion response missing url");
  }

  throw new Error(`Unexpected response type: ${contentType}`);
}
