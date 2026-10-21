/** Immutable original Blender MCP exports, geometry freeze L3. */
export const SOURCES=Object.freeze({
  "low": {
    "file": "LM-L3-low.glb",
    "sha256": "2f04696b1080273089d822911493f60827a102238ef77acb72cd2e04f47de927"
  },
  "medium": {
    "file": "LM-L3-medium.glb",
    "sha256": "a817004abfbe11ac41d1d4fc03afd4a040854ed98c61b55cef8f239bcd620bca"
  },
  "high": {
    "file": "LM-L3-high.glb",
    "sha256": "1ae3df801a61df3d636086bf0735d33e3904468b7fc682b13cbe46b8b4f9fead"
  }
});
// Literal URLs let Vite include every source in production, retaining the frozen bytes.
export const SOURCE_URLS=Object.freeze({
  low:new URL('./assets/LM-L3-low.glb',import.meta.url),
  medium:new URL('./assets/LM-L3-medium.glb',import.meta.url),
  high:new URL('./assets/LM-L3-high.glb',import.meta.url)
});
