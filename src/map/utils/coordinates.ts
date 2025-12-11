export function convertManualCoordToVisual(coord: {
  lat: number;
  lng: number;
}) {
  if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number" || isNaN(coord.lat) || isNaN(coord.lng))
    return undefined;
  return { lat: coord.lat - 0.5, lng: coord.lng + 0.5 };
}
export function convertSearchedObjectCoordToVisual(coord: {
  lat: number;
  lng: number;
}) {
  if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number" || isNaN(coord.lat) || isNaN(coord.lng))
    return undefined;
  return { lat: coord.lat - 0.5, lng: coord.lng - 0.5 };
}
export function convertSearchedNPCCoordToVisual(coord: {
  lat: number;
  lng: number;
}) {
  if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number" || isNaN(coord.lat) || isNaN(coord.lng))
    return undefined;
  return { lat: coord.lat - 0.5, lng: coord.lng + 0.5 };
}
export function snapToTileCenter(latlng: { lat: number; lng: number }) {
  const vcx = Math.floor(latlng.lng - 0.5) + 0.5;
  const vcy = Math.floor(latlng.lat + 0.5) - 0.5;
  return { lat: vcy + 0.5, lng: vcx - 0.5 };
}
