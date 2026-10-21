/* Immutable real Blender MCP B6 source assets. */
export const SOURCES=Object.freeze({"low": {"file": "BM13-B6-low.glb", "sha256": "22aa106d1a2f9583ae93879c0779f07ce55b3f236d5ccbd9447a46acf25e7e01"}, "medium": {"file": "BM13-B6-medium.glb", "sha256": "14b90f0279d5e8ae27bf861f959f8b51b05bcf3064fd89122f6c6f51b20d1395"}, "high": {"file": "BM13-B6-high.glb", "sha256": "68bd7737da7e52d8e1382485e74a26b8cce35d403c31ae8a9f66064134d6e2c5"}});
// Literal URLs let Vite include every source in production, retaining the frozen bytes.
export const SOURCE_URLS=Object.freeze({
  low:new URL('./assets/BM13-B6-low.glb',import.meta.url),
  medium:new URL('./assets/BM13-B6-medium.glb',import.meta.url),
  high:new URL('./assets/BM13-B6-high.glb',import.meta.url)
});
