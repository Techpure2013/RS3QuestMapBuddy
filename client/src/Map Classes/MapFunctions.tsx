import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import * as leaflet from "leaflet";
import { MapOptions } from "leaflet";
import L from "leaflet";
interface DragHandlerInterface {
  setX: Dispatch<SetStateAction<number>>;
  setY: Dispatch<SetStateAction<number>>;
  setZoom: Dispatch<SetStateAction<number>>;
}
export const MapDragHandler: React.FC<DragHandlerInterface> = ({
  setX,
  setY,
  setZoom,
}) => {
  const map = useMap();

  useEffect(() => {
    const updateState = () => {
      const currentZoom = map.getZoom();
      const center = map.getCenter();
      const point = map.project(center, currentZoom);
      const tileSize = 512;
      const x = Math.floor(point.x / tileSize);
      const y = Math.floor(point.y / tileSize);
      setX(x);
      setY(y);
      setZoom(currentZoom);
    };

    const handleZoomEnd = () => {
      setZoom(map.getZoom());
    };

    map.on("moveend", updateState);
    map.on("zoomend", handleZoomEnd);

    // Initial update
    updateState();

    return () => {
      map.off("moveend", updateState);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, setX, setY, setZoom]);

  return null;
};
const size = {
  chunks: { x: 100, y: 200 },
  chunk_size: { x: 64, y: 64 },
};
export function bounds(): leaflet.LatLngBounds {
  return new leaflet.LatLngBounds(
    [0, 0],
    [size.chunks.y * size.chunk_size.y, size.chunks.x * size.chunk_size.x]
  );
}
export function gameMapOptions(): MapOptions {
  const chunkoffset = { x: 16, z: 16 };
  const mapsize = { x: 100, z: 200 };
  const chunksize = 64;

  let crs = leaflet.CRS.Simple;
  // @ts-ignore
  crs.transformation = leaflet.transformation(
    1,
    chunkoffset.x + 0.5,
    -1,
    mapsize.z * chunksize - (chunkoffset.z + 0.5)
  );

  return {
    crs: crs,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    minZoom: -4,
    maxZoom: 5,
    zoomControl: false,
    maxBounds: bounds(),
    maxBoundsViscosity: 0.5,
  };
}
export function HandleFloorIncreaseDecrease(newFloor: number) {
  return newFloor >= 0 && newFloor <= 3;
}
