import { describe, it, expect, beforeEach } from "vitest";
import {
  registerRenderer,
  getRendererFactory,
  hasRenderer,
} from "./RendererRegistry";
import type { RendererKey, RendererFactory } from "./types";

describe("RendererRegistry", () => {
  const stubFactory: RendererFactory = () =>
    Promise.resolve({ default: () => null });

  beforeEach(() => {
    registerRenderer("pdf", stubFactory);
  });

  it("returns registered factory for key", () => {
    expect(getRendererFactory("pdf")).toBe(stubFactory);
  });

  it("hasRenderer returns true for registered key", () => {
    expect(hasRenderer("pdf")).toBe(true);
  });

  it("returns undefined for unregistered key", () => {
    registerRenderer("pdf", stubFactory);
    expect(getRendererFactory("unsupported" as RendererKey)).toBeUndefined();
  });

  it("hasRenderer returns false for unregistered key", () => {
    expect(hasRenderer("unsupported" as RendererKey)).toBe(false);
  });

  it("allows overwriting factory", () => {
    const other: RendererFactory = () =>
      Promise.resolve({ default: () => null });
    registerRenderer("pdf", other);
    expect(getRendererFactory("pdf")).toBe(other);
  });
});
