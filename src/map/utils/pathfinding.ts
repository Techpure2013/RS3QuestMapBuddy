// src/map/utils/pathfinding.ts
// A* pathfinding using binary collision data from Leridon's format

import type { PathWaypoint } from "../../state/types";

// Binary collision data format:
// Fetched from API: /api/collision/{floor}/0/{fileX}-{fileY}.png (raw binary)
// Each file covers 20x20 chunks = 1280x1280 tiles
// Each tile is 1 byte where bits encode passable directions:
//   Bit 0 (1): West
//   Bit 1 (2): North
//   Bit 2 (4): East
//   Bit 3 (8): South
//   Bit 4 (16): Northwest
//   Bit 5 (32): Northeast
//   Bit 6 (64): Southeast
//   Bit 7 (128): Southwest

// Direction constants matching Leridon's format (exported for external use)
export const Direction = {
  WEST: 1,
  NORTH: 2,
  EAST: 3,
  SOUTH: 4,
  NORTHWEST: 5,
  NORTHEAST: 6,
  SOUTHEAST: 7,
  SOUTHWEST: 8,
} as const;

export type DirectionType = typeof Direction[keyof typeof Direction];

// Bit masks for each direction (exported for UI)
export const DIRECTION_BITS = {
  WEST: 1,      // bit 0
  NORTH: 2,     // bit 1
  EAST: 4,      // bit 2
  SOUTH: 8,     // bit 3
  NORTHWEST: 16,  // bit 4
  NORTHEAST: 32,  // bit 5
  SOUTHEAST: 64,  // bit 6
  SOUTHWEST: 128, // bit 7
} as const;

// Internal direction bits lookup
const DIRECTION_BITS_LOOKUP: Record<DirectionType, number> = {
  [Direction.WEST]: DIRECTION_BITS.WEST,
  [Direction.NORTH]: DIRECTION_BITS.NORTH,
  [Direction.EAST]: DIRECTION_BITS.EAST,
  [Direction.SOUTH]: DIRECTION_BITS.SOUTH,
  [Direction.NORTHWEST]: DIRECTION_BITS.NORTHWEST,
  [Direction.NORTHEAST]: DIRECTION_BITS.NORTHEAST,
  [Direction.SOUTHEAST]: DIRECTION_BITS.SOUTHEAST,
  [Direction.SOUTHWEST]: DIRECTION_BITS.SOUTHWEST,
};

// Direction vectors
const DIRECTION_VECTORS: Record<DirectionType, { x: number; y: number }> = {
  [Direction.WEST]: { x: -1, y: 0 },
  [Direction.NORTH]: { x: 0, y: 1 },
  [Direction.EAST]: { x: 1, y: 0 },
  [Direction.SOUTH]: { x: 0, y: -1 },
  [Direction.NORTHWEST]: { x: -1, y: 1 },
  [Direction.NORTHEAST]: { x: 1, y: 1 },
  [Direction.SOUTHEAST]: { x: 1, y: -1 },
  [Direction.SOUTHWEST]: { x: -1, y: -1 },
};

// Invert direction (for checking if neighbor can move back to us)
const DIRECTION_INVERSE: Record<DirectionType, DirectionType> = {
  [Direction.WEST]: Direction.EAST,
  [Direction.NORTH]: Direction.SOUTH,
  [Direction.EAST]: Direction.WEST,
  [Direction.SOUTH]: Direction.NORTH,
  [Direction.NORTHWEST]: Direction.SOUTHEAST,
  [Direction.NORTHEAST]: Direction.SOUTHWEST,
  [Direction.SOUTHEAST]: Direction.NORTHWEST,
  [Direction.SOUTHWEST]: Direction.NORTHEAST,
};

// All directions for iteration
const ALL_DIRECTIONS: DirectionType[] = [
  Direction.WEST, Direction.EAST, Direction.SOUTH, Direction.NORTH,
  Direction.SOUTHWEST, Direction.SOUTHEAST, Direction.NORTHWEST, Direction.NORTHEAST,
];

// File metadata
const META = {
  chunksPerFile: 20,
  chunksX: 100,
  chunksZ: 200,
  chunkSize: 64,
  tilesPerFile: 20 * 64, // 1280
};

// Cache for loaded collision files
const collisionCache = new Map<string, Uint8Array | null>();
const loadingPromises = new Map<string, Promise<Uint8Array | null>>();

// Cache for rendered collision images (blob URLs for debug visualization)
const collisionImageCache = new Map<string, string>();

// Transportation link for pathfinding
interface TransportLink {
  id?: number; // Database ID (only for database-loaded transports)
  fromX: number;
  fromY: number;
  fromLevel: number;
  fromX2?: number; // Optional second corner for multi-tile (bounding box)
  fromY2?: number;
  toX: number;
  toY: number;
  toLevel: number;
  time: number;
  name: string;
}

// Cache for transportation data indexed by location
const transportCache = new Map<string, TransportLink[]>();
// Global teleports (from=0,0,0) - usable from anywhere
const globalTeleports: TransportLink[] = [];
let transportLoaded = false;
let transportLoadPromise: Promise<void> | null = null;

// Check if a transport is a global teleport (usable from anywhere)
function isGlobalTeleport(fromX: number, fromY: number, fromLevel: number): boolean {
  return fromX === 0 && fromY === 0 && fromLevel === 0;
}

// Get transport cache key
function getTransportKey(x: number, y: number, level: number): string {
  return `${x},${y},${level}`;
}

// Load transportation data
export async function loadTransportationData(): Promise<void> {
  if (transportLoaded) return;
  if (transportLoadPromise) return transportLoadPromise;

  transportLoadPromise = (async () => {
    let linkCount = 0;

    // Load all transports from database API (includes imported cache data, teleports, fairy rings, etc.)
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/transports/all`);
      if (response.ok) {
        const transports: CustomTransport[] = await response.json();
        console.log(`%c📦 Loading ${transports.length} transports from database...`, 'color: cyan');

        let dbLinkCount = 0;
        let globalCount = 0;
        for (const t of transports) {
          if (!t.enabled) continue; // Skip disabled transports

          // Add forward link
          const forwardLink: TransportLink = {
            id: t.id, // Include database ID for editing
            fromX: t.from_x,
            fromY: t.from_y,
            fromLevel: t.from_floor,
            fromX2: t.from_x2 ?? undefined, // Multi-tile bounding box
            fromY2: t.from_y2 ?? undefined,
            toX: t.to_x,
            toY: t.to_y,
            toLevel: t.to_floor,
            time: t.travel_time || 1,
            name: t.name,
          };

          // Check if this is a global teleport (usable from anywhere)
          if (isGlobalTeleport(t.from_x, t.from_y, t.from_floor)) {
            globalTeleports.push(forwardLink);
            globalCount++;
          } else {
            const forwardKey = getTransportKey(forwardLink.fromX, forwardLink.fromY, forwardLink.fromLevel);
            if (!transportCache.has(forwardKey)) {
              transportCache.set(forwardKey, []);
            }
            transportCache.get(forwardKey)!.push(forwardLink);
          }
          dbLinkCount++;

          // Add reverse link if bidirectional
          if (t.bidirectional) {
            // Generate appropriate reverse name based on direction
            let reverseName = t.name;
            // Replace direction words with their opposites for clarity
            if (t.to_floor > t.from_floor) {
              // Original goes UP, reverse goes DOWN
              reverseName = reverseName
                .replace(/\bClimb up\b/gi, 'Climb down')
                .replace(/\bClimb-up\b/gi, 'Climb-down')
                .replace(/\bUp\b/g, 'Down');
            } else if (t.to_floor < t.from_floor) {
              // Original goes DOWN, reverse goes UP
              reverseName = reverseName
                .replace(/\bClimb down\b/gi, 'Climb up')
                .replace(/\bClimb-down\b/gi, 'Climb-up')
                .replace(/\bDown\b/g, 'Up');
            }
            // Only add (return) if the name didn't change
            if (reverseName === t.name) {
              reverseName = `${t.name} (return)`;
            }

            const reverseLink: TransportLink = {
              id: t.id, // Same ID - reverse is same transport
              fromX: t.to_x,
              fromY: t.to_y,
              fromLevel: t.to_floor,
              toX: t.from_x,
              toY: t.from_y,
              toLevel: t.from_floor,
              time: t.travel_time || 1,
              name: reverseName,
            };

            const reverseKey = getTransportKey(reverseLink.fromX, reverseLink.fromY, reverseLink.fromLevel);
            if (!transportCache.has(reverseKey)) {
              transportCache.set(reverseKey, []);
            }
            transportCache.get(reverseKey)!.push(reverseLink);
            dbLinkCount++;
          }
        }
        console.log(`%c  ↳ ${dbLinkCount} links from database (${globalCount} global teleports)`, 'color: gray');
        linkCount += dbLinkCount;
      }
    } catch (err) {
      console.warn('Failed to load database transports:', err);
    }

    console.log(`%c✅ Total ${linkCount} transport links loaded`, 'color: lime');
    transportLoaded = true;
  })();

  return transportLoadPromise;
}

// Reload transport data (clears cache and reloads from both sources)
export async function reloadTransports(): Promise<void> {
  transportCache.clear();
  globalTeleports.length = 0; // Clear global teleports array
  transportLoaded = false;
  transportLoadPromise = null;
  await loadTransportationData();
  console.log('%c🔄 Transport cache reloaded', 'color: lime');
}

// Get transport links from a position (position-specific only, like stairs/ladders)
function getTransportLinks(x: number, y: number, level: number): TransportLink[] {
  const key = getTransportKey(x, y, level);
  return transportCache.get(key) || [];
}

// Get global teleports (lodestones, spells, jewelry - usable from anywhere)
// These are stored separately and should only be used in specific contexts
// (e.g., travel planning UI, not regular A* pathfinding)
export function getGlobalTeleports(): TransportLink[] {
  return globalTeleports;
}

// Transport link type for external use
export type { TransportLink };

// Get all transport links for visualization (includes both position-specific and global)
export function getAllTransportsForVisualization(): {
  positionBased: { key: string; links: TransportLink[] }[];
  global: TransportLink[];
  stats: {
    totalPositionBased: number;
    totalGlobal: number;
    uniquePositions: number;
  };
} {
  const positionBased: { key: string; links: TransportLink[] }[] = [];
  let totalPositionBased = 0;

  for (const [key, links] of transportCache.entries()) {
    positionBased.push({ key, links });
    totalPositionBased += links.length;
  }

  return {
    positionBased,
    global: globalTeleports,
    stats: {
      totalPositionBased,
      totalGlobal: globalTeleports.length,
      uniquePositions: transportCache.size,
    },
  };
}

// In Leridon's format: bit SET = direction is WALKABLE/FREE
// So the byte directly represents walkable directions
function toWalkableBits(tileByte: number): number {
  return tileByte; // Bit SET = walkable, no inversion needed
}

// Check if movement in direction is free for a tile byte
// Bit being SET means direction is WALKABLE/FREE
function isDirectionFree(tileByte: number, dir: DirectionType): boolean {
  const bit = DIRECTION_BITS_LOOKUP[dir];
  return (tileByte & bit) !== 0; // 1 = free/walkable, 0 = blocked
}


// Get file coordinates from world position
function getFileCoords(x: number, y: number): { fileX: number; fileY: number } {
  return {
    fileX: Math.floor(x / META.tilesPerFile),
    fileY: Math.floor(y / META.tilesPerFile),
  };
}

// Get cache key for a file
function getFileCacheKey(fileX: number, fileY: number, floor: number): string {
  return `${fileX}-${fileY}-${floor}`;
}

// Get API base URL
function getApiBase(): string {
  return (window as any).__APP_CONFIG__?.API_BASE ??
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:42069'
      : window.location.origin);
}

// Load a collision file from the API
async function loadCollisionFile(fileX: number, fileY: number, floor: number): Promise<Uint8Array | null> {
  const cacheKey = getFileCacheKey(fileX, fileY, floor);

  if (collisionCache.has(cacheKey)) {
    return collisionCache.get(cacheKey) ?? null;
  }

  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  const loadPromise = (async (): Promise<Uint8Array | null> => {
    // Fetch from API - zoom=0 means raw collision data
    const url = `${getApiBase()}/api/collision/${floor}/0/${fileX}-${fileY}.png`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`Collision file not found: ${url}`);
        collisionCache.set(cacheKey, null);
        return null;
      }

      // API returns raw (already decompressed) binary data
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      console.log(`%c📦 Loaded collision file ${cacheKey}: ${data.length} bytes`, 'color: cyan');
      collisionCache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error(`Failed to load collision file ${cacheKey}:`, err);
      collisionCache.set(cacheKey, null);
      return null;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

// Get tile movement data for a world coordinate
async function getTileData(x: number, y: number, floor: number): Promise<number> {
  const { fileX, fileY } = getFileCoords(x, y);
  const data = await loadCollisionFile(fileX, fileY, floor);

  if (!data) {
    return 0; // No data = blocked
  }

  // Position within the file
  const localX = x % META.tilesPerFile;
  const localY = y % META.tilesPerFile;

  // Handle negative coordinates
  const tileX = localX < 0 ? localX + META.tilesPerFile : localX;
  const tileY = localY < 0 ? localY + META.tilesPerFile : localY;

  const index = tileY * META.tilesPerFile + tileX;

  if (index < 0 || index >= data.length) {
    return 0; // Out of bounds = blocked
  }

  return data[index];
}

// Synchronous tile data lookup (requires preloading)
function getTileDataSync(x: number, y: number, floor: number): number {
  const { fileX, fileY } = getFileCoords(x, y);
  const cacheKey = getFileCacheKey(fileX, fileY, floor);
  const data = collisionCache.get(cacheKey);

  if (!data) {
    return 0; // No data = blocked
  }

  const localX = x % META.tilesPerFile;
  const localY = y % META.tilesPerFile;
  const tileX = localX < 0 ? localX + META.tilesPerFile : localX;
  const tileY = localY < 0 ? localY + META.tilesPerFile : localY;
  const index = tileY * META.tilesPerFile + tileX;

  if (index < 0 || index >= data.length) {
    return 0;
  }

  return data[index];
}

// Check if can move from position in direction
function canMove(x: number, y: number, floor: number, dir: DirectionType): boolean {
  const tileByte = getTileDataSync(x, y, floor);
  return isDirectionFree(tileByte, dir);
}

// Check if a tile is accessible (can be reached from any direction)
async function isAccessible(x: number, y: number, floor: number): Promise<boolean> {
  for (const dir of ALL_DIRECTIONS) {
    const vec = DIRECTION_VECTORS[dir];
    const neighborX = x + vec.x;
    const neighborY = y + vec.y;
    const neighborData = await getTileData(neighborX, neighborY, floor);

    if (isDirectionFree(neighborData, DIRECTION_INVERSE[dir])) {
      return true;
    }
  }
  return false;
}

// Preload collision files for an area
async function preloadArea(
  startX: number, startY: number,
  endX: number, endY: number,
  floor: number,
  padding: number = 1
): Promise<number> {
  const start = getFileCoords(Math.min(startX, endX) - padding * META.chunkSize, Math.min(startY, endY) - padding * META.chunkSize);
  const end = getFileCoords(Math.max(startX, endX) + padding * META.chunkSize, Math.max(startY, endY) + padding * META.chunkSize);

  const filesToLoad: Array<{ x: number; y: number }> = [];

  for (let fx = start.fileX; fx <= end.fileX; fx++) {
    for (let fy = start.fileY; fy <= end.fileY; fy++) {
      const cacheKey = getFileCacheKey(fx, fy, floor);
      if (!collisionCache.has(cacheKey)) {
        filesToLoad.push({ x: fx, y: fy });
      }
    }
  }

  if (filesToLoad.length > 0) {
    console.log(`Preloading ${filesToLoad.length} collision files...`);
    await Promise.all(filesToLoad.map(({ x, y }) => loadCollisionFile(x, y, floor)));
  }

  return filesToLoad.length;
}

// A* Node
interface AStarNode {
  x: number;
  y: number;
  level: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
  index: number;
  transportUsed?: string; // Name of transport if used to reach this node
}

// Min-Heap for priority queue
class MinHeap {
  private heap: AStarNode[] = [];

  get length(): number {
    return this.heap.length;
  }

  push(node: AStarNode): void {
    node.index = this.heap.length;
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      last.index = 0;
      this.bubbleDown(0);
    }
    return min;
  }

  updateNode(node: AStarNode): void {
    this.bubbleUp(node.index);
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].f <= this.heap[index].f) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < this.heap.length && this.heap[left].f < this.heap[smallest].f) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].f < this.heap[smallest].f) {
        smallest = right;
      }
      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.heap[i].index = i;
    this.heap[j].index = j;
  }
}

// Octile distance heuristic
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

// Coordinate key for lookup (includes level for cross-floor pathfinding)
function coordKey(x: number, y: number, level: number): string {
  return `${x},${y},${level}`;
}

// Simplify path by removing collinear points
function simplifyPath(path: PathWaypoint[]): PathWaypoint[] {
  if (path.length <= 2) return path;

  const simplified: PathWaypoint[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    const dx1 = curr.lng - prev.lng;
    const dy1 = curr.lat - prev.lat;
    const dx2 = next.lng - curr.lng;
    const dy2 = next.lat - curr.lat;

    const cross = dx1 * dy2 - dy1 * dx2;
    const dot = dx1 * dx2 + dy1 * dy2;

    if (cross !== 0 || dot < 0) {
      simplified.push(curr);
    }
  }

  simplified.push(path[path.length - 1]);
  return simplified;
}

// Find nearest accessible tile
async function findNearestAccessible(
  x: number, y: number, floor: number, maxRadius: number = 15
): Promise<{ x: number; y: number } | null> {
  if (await isAccessible(x, y, floor)) {
    return { x, y };
  }

  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

        const checkX = x + dx;
        const checkY = y + dy;
        if (await isAccessible(checkX, checkY, floor)) {
          return { x: checkX, y: checkY };
        }
      }
    }
  }

  return null;
}

// Weighted A* pathfinding with transport support
function runWeightedAStar(
  startX: number, startY: number, startLevel: number,
  endX: number, endY: number, endLevel: number,
  weight: number,
  maxIterations: number,
  verbose: boolean = false
): { path: PathWaypoint[] | null; iterations: number } {
  const openHeap = new MinHeap();
  const closedSet = new Set<string>();
  const openSetMap = new Map<string, AStarNode>();

  const startH = heuristic(startX, startY, endX, endY);
  const startNode: AStarNode = {
    x: startX,
    y: startY,
    level: startLevel,
    g: 0,
    h: startH,
    f: startH * weight,
    parent: null,
    index: 0,
  };

  openHeap.push(startNode);
  openSetMap.set(coordKey(startX, startY, startLevel), startNode);

  let iterations = 0;

  while (openHeap.length > 0 && iterations < maxIterations) {
    iterations++;

    const current = openHeap.pop()!;
    const currentKey = coordKey(current.x, current.y, current.level);
    openSetMap.delete(currentKey);

    if (verbose && iterations <= 10) {
      const tileByte = getTileDataSync(current.x, current.y, current.level);
      console.log(`  Iter ${iterations}: (${current.x},${current.y}) byte=${tileByte} f=${current.f.toFixed(1)} heap=${openHeap.length}`);
    }

    // Check if we reached the goal (same position AND level)
    if (current.x === endX && current.y === endY && current.level === endLevel) {
      const path: PathWaypoint[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ lat: node.y, lng: node.x });
        node = node.parent;
      }
      return { path, iterations };
    }

    closedSet.add(currentKey);

    // Check all 8 walking directions (same level only)
    let validMoves = 0;
    for (const dir of ALL_DIRECTIONS) {
      if (!canMove(current.x, current.y, current.level, dir)) {
        continue;
      }
      validMoves++;

      const vec = DIRECTION_VECTORS[dir];
      const neighborX = current.x + vec.x;
      const neighborY = current.y + vec.y;
      const neighborKey = coordKey(neighborX, neighborY, current.level);

      if (closedSet.has(neighborKey)) continue;

      const isDiagonal = dir >= Direction.NORTHWEST;
      const moveCost = isDiagonal ? Math.SQRT2 : 1;
      const tentativeG = current.g + moveCost;

      const existingNode = openSetMap.get(neighborKey);
      if (existingNode) {
        if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = tentativeG + existingNode.h * weight;
          existingNode.parent = current;
          openHeap.updateNode(existingNode);
        }
      } else {
        const h = heuristic(neighborX, neighborY, endX, endY);
        const newNode: AStarNode = {
          x: neighborX,
          y: neighborY,
          level: current.level,
          g: tentativeG,
          h,
          f: tentativeG + h * weight,
          parent: current,
          index: 0,
        };
        openHeap.push(newNode);
        openSetMap.set(neighborKey, newNode);
      }
    }

    if (verbose && iterations <= 10) {
      console.log(`    Valid walking moves: ${validMoves}, heap now: ${openHeap.length}`);
    }

    // Check transport links (stairs, ladders, etc.)
    const transportLinks = getTransportLinks(current.x, current.y, current.level);
    for (const link of transportLinks) {
      const neighborKey = coordKey(link.toX, link.toY, link.toLevel);

      if (closedSet.has(neighborKey)) continue;

      // Transport cost is based on time (ticks)
      const moveCost = link.time;
      const tentativeG = current.g + moveCost;

      const existingNode = openSetMap.get(neighborKey);
      if (existingNode) {
        if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = tentativeG + existingNode.h * weight;
          existingNode.parent = current;
          existingNode.transportUsed = link.name;
          openHeap.updateNode(existingNode);
        }
      } else {
        const h = heuristic(link.toX, link.toY, endX, endY);
        const newNode: AStarNode = {
          x: link.toX,
          y: link.toY,
          level: link.toLevel,
          g: tentativeG,
          h,
          f: tentativeG + h * weight,
          parent: current,
          index: 0,
          transportUsed: link.name,
        };
        openHeap.push(newNode);
        openSetMap.set(neighborKey, newNode);
      }
    }
  }

  if (verbose) {
    console.log(`  A* ended: iterations=${iterations}, heap=${openHeap.length}, closed=${closedSet.size}`);
  }

  return { path: null, iterations };
}

// Main pathfinding function
export async function findPath(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  floor: number,
  endFloor?: number,
  maxIterations = 300000
): Promise<PathWaypoint[] | null> {
  const targetFloor = endFloor ?? floor;
  console.log(`%c🚀 FINDPATH: (${startLng},${startLat},L${floor}) -> (${endLng},${endLat},L${targetFloor})`, 'color: yellow; font-weight: bold');

  // Load transportation data for stairs/ladders
  await loadTransportationData();

  // Convert lat/lng to game coordinates (lat=y, lng=x)
  let startX = Math.floor(startLng);
  let startY = Math.floor(startLat);
  let endX = Math.floor(endLng);
  let endY = Math.floor(endLat);

  // Preload collision files for the area
  await preloadArea(startX, startY, endX, endY, floor, 2);
  if (targetFloor !== floor) {
    await preloadArea(startX, startY, endX, endY, targetFloor, 2);
  }

  // Find accessible start/end points
  const accessibleStart = await findNearestAccessible(startX, startY, floor);
  const accessibleEnd = await findNearestAccessible(endX, endY, targetFloor);

  if (!accessibleStart || !accessibleEnd) {
    console.warn(`❌ No accessible points found`);
    return null;
  }

  startX = accessibleStart.x;
  startY = accessibleStart.y;
  endX = accessibleEnd.x;
  endY = accessibleEnd.y;

  if (startX === endX && startY === endY && floor === targetFloor) {
    return [{ lat: startY, lng: startX }];
  }

  console.log(`Start: (${startX}, ${startY}, L${floor}), End: (${endX}, ${endY}, L${targetFloor})`);

  // Try progressively greedier searches
  const weights = [1.5, 2.0, 3.0, 5.0];

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    const iterLimit = Math.floor(maxIterations / weights.length);
    const verbose = (i === 0); // Only verbose for first attempt
    const result = runWeightedAStar(startX, startY, floor, endX, endY, targetFloor, weight, iterLimit, verbose);

    if (result.path) {
      console.log(`✅ Path found (weight=${weight}): ${result.path.length} waypoints in ${result.iterations} iterations`);
      return simplifyPath(result.path);
    }
    console.log(`Weight ${weight} failed after ${result.iterations} iterations`);
  }

  console.warn(`❌ No path found`);
  return null;
}

// Get the "end point" of a step (first NPC or object location)
export function getStepEndpoint(step: {
  highlights: {
    npc: Array<{ npcLocation: { lat: number; lng: number }; floor?: number }>;
    object: Array<{ objectLocation: Array<{ lat: number; lng: number }>; floor?: number }>;
  };
  floor: number;
}): { lat: number; lng: number; floor: number } | null {
  if (step.highlights.npc.length > 0) {
    const npc = step.highlights.npc[0];
    if (npc.npcLocation && (npc.npcLocation.lat !== 0 || npc.npcLocation.lng !== 0)) {
      return {
        lat: npc.npcLocation.lat,
        lng: npc.npcLocation.lng,
        floor: npc.floor ?? step.floor,
      };
    }
  }

  if (step.highlights.object.length > 0) {
    const obj = step.highlights.object[0];
    if (obj.objectLocation && obj.objectLocation.length > 0) {
      const loc = obj.objectLocation[0];
      if (loc.lat !== 0 || loc.lng !== 0) {
        return {
          lat: loc.lat,
          lng: loc.lng,
          floor: obj.floor ?? step.floor,
        };
      }
    }
  }

  return null;
}

// Generate path between two consecutive steps
export async function generateStepToStepPath(
  fromStep: {
    highlights: {
      npc: Array<{ npcLocation: { lat: number; lng: number }; floor?: number }>;
      object: Array<{ objectLocation: Array<{ lat: number; lng: number }>; floor?: number }>;
    };
    floor: number;
  },
  toStep: {
    highlights: {
      npc: Array<{ npcLocation: { lat: number; lng: number }; floor?: number }>;
      object: Array<{ objectLocation: Array<{ lat: number; lng: number }>; floor?: number }>;
    };
    floor: number;
  }
): Promise<PathWaypoint[] | null> {
  const fromPoint = getStepEndpoint(fromStep);
  const toPoint = getStepEndpoint(toStep);

  if (!fromPoint || !toPoint) {
    console.warn("Cannot generate path: missing start or end point");
    return null;
  }

  if (fromPoint.floor !== toPoint.floor) {
    console.warn("Cross-floor paths not yet supported");
    return null;
  }

  return findPath(
    fromPoint.lat,
    fromPoint.lng,
    toPoint.lat,
    toPoint.lng,
    fromPoint.floor
  );
}

// Clear the collision cache
export function clearCollisionCache(): void {
  collisionCache.clear();
  loadingPromises.clear();
  collisionImageCache.clear();
  console.log(`%c🗑️ Collision cache cleared`, 'color: orange; font-weight: bold');
}

// ============ COLLISION EDITOR MODE ============

// Global state for collision editor (can be controlled from console)
export const collisionEditorState = {
  enabled: false,
  mode: "walkable" as "walkable" | "blocked" | "directional",
  selectedDirections: 255,  // Bitmask of directions to edit (default: all)
  directionalAction: "block" as "block" | "unblock",
  listeners: new Set<() => void>(),

  setEnabled(value: boolean) {
    this.enabled = value;
    this.notifyListeners();
    console.log(`%c${value ? '✏️ Collision Editor ENABLED' : '🚫 Collision Editor DISABLED'}`,
      value ? 'color: lime; font-weight: bold' : 'color: orange; font-weight: bold');
    if (value) {
      console.log(`Mode: ${this.mode === 'walkable' ? '🟢 Walkable' : this.mode === 'blocked' ? '🔴 Blocked' : '🎯 Directional'}`);
      console.log('Click and drag on the map to select tiles');
    }
  },

  setMode(mode: "walkable" | "blocked" | "directional") {
    this.mode = mode;
    this.notifyListeners();
    const modeEmoji = mode === 'walkable' ? '🟢 Walkable' : mode === 'blocked' ? '🔴 Blocked' : '🎯 Directional';
    const color = mode === 'walkable' ? 'color: lime' : mode === 'blocked' ? 'color: red' : 'color: cyan';
    console.log(`%cCollision Editor Mode: ${modeEmoji}`, color);
  },

  setSelectedDirections(bits: number) {
    this.selectedDirections = bits & 0xFF;
    this.notifyListeners();
  },

  toggleDirection(bit: number) {
    this.selectedDirections ^= bit;
    this.notifyListeners();
  },

  setDirectionalAction(action: "block" | "unblock") {
    this.directionalAction = action;
    this.notifyListeners();
    console.log(`%cDirectional Action: ${action === 'block' ? '🚫 Block' : '✅ Unblock'}`,
      action === 'block' ? 'color: red' : 'color: lime');
  },

  toggle() {
    this.setEnabled(!this.enabled);
  },

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener());
  },
};

// Console functions for collision editor
export function enableCollisionEditor() {
  collisionEditorState.setEnabled(true);
}

export function disableCollisionEditor() {
  collisionEditorState.setEnabled(false);
}

export function toggleCollisionEditor() {
  collisionEditorState.toggle();
}

export function setCollisionEditorMode(mode: "walkable" | "blocked" | "directional") {
  collisionEditorState.setMode(mode);
}

// ============ COLLISION DATA EDITING ============

// Notify listeners that collision data has changed
export function notifyCollisionDataChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('collisionDataChanged'));
  }
}

// Set a tile's raw collision byte (SET = walkable)
export function setTileCollision(x: number, y: number, floor: number, walkableByte: number): boolean {
  const { fileX, fileY } = getFileCoords(x, y);
  const cacheKey = getFileCacheKey(fileX, fileY, floor);
  const data = collisionCache.get(cacheKey);

  if (!data) {
    console.warn(`Cannot edit tile (${x}, ${y}) - file not loaded`);
    return false;
  }

  const localX = ((x % META.tilesPerFile) + META.tilesPerFile) % META.tilesPerFile;
  const localY = ((y % META.tilesPerFile) + META.tilesPerFile) % META.tilesPerFile;
  const index = localY * META.tilesPerFile + localX;

  if (index < 0 || index >= data.length) {
    console.warn(`Tile index out of bounds`);
    return false;
  }

  const oldValue = data[index];
  data[index] = walkableByte & 0xFF;
  const newValue = data[index];
  console.log(`    setTile (${x},${y}) file=${cacheKey} idx=${index}: ${oldValue.toString(2).padStart(8,'0')} -> ${newValue.toString(2).padStart(8,'0')}`);

  // Invalidate the rendered image cache for this file
  collisionImageCache.delete(cacheKey);

  return true;
}

// Make a tile fully walkable (all directions free)
export function makeTileWalkable(x: number, y: number, floor: number): boolean {
  // Bit SET = walkable, so 255 = all directions walkable
  return setTileCollision(x, y, floor, 255);
}

// Make a tile fully blocked (no directions free)
export function makeTileBlocked(x: number, y: number, floor: number): boolean {
  // Bit SET = walkable, so 0 = no directions walkable = blocked
  return setTileCollision(x, y, floor, 0);
}

// Set walkable directions using walkable bits (SET = can walk)
export function setTileWalkableDirections(x: number, y: number, floor: number, walkableBits: number): boolean {
  // Bits already represent walkable directions, no conversion needed
  return setTileCollision(x, y, floor, walkableBits & 0xFF);
}

// Get a tile's current collision byte (for reading before modifying)
export function getTileCollision(x: number, y: number, floor: number): number {
  return getTileDataSync(x, y, floor);
}

// Add walkability to specific directions (OR operation - sets bits)
export function addTileDirections(x: number, y: number, floor: number, directionBits: number): boolean {
  const current = getTileDataSync(x, y, floor);
  const newValue = current | (directionBits & 0xFF);
  console.log(`  addDir (${x},${y}): ${current.toString(2).padStart(8,'0')} | ${directionBits.toString(2).padStart(8,'0')} = ${newValue.toString(2).padStart(8,'0')}`);
  return setTileCollision(x, y, floor, newValue);
}

// Remove walkability from specific directions (AND NOT operation - clears bits)
export function removeTileDirections(x: number, y: number, floor: number, directionBits: number): boolean {
  const current = getTileDataSync(x, y, floor);
  const newValue = current & ~(directionBits & 0xFF);
  console.log(`  removeDir (${x},${y}): ${current.toString(2).padStart(8,'0')} & ~${directionBits.toString(2).padStart(8,'0')} = ${newValue.toString(2).padStart(8,'0')}`);
  return setTileCollision(x, y, floor, newValue);
}

// Make a rectangular area fully walkable
export function makeAreaWalkable(
  minX: number, minY: number,
  maxX: number, maxY: number,
  floor: number
): number {
  let count = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (makeTileWalkable(x, y, floor)) {
        count++;
      }
    }
  }
  console.log(`%c✅ Made ${count} tiles walkable`, 'color: lime');
  // Notify that collision data changed so debug layer refreshes
  notifyCollisionDataChanged();
  return count;
}

// Make a rectangular area blocked
export function makeAreaBlocked(
  minX: number, minY: number,
  maxX: number, maxY: number,
  floor: number
): number {
  let count = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (makeTileBlocked(x, y, floor)) {
        count++;
      }
    }
  }
  console.log(`%c🚫 Made ${count} tiles blocked`, 'color: red');
  // Notify that collision data changed so debug layer refreshes
  notifyCollisionDataChanged();
  return count;
}

// Add walkability to specific directions for an area
export function addAreaDirections(
  minX: number, minY: number,
  maxX: number, maxY: number,
  floor: number,
  directionBits: number
): number {
  let count = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (addTileDirections(x, y, floor, directionBits)) {
        count++;
      }
    }
  }
  console.log(`%c✅ Added directions to ${count} tiles (bits: ${directionBits.toString(2).padStart(8, '0')})`, 'color: lime');
  notifyCollisionDataChanged();
  return count;
}

// Remove walkability from specific directions for an area
export function removeAreaDirections(
  minX: number, minY: number,
  maxX: number, maxY: number,
  floor: number,
  directionBits: number
): number {
  let count = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (removeTileDirections(x, y, floor, directionBits)) {
        count++;
      }
    }
  }
  console.log(`%c🚫 Removed directions from ${count} tiles (bits: ${directionBits.toString(2).padStart(8, '0')})`, 'color: red');
  notifyCollisionDataChanged();
  return count;
}

// Refresh the collision image cache for a specific file (call after editing)
export function refreshCollisionImage(fileX: number, fileY: number, floor: number): void {
  const cacheKey = getFileCacheKey(fileX, fileY, floor);
  collisionImageCache.delete(cacheKey);
  console.log(`Invalidated collision image cache for file (${fileX}, ${fileY}) floor ${floor}`);
}

// ============ MOBILITY ABILITIES (SURGE/DIVE/ESCAPE) ============

// Player position with facing direction
export interface PlayerPosition {
  x: number;
  y: number;
  floor: number;
  direction: DirectionType;
}

// Convert cardinal direction to DirectionType
export function cardinalToDirection(dx: number, dy: number): DirectionType | null {
  if (dx === 0 && dy === 1) return Direction.NORTH;
  if (dx === 0 && dy === -1) return Direction.SOUTH;
  if (dx === 1 && dy === 0) return Direction.EAST;
  if (dx === -1 && dy === 0) return Direction.WEST;
  if (dx === 1 && dy === 1) return Direction.NORTHEAST;
  if (dx === -1 && dy === 1) return Direction.NORTHWEST;
  if (dx === 1 && dy === -1) return Direction.SOUTHEAST;
  if (dx === -1 && dy === -1) return Direction.SOUTHWEST;
  return null;
}

// Get the inverse of a direction
export function invertDirection(dir: DirectionType): DirectionType {
  return DIRECTION_INVERSE[dir];
}

// Get direction from one tile to another (for dive targeting)
export function getDirectionTo(fromX: number, fromY: number, toX: number, toY: number): DirectionType | null {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);
  return cardinalToDirection(dx, dy);
}

// Move in a direction until blocked or max distance reached
// Returns the furthest reachable position
function moveInDirection(
  startX: number,
  startY: number,
  floor: number,
  dir: DirectionType,
  maxDistance: number
): { x: number; y: number; distance: number } {
  const vec = DIRECTION_VECTORS[dir];
  let currentX = startX;
  let currentY = startY;
  let distance = 0;

  for (let i = 0; i < maxDistance; i++) {
    // Check if we can move in this direction from current tile
    if (!canMove(currentX, currentY, floor, dir)) {
      break;
    }

    // Move to next tile
    const nextX = currentX + vec.x;
    const nextY = currentY + vec.y;

    // Check if the destination tile allows entry from our direction
    const inverseDir = DIRECTION_INVERSE[dir];
    const destByte = getTileDataSync(nextX, nextY, floor);
    if (!isDirectionFree(destByte, inverseDir)) {
      break;
    }

    currentX = nextX;
    currentY = nextY;
    distance++;
  }

  return { x: currentX, y: currentY, distance };
}

// Surge: Move up to 10 tiles in the facing direction
// Returns the landing position or null if can't move at all
export function surge(
  x: number,
  y: number,
  floor: number,
  facingDirection: DirectionType
): { x: number; y: number; distance: number } | null {
  const result = moveInDirection(x, y, floor, facingDirection, 10);
  if (result.distance === 0) {
    return null; // Can't surge at all
  }
  return result;
}

// Escape: Move up to 7 tiles in the opposite of facing direction
// Returns the landing position or null if can't move at all
export function escape(
  x: number,
  y: number,
  floor: number,
  facingDirection: DirectionType
): { x: number; y: number; distance: number } | null {
  const escapeDir = DIRECTION_INVERSE[facingDirection];
  const result = moveInDirection(x, y, floor, escapeDir, 7);
  if (result.distance === 0) {
    return null; // Can't escape at all
  }
  return result;
}

// Dive internal: Move toward target in a specific direction
function diveInternal(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number,
  maxDistance: number
): { x: number; y: number; distance: number } | null {
  const dir = getDirectionTo(startX, startY, targetX, targetY);
  if (!dir) {
    return null; // Already at target or invalid
  }

  const vec = DIRECTION_VECTORS[dir];
  let currentX = startX;
  let currentY = startY;
  let distance = 0;

  // Calculate actual distance to target (Chebyshev distance)
  const targetDist = Math.max(Math.abs(targetX - startX), Math.abs(targetY - startY));
  const effectiveMax = Math.min(maxDistance, targetDist);

  for (let i = 0; i < effectiveMax; i++) {
    // Check if we can move in this direction from current tile
    if (!canMove(currentX, currentY, floor, dir)) {
      break;
    }

    // Move to next tile
    const nextX = currentX + vec.x;
    const nextY = currentY + vec.y;

    // Check if the destination tile allows entry from our direction
    const inverseDir = DIRECTION_INVERSE[dir];
    const destByte = getTileDataSync(nextX, nextY, floor);
    if (!isDirectionFree(destByte, inverseDir)) {
      break;
    }

    currentX = nextX;
    currentY = nextY;
    distance++;
  }

  if (distance === 0) {
    return null;
  }

  return { x: currentX, y: currentY, distance };
}

// Dive: Move toward a target tile, up to 10 tiles
// Uses diagonal movement if target is diagonal, otherwise cardinal
// Returns the landing position or null if can't move at all
export function dive(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number
): { x: number; y: number; distance: number } | null {
  const dx = targetX - startX;
  const dy = targetY - startY;

  // If already at target
  if (dx === 0 && dy === 0) {
    return null;
  }

  // Try direct path first
  const direct = diveInternal(startX, startY, floor, targetX, targetY, 10);
  if (direct && direct.distance > 0) {
    return direct;
  }

  // If diagonal was blocked, try splitting into components
  if (dx !== 0 && dy !== 0) {
    // Try X-axis only
    const xOnly = diveInternal(startX, startY, floor, targetX, startY, 10);
    if (xOnly && xOnly.distance > 0) {
      return xOnly;
    }

    // Try Y-axis only
    const yOnly = diveInternal(startX, startY, floor, startX, targetY, 10);
    if (yOnly && yOnly.distance > 0) {
      return yOnly;
    }
  }

  return null;
}

// Barge: Same as dive (move toward a target)
export function barge(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number
): { x: number; y: number; distance: number } | null {
  return dive(startX, startY, floor, targetX, targetY);
}

// ============ PATH-RETURNING VERSIONS ============
// These return the full array of tiles traversed, not just the final position

export interface TileCoord {
  x: number;
  y: number;
}

// Internal: Move in direction and collect all tiles traversed
function moveInDirectionWithPath(
  startX: number,
  startY: number,
  floor: number,
  dir: DirectionType,
  maxDistance: number
): TileCoord[] {
  const vec = DIRECTION_VECTORS[dir];
  const path: TileCoord[] = [];
  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < maxDistance; i++) {
    if (!canMove(currentX, currentY, floor, dir)) {
      break;
    }

    const nextX = currentX + vec.x;
    const nextY = currentY + vec.y;

    const inverseDir = DIRECTION_INVERSE[dir];
    const destByte = getTileDataSync(nextX, nextY, floor);
    if (!isDirectionFree(destByte, inverseDir)) {
      break;
    }

    currentX = nextX;
    currentY = nextY;
    path.push({ x: currentX, y: currentY });
  }

  return path;
}

// Internal: Dive toward target and collect path
function diveInternalWithPath(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number,
  maxDistance: number
): TileCoord[] {
  const dir = getDirectionTo(startX, startY, targetX, targetY);
  if (!dir) {
    return [];
  }

  const vec = DIRECTION_VECTORS[dir];
  const path: TileCoord[] = [];
  let currentX = startX;
  let currentY = startY;

  const targetDist = Math.max(Math.abs(targetX - startX), Math.abs(targetY - startY));
  const effectiveMax = Math.min(maxDistance, targetDist);

  for (let i = 0; i < effectiveMax; i++) {
    if (!canMove(currentX, currentY, floor, dir)) {
      break;
    }

    const nextX = currentX + vec.x;
    const nextY = currentY + vec.y;

    const inverseDir = DIRECTION_INVERSE[dir];
    const destByte = getTileDataSync(nextX, nextY, floor);
    if (!isDirectionFree(destByte, inverseDir)) {
      break;
    }

    currentX = nextX;
    currentY = nextY;
    path.push({ x: currentX, y: currentY });
  }

  return path;
}

// Surge with path: Returns array of all tiles traversed during surge
export function surgePath(
  x: number,
  y: number,
  floor: number,
  facingDirection: DirectionType
): TileCoord[] {
  return moveInDirectionWithPath(x, y, floor, facingDirection, 10);
}

// Escape with path: Returns array of all tiles traversed during escape
export function escapePath(
  x: number,
  y: number,
  floor: number,
  facingDirection: DirectionType
): TileCoord[] {
  const escapeDir = DIRECTION_INVERSE[facingDirection];
  return moveInDirectionWithPath(x, y, floor, escapeDir, 7);
}

// Dive with path: Returns array of all tiles traversed during dive
export function divePath(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number
): TileCoord[] {
  const dx = targetX - startX;
  const dy = targetY - startY;

  if (dx === 0 && dy === 0) {
    return [];
  }

  // Try direct path first
  const direct = diveInternalWithPath(startX, startY, floor, targetX, targetY, 10);
  if (direct.length > 0) {
    return direct;
  }

  // If diagonal was blocked, try splitting into components
  if (dx !== 0 && dy !== 0) {
    const xOnly = diveInternalWithPath(startX, startY, floor, targetX, startY, 10);
    if (xOnly.length > 0) {
      return xOnly;
    }

    const yOnly = diveInternalWithPath(startX, startY, floor, startX, targetY, 10);
    if (yOnly.length > 0) {
      return yOnly;
    }
  }

  return [];
}

// Barge with path: Same as divePath
export function bargePath(
  startX: number,
  startY: number,
  floor: number,
  targetX: number,
  targetY: number
): TileCoord[] {
  return divePath(startX, startY, floor, targetX, targetY);
}

// Debug: Visualize surge possibilities from a position
export function debugSurge(x: number, y: number, floor: number): void {
  console.log(`%c=== SURGE DEBUG from (${x}, ${y}) floor ${floor} ===`, 'color: cyan; font-weight: bold');

  for (const dir of ALL_DIRECTIONS) {
    const result = moveInDirection(x, y, floor, dir, 10);
    const dirName = Object.keys(Direction).find(k => Direction[k as keyof typeof Direction] === dir) || dir;
    if (result.distance > 0) {
      console.log(`  ${dirName}: ${result.distance} tiles → (${result.x}, ${result.y})`);
    } else {
      console.log(`  ${dirName}: BLOCKED`);
    }
  }
}

// Debug: Visualize dive possibility to a target
export function debugDive(startX: number, startY: number, floor: number, targetX: number, targetY: number): void {
  console.log(`%c=== DIVE DEBUG from (${startX}, ${startY}) to (${targetX}, ${targetY}) floor ${floor} ===`, 'color: magenta; font-weight: bold');

  const result = dive(startX, startY, floor, targetX, targetY);
  if (result) {
    console.log(`  Landing: (${result.x}, ${result.y}), Distance: ${result.distance}`);
  } else {
    console.log(`  Cannot dive to target`);
  }
}

// Get all modified collision files (for saving)
export function getModifiedCollisionFiles(): Array<{ fileX: number; fileY: number; floor: number; data: Uint8Array }> {
  const files: Array<{ fileX: number; fileY: number; floor: number; data: Uint8Array }> = [];

  for (const [key, data] of collisionCache.entries()) {
    if (data) {
      const parsed = parseTileKey(key);
      if (parsed) {
        files.push({
          fileX: parsed.x,
          fileY: parsed.y,
          floor: parsed.floor,
          data: data,
        });
      }
    }
  }

  return files;
}

// Save collision file to server
export async function saveCollisionFile(fileX: number, fileY: number, floor: number): Promise<boolean> {
  const cacheKey = getFileCacheKey(fileX, fileY, floor);
  const data = collisionCache.get(cacheKey);

  if (!data) {
    console.warn(`No collision data for file (${fileX}, ${fileY}) floor ${floor}`);
    return false;
  }

  try {
    // Add query params for file identification
    const url = new URL(`${getApiBase()}/api/collision/save`);
    url.searchParams.set('fileX', String(fileX));
    url.searchParams.set('fileY', String(fileY));
    url.searchParams.set('floor', String(floor));

    // Convert Uint8Array to Blob for fetch body
    const arrayBuffer = new ArrayBuffer(data.length);
    new Uint8Array(arrayBuffer).set(data);
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      credentials: 'include',
      body: blob,
    });

    if (res.ok) {
      console.log(`%c✅ Saved collision file (${fileX}, ${fileY}) floor ${floor}`, 'color: lime');
      return true;
    } else {
      console.error(`Failed to save collision file: ${res.status} ${res.statusText}`);
      return false;
    }
  } catch (err) {
    console.error('Failed to save collision file:', err);
    return false;
  }
}

// Helper: Convert Uint8Array to base64 string
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

// Save all modified collision files to server using batch endpoint
export async function saveAllCollisionFiles(): Promise<{ saved: number; failed: number }> {
  const files = getModifiedCollisionFiles();

  if (files.length === 0) {
    console.log('%cNo collision files to save', 'color: orange');
    return { saved: 0, failed: 0 };
  }

  console.log(`%c📦 Preparing ${files.length} collision files for batch save...`, 'color: cyan');

  // Convert files to base64 format for batch request
  const batchFiles = files.map(file => ({
    fileX: file.fileX,
    fileY: file.fileY,
    floor: file.floor,
    data: uint8ArrayToBase64(file.data),
  }));

  try {
    const res = await fetch(`${getApiBase()}/api/collision/save-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ files: batchFiles }),
    });

    if (!res.ok) {
      console.error(`Batch save failed: ${res.status} ${res.statusText}`);
      return { saved: 0, failed: files.length };
    }

    const result = await res.json();
    console.log(`%c✅ Batch save complete: ${result.savedCount}/${result.totalCount} files saved`,
      result.savedCount === result.totalCount ? 'color: lime' : 'color: orange');

    return {
      saved: result.savedCount ?? 0,
      failed: (result.totalCount ?? files.length) - (result.savedCount ?? 0)
    };
  } catch (err) {
    console.error('Batch save failed:', err);
    return { saved: 0, failed: files.length };
  }
}

// Download collision file as binary
export function downloadCollisionFile(fileX: number, fileY: number, floor: number): void {
  const cacheKey = getFileCacheKey(fileX, fileY, floor);
  const data = collisionCache.get(cacheKey);

  if (!data) {
    console.warn(`No collision data for file (${fileX}, ${fileY}) floor ${floor}`);
    return;
  }

  // Convert Uint8Array to ArrayBuffer for Blob
  const arrayBuffer = new ArrayBuffer(data.length);
  new Uint8Array(arrayBuffer).set(data);
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collision-${fileX}-${fileY}-${floor}.bin`;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`%c📥 Downloaded collision-${fileX}-${fileY}-${floor}.bin`, 'color: cyan');
}

// Debug: Check tile movement data
export async function debugTile(x: number, y: number, floor: number): Promise<void> {
  const data = await getTileData(x, y, floor);
  const { fileX, fileY } = getFileCoords(x, y);
  const localX = ((x % META.tilesPerFile) + META.tilesPerFile) % META.tilesPerFile;
  const localY = ((y % META.tilesPerFile) + META.tilesPerFile) % META.tilesPerFile;

  console.log(`Tile (${x}, ${y}) floor ${floor}:`);
  console.log(`  File: (${fileX}, ${fileY}), Local: (${localX}, ${localY})`);
  console.log(`  Byte: ${data} (0b${data.toString(2).padStart(8, '0')}) [SET=walkable, CLEAR=blocked]`);
  console.log(`  West (bit0):  ${isDirectionFree(data, Direction.WEST) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  North (bit1): ${isDirectionFree(data, Direction.NORTH) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  East (bit2):  ${isDirectionFree(data, Direction.EAST) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  South (bit3): ${isDirectionFree(data, Direction.SOUTH) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  NW (bit4):    ${isDirectionFree(data, Direction.NORTHWEST) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  NE (bit5):    ${isDirectionFree(data, Direction.NORTHEAST) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  SE (bit6):    ${isDirectionFree(data, Direction.SOUTHEAST) ? '✅ can walk' : '❌ blocked'}`);
  console.log(`  SW (bit7):    ${isDirectionFree(data, Direction.SOUTHWEST) ? '✅ can walk' : '❌ blocked'}`);

  // Check accessibility
  const accessible = await isAccessible(x, y, floor);
  console.log(`  Accessible: ${accessible ? '✅' : '❌'}`);
}

// Debug: Test pathfinding with verbose output
export async function debugPathfind(
  startX: number, startY: number,
  endX: number, endY: number,
  floor: number
): Promise<void> {
  console.log('%c=== DEBUG PATHFIND ===', 'color: cyan; font-weight: bold');
  console.log(`From: (${startX}, ${startY}) To: (${endX}, ${endY}) Floor: ${floor}`);

  // Load the area
  await preloadArea(startX, startY, endX, endY, floor, 1);

  // Check start tile
  console.log('\n--- Start Tile ---');
  await debugTile(startX, startY, floor);

  // Check end tile
  console.log('\n--- End Tile ---');
  await debugTile(endX, endY, floor);

  // Check neighbors of start
  console.log('\n--- Start Neighbors ---');
  for (const dir of ALL_DIRECTIONS) {
    const vec = DIRECTION_VECTORS[dir];
    const nx = startX + vec.x;
    const ny = startY + vec.y;
    const neighborData = await getTileData(nx, ny, floor);
    const canMoveToStart = isDirectionFree(neighborData, DIRECTION_INVERSE[dir]);
    const canMoveFromStart = isDirectionFree(await getTileData(startX, startY, floor), dir);
    console.log(`  ${getDirName(dir)}: neighbor(${nx},${ny})=${neighborData}, canMoveToStart=${canMoveToStart}, canMoveFromStart=${canMoveFromStart}`);
  }

  // Try to find path
  console.log('\n--- Running A* ---');
  const path = await findPath(startY, startX, endY, endX, floor);
  if (path) {
    console.log(`%c✅ Path found with ${path.length} waypoints`, 'color: lime');
  } else {
    console.log('%c❌ No path found', 'color: red');
  }
}

function getDirName(dir: DirectionType): string {
  const names: Record<DirectionType, string> = {
    [Direction.WEST]: 'W ',
    [Direction.NORTH]: 'N ',
    [Direction.EAST]: 'E ',
    [Direction.SOUTH]: 'S ',
    [Direction.NORTHWEST]: 'NW',
    [Direction.NORTHEAST]: 'NE',
    [Direction.SOUTHEAST]: 'SE',
    [Direction.SOUTHWEST]: 'SW',
  };
  return names[dir];
}

// Debug: Show collision file info
export async function debugCollisionFile(fileX: number, fileY: number, floor: number): Promise<void> {
  const data = await loadCollisionFile(fileX, fileY, floor);
  if (!data) {
    console.log(`❌ No collision file found for file (${fileX}, ${fileY}) floor ${floor}`);
    return;
  }

  console.log(`Collision file (${fileX}, ${fileY}) floor ${floor}:`);
  console.log(`  Size: ${data.length} bytes (expected: ${META.tilesPerFile * META.tilesPerFile} = ${1280 * 1280})`);
  console.log(`  Covers tiles: X ${fileX * META.tilesPerFile} - ${(fileX + 1) * META.tilesPerFile - 1}`);
  console.log(`  Covers tiles: Y ${fileY * META.tilesPerFile} - ${(fileY + 1) * META.tilesPerFile - 1}`);

  // Count walkable vs blocked
  let fullyBlocked = 0;
  let fullyOpen = 0;
  let partial = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) fullyBlocked++;
    else if (data[i] === 255) fullyOpen++;
    else partial++;
  }
  console.log(`  Fully blocked (0): ${fullyBlocked}`);
  console.log(`  Fully open (255): ${fullyOpen}`);
  console.log(`  Partial: ${partial}`);
}

// Debug: Get transport links at a position
export function debugTransport(x: number, y: number, level: number): void {
  const links = getTransportLinks(x, y, level);
  if (links.length === 0) {
    console.log(`No transport links at (${x}, ${y}) level ${level}`);
  } else {
    console.log(`Transport links at (${x}, ${y}) level ${level}:`);
    for (const link of links) {
      console.log(`  ${link.name}: -> (${link.toX}, ${link.toY}) level ${link.toLevel} (${link.time} ticks)`);
    }
  }
}

// Debug: Sample an area and show walkability
export async function debugArea(centerX: number, centerY: number, floor: number, radius: number = 5): Promise<void> {
  console.log(`\nWalkability around (${centerX}, ${centerY}) floor ${floor}:`);
  console.log(`Legend: . = open all dirs, # = blocked all, 0-9/a-f = partial (hex count of open dirs)`);

  await preloadArea(centerX - radius, centerY - radius, centerX + radius, centerY + radius, floor, 0);

  let header = '     ';
  for (let x = centerX - radius; x <= centerX + radius; x++) {
    header += (Math.abs(x) % 10).toString();
  }
  console.log(header);

  for (let y = centerY + radius; y >= centerY - radius; y--) {
    let row = `${y.toString().padStart(4, ' ')} `;
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      const tile = getTileDataSync(x, y, floor);
      if (tile === 0) {
        row += '#';
      } else if (tile === 255) {
        row += '.';
      } else {
        // Count open directions
        let count = 0;
        for (let i = 0; i < 8; i++) {
          if ((tile & (1 << i)) !== 0) count++;
        }
        row += count.toString(16);
      }
    }
    if (y === centerY) row += ' <-- center';
    console.log(row);
  }
}

// ============ PATH SAVING/LOADING ============
// Save and retrieve paths from the server database

export type PathType = 'to_step' | 'within_step';

export interface SavedPath {
  id: number;
  name: string | null;
  description: string | null;
  start_x: number;
  start_y: number;
  start_floor: number;
  end_x: number;
  end_y: number;
  end_floor: number;
  tiles: TileCoord[];
  tile_count: number;
  quest_step_id: number | null;
  path_type: PathType;
  sequence: number;
  created_at: string;
  updated_at: string;
}

// Convert PathWaypoint[] (lat/lng) to TileCoord[] (x/y)
export function waypointsToTiles(waypoints: PathWaypoint[]): TileCoord[] {
  return waypoints.map(wp => ({
    x: Math.floor(wp.lng),
    y: Math.floor(wp.lat),
  }));
}

// Convert TileCoord[] (x/y) to PathWaypoint[] (lat/lng)
export function tilesToWaypoints(tiles: TileCoord[]): PathWaypoint[] {
  return tiles.map(t => ({
    lat: t.y,
    lng: t.x,
  }));
}

// Save a path to the server
export async function savePath(
  waypoints: PathWaypoint[],
  startFloor: number,
  endFloor: number,
  options?: {
    name?: string;
    description?: string;
    quest_step_id?: number;
    path_type?: PathType;
    sequence?: number;
  }
): Promise<SavedPath | null> {
  if (!waypoints || waypoints.length < 2) {
    console.warn('Cannot save path: need at least 2 waypoints');
    return null;
  }

  const tiles = waypointsToTiles(waypoints);
  const start = tiles[0];
  const end = tiles[tiles.length - 1];

  try {
    const response = await fetch(`${getApiBase()}/api/paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: options?.name || null,
        description: options?.description || null,
        start_x: start.x,
        start_y: start.y,
        start_floor: startFloor,
        end_x: end.x,
        end_y: end.y,
        end_floor: endFloor,
        tiles,
        quest_step_id: options?.quest_step_id || null,
        path_type: options?.path_type || 'to_step',
        sequence: options?.sequence ?? 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to save path:', error);
      return null;
    }

    const saved = await response.json() as SavedPath;
    console.log(`✅ Path saved: ID ${saved.id}, ${saved.tile_count} tiles`);
    return saved;
  } catch (err) {
    console.error('Error saving path:', err);
    return null;
  }
}

// Get a path by ID
export async function getPath(id: number): Promise<SavedPath | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/paths/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json() as SavedPath;
  } catch (err) {
    console.error('Error fetching path:', err);
    return null;
  }
}

// List paths with optional filtering
export async function listPaths(options?: {
  quest_step_id?: number;
  floor?: number;
  limit?: number;
  offset?: number;
}): Promise<{ paths: SavedPath[]; total: number } | null> {
  try {
    const params = new URLSearchParams();
    if (options?.quest_step_id) params.set('quest_step_id', String(options.quest_step_id));
    if (options?.floor !== undefined) params.set('floor', String(options.floor));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const url = `${getApiBase()}/api/paths${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return { paths: data.paths, total: data.pagination.total };
  } catch (err) {
    console.error('Error listing paths:', err);
    return null;
  }
}

// Delete a path by ID
export async function deletePath(id: number): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/api/paths/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (err) {
    console.error('Error deleting path:', err);
    return false;
  }
}

// Find path and save it in one operation
export async function findPathAndSave(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  floor: number,
  endFloor?: number,
  options?: {
    name?: string;
    description?: string;
    quest_step_id?: number;
  }
): Promise<{ path: PathWaypoint[] | null; saved: SavedPath | null }> {
  const path = await findPath(startLat, startLng, endLat, endLng, floor, endFloor);

  if (!path) {
    return { path: null, saved: null };
  }

  const saved = await savePath(path, floor, endFloor ?? floor, options);
  return { path, saved };
}

// Get paths for a quest step and convert to waypoints
export async function getPathsForStep(questStepId: number): Promise<Array<{
  id: number;
  waypoints: PathWaypoint[];
  floor: number;
  name: string | null;
}>> {
  const result = await listPaths({ quest_step_id: questStepId });
  if (!result) return [];

  return result.paths.map(p => ({
    id: p.id,
    waypoints: tilesToWaypoints(p.tiles),
    floor: p.start_floor,
    name: p.name,
  }));
}

// Expose debug functions
if (typeof window !== 'undefined') {
  (window as any).debugTile = debugTile;
  (window as any).debugCollisionFile = debugCollisionFile;
  (window as any).debugTransport = debugTransport;
  (window as any).debugArea = debugArea;
  (window as any).debugPathfind = debugPathfind;
  (window as any).clearCollisionCache = clearCollisionCache;
  (window as any).loadTransportationData = loadTransportationData;
  (window as any).reloadTransports = reloadTransports;
  (window as any).loadCollisionForDebug = loadCollisionForDebug;
  (window as any).getFilesForArea = getFilesForArea;
  (window as any).getCachedTileKeys = getCachedTileKeys;
  // Collision editing functions
  (window as any).makeTileWalkable = makeTileWalkable;
  (window as any).makeTileBlocked = makeTileBlocked;
  (window as any).makeAreaWalkable = makeAreaWalkable;
  (window as any).makeAreaBlocked = makeAreaBlocked;
  (window as any).setTileCollision = setTileCollision;
  (window as any).setTileWalkableDirections = setTileWalkableDirections;
  (window as any).refreshCollisionImage = refreshCollisionImage;

  // Collision editor mode functions
  (window as any).enableCollisionEditor = enableCollisionEditor;
  (window as any).disableCollisionEditor = disableCollisionEditor;
  (window as any).toggleCollisionEditor = toggleCollisionEditor;
  (window as any).setCollisionEditorMode = setCollisionEditorMode;
  (window as any).collisionEditorState = collisionEditorState;

  // Collision save/export functions
  (window as any).saveCollisionFile = saveCollisionFile;
  (window as any).saveAllCollisionFiles = saveAllCollisionFiles;
  (window as any).downloadCollisionFile = downloadCollisionFile;
  (window as any).getModifiedCollisionFiles = getModifiedCollisionFiles;

  // Mobility ability functions
  (window as any).surge = surge;
  (window as any).dive = dive;
  (window as any).escape = escape;
  (window as any).barge = barge;
  (window as any).surgePath = surgePath;
  (window as any).divePath = divePath;
  (window as any).escapePath = escapePath;
  (window as any).bargePath = bargePath;
  (window as any).debugSurge = debugSurge;
  (window as any).debugDive = debugDive;
  (window as any).Direction = Direction;
  (window as any).DIRECTION_BITS = DIRECTION_BITS;

  // Path saving/loading functions
  (window as any).savePath = savePath;
  (window as any).getPath = getPath;
  (window as any).listPaths = listPaths;
  (window as any).deletePath = deletePath;
  (window as any).findPathAndSave = findPathAndSave;
  (window as any).getPathsForStep = getPathsForStep;

  // Transport management functions
  (window as any).loadCustomTransports = loadCustomTransports;
  (window as any).getCustomTransports = getCustomTransports;
  (window as any).createTransport = createTransport;
  (window as any).createTransportsBulk = createTransportsBulk;
  (window as any).updateTransport = updateTransport;
  (window as any).deleteTransport = deleteTransport;
  (window as any).getTransport = getTransport;
  (window as any).listTransports = listTransports;
  (window as any).createStairs = createStairs;
  (window as any).createLadder = createLadder;
  (window as any).createTeleport = createTeleport;
  (window as any).debugCustomTransports = debugCustomTransports;
  (window as any).showTransportTypes = showTransportTypes;

  console.log('%c🔧 Pathfinding debug functions:', 'color: green');
  console.log('  debugTile(x, y, floor) - Show tile movement data');
  console.log('  debugPathfind(startX, startY, endX, endY, floor) - Verbose pathfind test');
  console.log('  debugArea(x, y, floor, radius) - Show area walkability');
  console.log('%c✏️ Collision Editor (interactive):', 'color: yellow');
  console.log('  toggleCollisionEditor() - Toggle editor on/off');
  console.log('  setCollisionEditorMode("walkable"|"blocked") - Set paint mode');
  console.log('%c💾 Collision save/export:', 'color: magenta');
  console.log('  saveAllCollisionFiles() - Save all modified files to server');
  console.log('  downloadCollisionFile(fileX, fileY, floor) - Download as .bin file');
  console.log('%c✏️ Collision editing (manual):', 'color: cyan');
  console.log('  makeTileWalkable(x, y, floor) - Make tile fully walkable');
  console.log('  makeTileBlocked(x, y, floor) - Make tile fully blocked');
  console.log('  makeAreaWalkable(minX, minY, maxX, maxY, floor) - Make area walkable');
  console.log('  makeAreaBlocked(minX, minY, maxX, maxY, floor) - Make area blocked');
  console.log('%c🚀 Mobility abilities:', 'color: #f97316');
  console.log('  surge(x, y, floor, dir) - Surge landing position');
  console.log('  surgePath(x, y, floor, dir) - Array of tiles traversed');
  console.log('  escape(x, y, floor, dir) - Escape landing position');
  console.log('  escapePath(x, y, floor, dir) - Array of tiles traversed');
  console.log('  dive(sX, sY, floor, tX, tY) - Dive landing position');
  console.log('  divePath(sX, sY, floor, tX, tY) - Array of tiles traversed');
  console.log('  debugSurge(x, y, floor) - Show all surge possibilities');
  console.log('  Direction - {NORTH:2, SOUTH:4, EAST:3, WEST:1, NE:6, NW:5, SE:7, SW:8}');
  console.log('%c📍 Path saving/loading:', 'color: #10b981');
  console.log('  savePath(waypoints, startFloor, endFloor, {name, quest_step_id})');
  console.log('  findPathAndSave(sLat, sLng, eLat, eLng, floor, endFloor, opts)');
  console.log('  getPath(id) - Get saved path by ID');
  console.log('  listPaths({quest_step_id, floor, limit}) - List saved paths');
  console.log('  getPathsForStep(questStepId) - Get all paths for a quest step');
  console.log('%c🚂 Transport management:', 'color: #8b5cf6');
  console.log('  loadCustomTransports() - Load all transports from server');
  console.log('  createStairs(name, fX, fY, fFloor, tX, tY, tFloor, bidir)');
  console.log('  createLadder(name, fX, fY, fFloor, tX, tY, tFloor, bidir)');
  console.log('  createTeleport(name, fX, fY, fFloor, tX, tY, tFloor, type, time)');
  console.log('  listTransports({floor, transport_type}) - List transports');
  console.log('  deleteTransport(id) - Delete a transport');
  console.log('  showTransportTypes() - Show all transport types');
}

// Render collision data to a canvas and return blob URL
// Shows WALKABLE areas: green = can walk, red = blocked
function renderCollisionToImage(data: Uint8Array, fileX: number, fileY: number, floor: number): string {
  const size = META.tilesPerFile; // 1280
  const scale = 1; // 1 pixel per tile

  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d')!;

  // Create ImageData for efficient pixel manipulation
  const imageData = ctx.createImageData(size * scale, size * scale);
  const pixels = imageData.data;

  for (let tileY = 0; tileY < size; tileY++) {
    for (let tileX = 0; tileX < size; tileX++) {
      const index = tileY * size + tileX;
      const blockedByte = data[index] || 0;

      // Byte already represents walkable bits: SET = can walk
      const walkableByte = blockedByte;

      // Calculate pixel position (flip Y for canvas - origin at top-left)
      const canvasY = (size - 1 - tileY) * scale;
      const canvasX = tileX * scale;

      // Determine color based on walkability (now using walkable bits)
      let r = 0, g = 0, b = 0, a = 0;

      // Walkable bits: SET = FREE, CLEAR = BLOCKED
      if (walkableByte === 255) {
        // All bits set = all directions walkable - green
        r = 0; g = 255; b = 0; a = 100;
      } else if (walkableByte === 0) {
        // No bits set = completely blocked - red
        r = 255; g = 0; b = 0; a = 180;
      } else {
        // Partially walkable - color based on how many directions are FREE
        const freeDirs = countBits(walkableByte);
        const openness = freeDirs / 8; // 0-1, more set bits = more walkable
        r = Math.floor(255 * (1 - openness));
        g = Math.floor(255 * openness);
        b = 0;
        a = 150;
      }

      // Set pixel
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const pixelIndex = ((canvasY + dy) * size * scale + (canvasX + dx)) * 4;
          pixels[pixelIndex] = r;
          pixels[pixelIndex + 1] = g;
          pixels[pixelIndex + 2] = b;
          pixels[pixelIndex + 3] = a;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to blob URL
  const dataUrl = canvas.toDataURL('image/png');
  console.log(`%c🖼️ Rendered collision image for file (${fileX}, ${fileY}) floor ${floor}`, 'color: magenta');
  return dataUrl;
}

// Count set bits in a byte
function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

// Get all cached collision file keys
export function getCachedTileKeys(): string[] {
  const keys: string[] = [];
  for (const [key, data] of collisionCache.entries()) {
    if (data !== null) {
      keys.push(key);
    }
  }
  return keys;
}

// Get cached image URL for a collision file
export function getCachedTileImageUrl(key: string): string | null {
  // Check if we already rendered this
  if (collisionImageCache.has(key)) {
    return collisionImageCache.get(key)!;
  }

  // Check if we have the data to render
  const data = collisionCache.get(key);
  if (!data) {
    return null;
  }

  // Parse key to get file coords
  const parsed = parseTileKey(key);
  if (!parsed) {
    return null;
  }

  // Render and cache
  const imageUrl = renderCollisionToImage(data, parsed.x, parsed.y, parsed.floor);
  collisionImageCache.set(key, imageUrl);
  return imageUrl;
}

// Parse a tile cache key back to coordinates
export function parseTileKey(key: string): { floor: number; x: number; y: number } | null {
  // Key format: "fileX-fileY-floor"
  const parts = key.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  const floor = parseInt(parts[2], 10);

  if (isNaN(x) || isNaN(y) || isNaN(floor)) {
    return null;
  }

  return { floor, x, y };
}

// Get Leaflet bounds for a collision file
// Returns [[south, west], [north, east]] in lat/lng (where lat=y, lng=x)
export function getTileBounds(fileX: number, fileY: number): [[number, number], [number, number]] {
  const tilesPerFile = META.tilesPerFile; // 1280

  // Calculate world coordinate bounds for this file
  const westX = fileX * tilesPerFile;
  const eastX = (fileX + 1) * tilesPerFile;
  const southY = fileY * tilesPerFile;
  const northY = (fileY + 1) * tilesPerFile;

  // Leaflet bounds: [[south, west], [north, east]] = [[minLat, minLng], [maxLat, maxLng]]
  // Since lat=y and lng=x:
  return [[southY, westX], [northY, eastX]];
}

// Get URL for collision file from API
export function getCollisionTileUrl(floor: number, fileX: number, fileY: number): string {
  return `${getApiBase()}/api/collision/${floor}/0/${fileX}-${fileY}.png`;
}

// Load and render a collision file for debug visualization
export async function loadCollisionForDebug(fileX: number, fileY: number, floor: number): Promise<boolean> {
  const data = await loadCollisionFile(fileX, fileY, floor);
  return data !== null;
}

// Get file coordinates that cover a world area
export function getFilesForArea(
  minX: number, minY: number,
  maxX: number, maxY: number
): Array<{ x: number; y: number }> {
  const files: Array<{ x: number; y: number }> = [];

  const startFile = getFileCoords(minX, minY);
  const endFile = getFileCoords(maxX, maxY);

  for (let fx = startFile.fileX; fx <= endFile.fileX; fx++) {
    for (let fy = startFile.fileY; fy <= endFile.fileY; fy++) {
      files.push({ x: fx, y: fy });
    }
  }

  return files;
}

export async function debugCollisionArea(
  _centerLat: number,
  _centerLng: number,
  _floor: number,
  _radius?: number
): Promise<void> {
  console.log('debugCollisionArea is deprecated - use debugTile(x, y, floor) instead');
}

// ============ TRANSPORT MANAGEMENT ============
// Functions to manage custom transports (stairs, ladders, teleports, etc.)

export type TransportDirection = "up" | "down" | "both" | "same";
export type TransportType =
  | "stairs" | "ladder" | "trapdoor" | "rope"
  | "teleport" | "lodestone" | "fairy_ring" | "spirit_tree" | "portal" | "jewelry_teleport" | "archaeology_journal"
  | "gnome_glider" | "balloon" | "eagle" | "magic_carpet"
  | "minecart" | "gnome_cart"
  | "boat" | "canoe" | "charter_ship"
  | "agility" | "door" | "gate"
  | "other";

export interface CustomTransport {
  id: number;
  name: string;
  transport_type: TransportType;
  from_x: number;
  from_y: number;
  from_floor: number;
  from_x2?: number | null; // Optional second corner for multi-tile
  from_y2?: number | null;
  to_x: number;
  to_y: number;
  to_floor: number;
  direction: TransportDirection;
  travel_time: number;
  enabled: boolean;
  bidirectional: boolean;
  source?: string; // Source of the transport data (cache, manual, import)
  created_at: string;
  updated_at: string;
}

export interface NewTransport {
  name: string;
  transport_type?: TransportType;
  from_x: number;
  from_y: number;
  from_floor?: number;
  from_x2?: number; // Optional second corner for multi-tile bounds
  from_y2?: number;
  to_x: number;
  to_y: number;
  to_floor?: number;
  direction?: TransportDirection;
  travel_time?: number;
  enabled?: boolean;
  bidirectional?: boolean;
}

// Cache for custom transports loaded from server
const customTransportCache = new Map<string, CustomTransport[]>();
let customTransportsLoaded = false;

// Get custom transport cache key
function getCustomTransportKey(x: number, y: number, floor: number): string {
  return `${x},${y},${floor}`;
}

// Load all custom transports from the server
export async function loadCustomTransports(): Promise<CustomTransport[]> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/all`);
    if (!response.ok) {
      console.error('Failed to load custom transports');
      return [];
    }

    const transports: CustomTransport[] = await response.json();
    console.log(`%c📦 Loaded ${transports.length} custom transports`, 'color: cyan');

    // Build cache indexed by from location
    customTransportCache.clear();
    for (const transport of transports) {
      const key = getCustomTransportKey(transport.from_x, transport.from_y, transport.from_floor);
      if (!customTransportCache.has(key)) {
        customTransportCache.set(key, []);
      }
      customTransportCache.get(key)!.push(transport);

      // If bidirectional, also add reverse link
      if (transport.bidirectional) {
        const reverseKey = getCustomTransportKey(transport.to_x, transport.to_y, transport.to_floor);
        if (!customTransportCache.has(reverseKey)) {
          customTransportCache.set(reverseKey, []);
        }

        // Generate appropriate reverse name based on direction
        let reverseName = transport.name;
        if (transport.to_floor > transport.from_floor) {
          // Original goes UP, reverse goes DOWN
          reverseName = reverseName
            .replace(/\bClimb up\b/gi, 'Climb down')
            .replace(/\bClimb-up\b/gi, 'Climb-down')
            .replace(/\bUp\b/g, 'Down');
        } else if (transport.to_floor < transport.from_floor) {
          // Original goes DOWN, reverse goes UP
          reverseName = reverseName
            .replace(/\bClimb down\b/gi, 'Climb up')
            .replace(/\bClimb-down\b/gi, 'Climb-up')
            .replace(/\bDown\b/g, 'Up');
        }
        if (reverseName === transport.name) {
          reverseName = `${transport.name} (return)`;
        }

        // Create reverse transport entry
        const reverseTransport: CustomTransport = {
          ...transport,
          name: reverseName,
          from_x: transport.to_x,
          from_y: transport.to_y,
          from_floor: transport.to_floor,
          to_x: transport.from_x,
          to_y: transport.from_y,
          to_floor: transport.from_floor,
          // Reverse the direction
          direction: transport.direction === "up" ? "down" :
                     transport.direction === "down" ? "up" : transport.direction,
        };
        customTransportCache.get(reverseKey)!.push(reverseTransport);
      }
    }

    customTransportsLoaded = true;
    return transports;
  } catch (err) {
    console.error('Error loading custom transports:', err);
    return [];
  }
}

// Get custom transports from a position (from cache)
export function getCustomTransports(x: number, y: number, floor: number): CustomTransport[] {
  const key = getCustomTransportKey(x, y, floor);
  return customTransportCache.get(key) || [];
}

// Create a new transport
export async function createTransport(transport: NewTransport): Promise<CustomTransport | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transport),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create transport:', error);
      return null;
    }

    const created = await response.json() as CustomTransport;
    console.log(`%c✅ Transport created: ${created.name} (ID: ${created.id})`, 'color: lime');

    // Reload cache
    await loadCustomTransports();

    return created;
  } catch (err) {
    console.error('Error creating transport:', err);
    return null;
  }
}

// Create multiple transports at once
export async function createTransportsBulk(transports: NewTransport[]): Promise<{
  created: number;
  transports: CustomTransport[];
} | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transports),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to bulk create transports:', error);
      return null;
    }

    const result = await response.json();
    console.log(`%c✅ Bulk created ${result.created} transports`, 'color: lime');

    // Reload cache
    await loadCustomTransports();

    return result;
  } catch (err) {
    console.error('Error bulk creating transports:', err);
    return null;
  }
}

// Update an existing transport
export async function updateTransport(
  id: number,
  updates: Partial<Omit<NewTransport, 'from_x' | 'from_y' | 'to_x' | 'to_y'> & {
    from_x?: number;
    from_y?: number;
    from_floor?: number;
    to_x?: number;
    to_y?: number;
    to_floor?: number;
  }>
): Promise<CustomTransport | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to update transport:', error);
      return null;
    }

    const updated = await response.json() as CustomTransport;
    console.log(`%c✅ Transport updated: ${updated.name} (ID: ${id})`, 'color: lime');

    // Reload cache
    await loadCustomTransports();

    return updated;
  } catch (err) {
    console.error('Error updating transport:', err);
    return null;
  }
}

// Delete a transport
export async function deleteTransport(id: number): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to delete transport:', error);
      return false;
    }

    console.log(`%c✅ Transport deleted: ID ${id}`, 'color: lime');

    // Reload all transport caches
    await reloadTransports();

    return true;
  } catch (err) {
    console.error('Error deleting transport:', err);
    return false;
  }
}

// Delete all transports from a network node (same from location)
// Used for network transports like Spirit Trees, Fairy Rings where one node connects to many destinations
export async function deleteNetworkNode(fromX: number, fromY: number, fromFloor: number): Promise<{ deleted: number; failed: number }> {
  const result = { deleted: 0, failed: 0 };

  try {
    // Find all transports from this location
    const response = await fetch(`${getApiBase()}/api/transports?from_x=${fromX}&from_y=${fromY}&from_floor=${fromFloor}`);
    if (!response.ok) {
      console.error('Failed to fetch transports for deletion');
      return result;
    }

    const data = await response.json();
    const transports = data.transports || [];

    console.log(`%c🗑️ Found ${transports.length} transports at (${fromX}, ${fromY}, F${fromFloor})`, 'color: yellow');

    // Delete each one
    for (const transport of transports) {
      try {
        const delResponse = await fetch(`${getApiBase()}/api/transports/${transport.id}`, {
          method: 'DELETE',
        });

        if (delResponse.ok) {
          result.deleted++;
        } else {
          result.failed++;
        }
      } catch {
        result.failed++;
      }
    }

    console.log(`%c✅ Deleted ${result.deleted} transports, ${result.failed} failed`, 'color: lime');

    // Reload caches
    await reloadTransports();

    return result;
  } catch (err) {
    console.error('Error deleting network node:', err);
    return result;
  }
}

// Update transport coordinates
export async function updateTransportCoordinates(
  id: number,
  updates: {
    from_x?: number;
    from_y?: number;
    from_floor?: number;
    from_x2?: number | null; // Second corner for multi-tile bounds
    from_y2?: number | null;
    to_x?: number;
    to_y?: number;
    to_floor?: number;
  }
): Promise<CustomTransport | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to update transport:', error);
      return null;
    }

    const updated: CustomTransport = await response.json();
    console.log(`%c✅ Transport updated: ID ${id}`, 'color: lime', updates);

    // Reload transport caches
    await reloadTransports();

    return updated;
  } catch (err) {
    console.error('Error updating transport:', err);
    return null;
  }
}

// Get a single transport by ID
export async function getTransport(id: number): Promise<CustomTransport | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/transports/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json() as CustomTransport;
  } catch (err) {
    console.error('Error fetching transport:', err);
    return null;
  }
}

// List transports with filtering
export async function listTransports(options?: {
  floor?: number;
  direction?: TransportDirection;
  transport_type?: TransportType;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ transports: CustomTransport[]; total: number } | null> {
  try {
    const params = new URLSearchParams();
    if (options?.floor !== undefined) params.set('floor', String(options.floor));
    if (options?.direction) params.set('direction', options.direction);
    if (options?.transport_type) params.set('transport_type', options.transport_type);
    if (options?.enabled !== undefined) params.set('enabled', String(options.enabled));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const url = `${getApiBase()}/api/transports${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return { transports: data.transports, total: data.pagination.total };
  } catch (err) {
    console.error('Error listing transports:', err);
    return null;
  }
}

// Quick helper to create a stairs transport
export async function createStairs(
  name: string,
  fromX: number, fromY: number, fromFloor: number,
  toX: number, toY: number, toFloor: number,
  bidirectional: boolean = true
): Promise<CustomTransport | null> {
  const direction: TransportDirection =
    toFloor > fromFloor ? "up" :
    toFloor < fromFloor ? "down" : "same";

  return createTransport({
    name,
    transport_type: "stairs",
    from_x: fromX,
    from_y: fromY,
    from_floor: fromFloor,
    to_x: toX,
    to_y: toY,
    to_floor: toFloor,
    direction,
    bidirectional,
  });
}

// Quick helper to create a ladder transport
export async function createLadder(
  name: string,
  fromX: number, fromY: number, fromFloor: number,
  toX: number, toY: number, toFloor: number,
  bidirectional: boolean = true
): Promise<CustomTransport | null> {
  const direction: TransportDirection =
    toFloor > fromFloor ? "up" :
    toFloor < fromFloor ? "down" : "same";

  return createTransport({
    name,
    transport_type: "ladder",
    from_x: fromX,
    from_y: fromY,
    from_floor: fromFloor,
    to_x: toX,
    to_y: toY,
    to_floor: toFloor,
    direction,
    bidirectional,
  });
}

// Quick helper to create a teleport
export async function createTeleport(
  name: string,
  fromX: number, fromY: number, fromFloor: number,
  toX: number, toY: number, toFloor: number,
  transportType: TransportType = "teleport",
  travelTime: number = 3
): Promise<CustomTransport | null> {
  return createTransport({
    name,
    transport_type: transportType,
    from_x: fromX,
    from_y: fromY,
    from_floor: fromFloor,
    to_x: toX,
    to_y: toY,
    to_floor: toFloor,
    direction: "same",
    travel_time: travelTime,
    bidirectional: false, // Most teleports are one-way
  });
}

// Debug: List all transports at a position
export function debugCustomTransports(x: number, y: number, floor: number): void {
  const transports = getCustomTransports(x, y, floor);
  if (transports.length === 0) {
    console.log(`No custom transports at (${x}, ${y}) floor ${floor}`);
  } else {
    console.log(`Custom transports at (${x}, ${y}) floor ${floor}:`);
    for (const t of transports) {
      console.log(`  [${t.id}] ${t.name} (${t.transport_type}): -> (${t.to_x}, ${t.to_y}) floor ${t.to_floor} (${t.travel_time} ticks, ${t.direction})`);
    }
  }
}

// Debug: Show all transport types
export function showTransportTypes(): void {
  console.log('%c📋 Available Transport Types:', 'color: cyan; font-weight: bold');
  console.log('  Vertical: stairs, ladder, trapdoor, rope');
  console.log('  Teleports: teleport, lodestone, fairy_ring, spirit_tree, portal, jewelry_teleport');
  console.log('  Aerial: gnome_glider, balloon, eagle, magic_carpet');
  console.log('  Ground: minecart, gnome_cart');
  console.log('  Water: boat, canoe, charter_ship');
  console.log('  Shortcuts: agility, door, gate');
  console.log('  Other: other');
}

// ============ TRANSPORT EDITOR MODE ============
// Interactive mode for placing transports on the map

export interface TransportEditorPosition {
  x: number;
  y: number;
  floor: number;
}

// Direction actions for stairs/ladders
export type StairsAction = "up" | "down" | "climb_to_top" | "climb_to_bottom" | "auto";

export const transportEditorState = {
  enabled: false,
  transportType: "stairs" as TransportType,
  step: "idle" as "idle" | "from" | "from_corner" | "to",
  fromPosition: null as TransportEditorPosition | null,
  fromPosition2: null as TransportEditorPosition | null, // Second corner for multi-tile bounds
  toPosition: null as TransportEditorPosition | null,
  name: "",
  bidirectional: true,
  stairsAction: "auto" as StairsAction, // Direction action for stairs
  listeners: new Set<() => void>(),

  setEnabled(value: boolean) {
    this.enabled = value;
    if (value) {
      // Auto-start placement when enabling
      this.step = "from";
      this.fromPosition = null;
      this.fromPosition2 = null;
      this.toPosition = null;
    } else {
      // Reset state when disabled
      this.step = "idle";
      this.fromPosition = null;
      this.fromPosition2 = null;
      this.toPosition = null;
    }
    this.notifyListeners();
    console.log(`%c${value ? '🚂 Transport Editor ENABLED' : '🚫 Transport Editor DISABLED'}`,
      value ? 'color: lime; font-weight: bold' : 'color: orange; font-weight: bold');
    if (value) {
      console.log(`Type: ${this.transportType}, Bidirectional: ${this.bidirectional}, Action: ${this.stairsAction}`);
      console.log('Click to set FROM position. Shift+Click to set second corner for multi-tile bounds. Then click for TO position.');
    }
  },

  setTransportType(type: TransportType) {
    this.transportType = type;
    // Auto-disable bidirectional for vertical transport types
    // (stairs, ladders, etc. should NOT be bidirectional - they have separate up/down entries)
    const verticalTypes: TransportType[] = ['stairs', 'ladder', 'trapdoor', 'rope'];
    if (verticalTypes.includes(type)) {
      this.bidirectional = false;
      console.log(`%c🚂 Transport Type: ${type} (bidirectional auto-disabled for vertical transport)`, 'color: cyan');
    } else {
      console.log(`%c🚂 Transport Type: ${type}`, 'color: cyan');
    }
    this.notifyListeners();
  },

  setName(name: string) {
    this.name = name;
    this.notifyListeners();
  },

  setBidirectional(value: boolean) {
    // Prevent enabling bidirectional for vertical transport types
    const verticalTypes: TransportType[] = ['stairs', 'ladder', 'trapdoor', 'rope'];
    if (value && verticalTypes.includes(this.transportType)) {
      console.log(`%c⚠️ Bidirectional disabled: ${this.transportType} cannot be bidirectional (separate entries for each direction)`, 'color: orange');
      return; // Don't allow enabling bidirectional for these types
    }
    this.bidirectional = value;
    this.notifyListeners();
    console.log(`%c↔️ Bidirectional: ${value}`, 'color: cyan');
  },

  setStairsAction(action: StairsAction) {
    this.stairsAction = action;
    this.notifyListeners();
    console.log(`%c🪜 Stairs Action: ${action}`, 'color: cyan');
  },

  setFromPosition(pos: TransportEditorPosition) {
    this.fromPosition = pos;
    this.step = "from_corner"; // Wait for optional Shift+Click for second corner or regular click for TO
    this.notifyListeners();
    console.log(`%c📍 FROM position set: (${pos.x}, ${pos.y}) floor ${pos.floor}`, 'color: lime');
    console.log('Shift+Click to set second corner for multi-tile bounds, or click directly for TO position');
  },

  setFromPosition2(pos: TransportEditorPosition) {
    this.fromPosition2 = pos;
    this.step = "to"; // Now wait for TO position
    this.notifyListeners();
    console.log(`%c📍 FROM corner 2 set: (${pos.x}, ${pos.y}) - bounds: (${this.fromPosition?.x}, ${this.fromPosition?.y}) to (${pos.x}, ${pos.y})`, 'color: lime');
    console.log('Now click on the map to set the TO position');
  },

  // Skip setting second corner and go directly to TO placement
  skipFromCorner() {
    this.fromPosition2 = null;
    this.step = "to";
    this.notifyListeners();
    console.log('%c⏭️ Skipped multi-tile bounds, now set TO position', 'color: yellow');
  },

  setToPosition(pos: TransportEditorPosition) {
    this.toPosition = pos;
    this.step = "idle";
    this.notifyListeners();
    console.log(`%c📍 TO position set: (${pos.x}, ${pos.y}) floor ${pos.floor}`, 'color: lime');
  },

  startPlacement() {
    this.step = "from";
    this.fromPosition = null;
    this.fromPosition2 = null;
    this.toPosition = null;
    this.notifyListeners();
    console.log('%c🎯 Click on the map to set the FROM position', 'color: yellow');
  },

  cancelPlacement() {
    this.step = "idle";
    this.fromPosition = null;
    this.fromPosition2 = null;
    this.toPosition = null;
    this.notifyListeners();
    console.log('%c❌ Transport placement cancelled', 'color: orange');
  },

  toggle() {
    this.setEnabled(!this.enabled);
  },

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener());
  },

  // Auto-generate a name based on type and positions
  generateName(): string {
    if (this.name) return this.name;
    const from = this.fromPosition;
    const to = this.toPosition;
    if (!from || !to) return "";

    const typeName = this.transportType.charAt(0).toUpperCase() + this.transportType.slice(1).replace(/_/g, ' ');

    // Determine direction based on stairs action or floor change
    let direction = "";
    if (this.stairsAction !== "auto") {
      // Use explicit stairs action
      switch (this.stairsAction) {
        case "up": direction = "Up"; break;
        case "down": direction = "Down"; break;
        case "climb_to_top": direction = "Climb-to-top"; break;
        case "climb_to_bottom": direction = "Climb-to-bottom"; break;
      }
    } else {
      // Auto-determine from floor change
      direction = to.floor > from.floor ? "Up" :
                  to.floor < from.floor ? "Down" : "";
    }

    return `${typeName}${direction ? ' (' + direction + ')' : ''} at (${from.x}, ${from.y})`;
  },
};

// Export functions for transport editor
export function enableTransportEditor() {
  transportEditorState.setEnabled(true);
}

export function disableTransportEditor() {
  transportEditorState.setEnabled(false);
}

export function toggleTransportEditor() {
  transportEditorState.toggle();
}

// Export transport editor to window (after it's defined)
if (typeof window !== 'undefined') {
  (window as any).transportEditorState = transportEditorState;
  (window as any).enableTransportEditor = enableTransportEditor;
  (window as any).disableTransportEditor = disableTransportEditor;
  (window as any).toggleTransportEditor = toggleTransportEditor;
}
