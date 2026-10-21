/* Immutable actual Blender MCP exterior source assets. */
export const SOURCES=Object.freeze({"low": {"file": "QF17-Q6-low.glb", "sha256": "2a154b3f8ee14df4cf02a0326808219296a68ae8d4a487c9e227274262bceb2b"}, "medium": {"file": "QF17-Q6-medium.glb", "sha256": "6a786420f3bb9bc7383d4b6703c48d2708ca9f0d9fcb18c74ee9bad80313c115"}, "high": {"file": "QF17-Q6-high.glb", "sha256": "4cd7cc6372760f9832438c22eebd76e199aafb0a75398b547cc5deaa22651ee7"}});
// Literal URLs let Vite include every source in production, retaining the frozen bytes.
export const SOURCE_URLS=Object.freeze({
  low:new URL('./assets/QF17-Q6-low.glb',import.meta.url),
  medium:new URL('./assets/QF17-Q6-medium.glb',import.meta.url),
  high:new URL('./assets/QF17-Q6-high.glb',import.meta.url)
});
