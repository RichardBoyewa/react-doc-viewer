import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentViewer } from "./DocumentViewer";

const StubRenderer = ({ src }: { src: string }) => (
  <div data-testid="stub-renderer" data-src={src}>
    Stub
  </div>
);

const stubFactory = () =>
  Promise.resolve({ default: StubRenderer as React.ComponentType<any> });

vi.mock("./RendererRegistry", () => ({
  getRendererFactory: vi.fn(),
}));

import { getRendererFactory } from "./RendererRegistry";

describe("DocumentViewer", () => {
  beforeEach(() => {
    vi.mocked(getRendererFactory).mockReset();
  });

  it("renders error for unsupported document type", () => {
    render(<DocumentViewer src="https://example.com/file.xyz" />);
    expect(screen.getByTestId("document-viewer-error")).toHaveTextContent(
      "Unsupported document type"
    );
  });

  it("renders error when no renderer is available for format", () => {
    vi.mocked(getRendererFactory).mockReturnValue(undefined);
    render(<DocumentViewer src="https://example.com/doc.pdf" />);
    expect(screen.getByTestId("document-viewer-error")).toHaveTextContent(
      "No renderer available"
    );
  });

  it("renders loading then stub renderer when factory is provided", async () => {
    vi.mocked(getRendererFactory).mockReturnValue(stubFactory);
    render(<DocumentViewer src="https://example.com/doc.pdf" />);
    await screen.findByTestId("stub-renderer");
    expect(screen.getByTestId("stub-renderer")).toHaveAttribute(
      "data-src",
      "https://example.com/doc.pdf"
    );
  });

  it("passes options to renderer", async () => {
    const RendererWithOptions = ({ options }: any) => (
      <div data-testid="stub-renderer" data-scale={options?.resolutionScale}>
        Stub
      </div>
    );
    vi.mocked(getRendererFactory).mockReturnValue(() =>
      Promise.resolve({ default: RendererWithOptions as React.ComponentType<any> })
    );
    render(
      <DocumentViewer
        src="https://example.com/doc.pdf"
        options={{ resolutionScale: 1.5 }}
      />
    );
    await screen.findByTestId("stub-renderer");
    expect(screen.getByTestId("stub-renderer")).toHaveAttribute(
      "data-scale",
      "1.5"
    );
  });

  it("renders container with className and data-testid", async () => {
    vi.mocked(getRendererFactory).mockReturnValue(stubFactory);
    render(
      <DocumentViewer
        src="https://example.com/doc.pdf"
        className="my-viewer"
      />
    );
    await screen.findByTestId("stub-renderer");
    const container = screen.getByTestId("document-viewer");
    expect(container).toHaveClass("document-viewer");
    expect(container).toHaveClass("my-viewer");
  });
});
