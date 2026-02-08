import type { RendererKey, RendererFactory } from "./types";

const registry: Partial<Record<RendererKey, RendererFactory>> = {};

/**
 * Registers a lazy factory for a renderer key.
 */
export function registerRenderer(key: RendererKey, factory: RendererFactory): void {
  registry[key] = factory;
}

/**
 * Returns the lazy factory for a renderer key, or undefined if not registered.
 */
export function getRendererFactory(key: RendererKey): RendererFactory | undefined {
  return registry[key];
}

/**
 * Checks if a renderer is registered for the given key.
 */
export function hasRenderer(key: RendererKey): boolean {
  return key in registry && typeof registry[key] === "function";
}
