// src/feature/WorkspaceLayouts.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface WorkspaceLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  center: React.ReactNode;
  controlBar?: React.ReactNode;
  initialLeftWidth?: number;
  initialRightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  maxLeftWidth?: number;
  maxRightWidth?: number;
  storageKey?: string;
}

interface DragState {
  active: boolean;
  startX: number;
  startLeftWidth: number;
  startRightWidth: number;
  side: "left" | "right" | null;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  left,
  right,
  center,
  controlBar,
  initialLeftWidth = 380,
  initialRightWidth = 380,
  minLeftWidth = 280,
  minRightWidth = 280,
  maxLeftWidth = 600, // Reduced from 800
  maxRightWidth = 600, // Reduced from 800
  storageKey = "workspace_layout_v1",
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(initialLeftWidth);
  const [rightWidth, setRightWidth] = useState<number>(initialRightWidth);
  const [enableTransition, setEnableTransition] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const drag = useRef<DragState>({
    active: false,
    startX: 0,
    startLeftWidth: initialLeftWidth,
    startRightWidth: initialRightWidth,
    side: null,
  });

  const controlBarHeight = controlBar ? 64 : 0;

  // Track viewport width
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate dynamic max widths based on viewport
  const effectiveMaxLeft = useMemo(() => {
    return Math.min(maxLeftWidth, Math.floor(viewportWidth * 0.35));
  }, [maxLeftWidth, viewportWidth]);

  const effectiveMaxRight = useMemo(() => {
    return Math.min(maxRightWidth, Math.floor(viewportWidth * 0.35));
  }, [maxRightWidth, viewportWidth]);

  // Ensure center panel has minimum space
  const minCenterWidth = 600;
  const effectiveLeftWidth = useMemo(() => {
    const available = viewportWidth - rightWidth - minCenterWidth - 12;
    return Math.min(leftWidth, Math.max(minLeftWidth, available));
  }, [leftWidth, rightWidth, viewportWidth, minLeftWidth, minCenterWidth]);

  const effectiveRightWidth = useMemo(() => {
    const available = viewportWidth - leftWidth - minCenterWidth - 12;
    return Math.min(rightWidth, Math.max(minRightWidth, available));
  }, [rightWidth, leftWidth, viewportWidth, minRightWidth, minCenterWidth]);

  // Load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        leftWidth: number;
        rightWidth: number;
      };
      if (typeof parsed.leftWidth === "number") setLeftWidth(parsed.leftWidth);
      if (typeof parsed.rightWidth === "number")
        setRightWidth(parsed.rightWidth);
    } catch {}
  }, [storageKey]);

  // Save to storage
  useEffect(() => {
    const data = JSON.stringify({ leftWidth, rightWidth });
    localStorage.setItem(storageKey, data);
  }, [leftWidth, rightWidth, storageKey]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drag.current.active || !drag.current.side) return;
      const dx = e.clientX - drag.current.startX;
      if (drag.current.side === "left") {
        const next = Math.min(
          Math.max(drag.current.startLeftWidth + dx, minLeftWidth),
          effectiveMaxLeft
        );
        setLeftWidth(next);
      } else {
        const next = Math.min(
          Math.max(drag.current.startRightWidth - dx, minRightWidth),
          effectiveMaxRight
        );
        setRightWidth(next);
      }
    },
    [effectiveMaxLeft, effectiveMaxRight, minLeftWidth, minRightWidth]
  );

  const endDrag = useCallback(() => {
    drag.current.active = false;
    drag.current.side = null;
    document.body.style.cursor = "";
    setEnableTransition(true);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", endDrag);
  }, [onMouseMove]);

  const startDragLeft = useCallback(
    (e: React.MouseEvent) => {
      setEnableTransition(false);
      drag.current.active = true;
      drag.current.startX = e.clientX;
      drag.current.startLeftWidth = leftWidth;
      drag.current.side = "left";
      document.body.style.cursor = "col-resize";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", endDrag);
    },
    [leftWidth, endDrag, onMouseMove]
  );

  const startDragRight = useCallback(
    (e: React.MouseEvent) => {
      setEnableTransition(false);
      drag.current.active = true;
      drag.current.startX = e.clientX;
      drag.current.startRightWidth = rightWidth;
      drag.current.side = "right";
      document.body.style.cursor = "col-resize";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", endDrag);
    },
    [rightWidth, endDrag, onMouseMove]
  );

  const gridTemplate = useMemo(
    () => `${effectiveLeftWidth}px 6px 1fr 6px ${effectiveRightWidth}px`,
    [effectiveLeftWidth, effectiveRightWidth]
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0a0f1a",
      }}
    >
      {/* Main workspace */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: gridTemplate,
          gridTemplateRows: "1fr",
          transition: enableTransition
            ? "grid-template-columns 0.25s ease-out"
            : "none",
          overflow: "hidden",
        }}
      >
        {/* Left Panel - Now with scroll */}
        <div
          style={{
            position: "relative",
            overflow: "auto",
            borderRight: "1px solid #1f2937",
            background: "#0b1220",
          }}
        >
          <div style={{ minHeight: "100%" }}>{left}</div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startDragLeft}
          style={{
            cursor: "col-resize",
            background: "#111827",
            position: "relative",
          }}
          title="Drag to resize"
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 2,
              height: 40,
              background: "#374151",
              borderRadius: 1,
            }}
          />
        </div>

        {/* Center Map */}
        <div style={{ position: "relative", overflow: "hidden" }}>{center}</div>

        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startDragRight}
          style={{
            cursor: "col-resize",
            background: "#111827",
            position: "relative",
          }}
          title="Drag to resize"
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 2,
              height: 40,
              background: "#374151",
              borderRadius: 1,
            }}
          />
        </div>

        {/* Right Panel - Now with scroll */}
        <div
          style={{
            position: "relative",
            overflow: "auto",
            borderLeft: "1px solid #1f2937",
            background: "#0b1220",
          }}
        >
          <div style={{ minHeight: "100%" }}>{right}</div>
        </div>
      </div>

      {/* Fixed Control Bar - Always visible */}
      {controlBar && (
        <div
          style={{
            height: controlBarHeight,
            borderTop: "1px solid #374151",
            background: "rgba(17, 24, 39, 0.98)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            position: "relative",
          }}
        >
          {controlBar}
        </div>
      )}
    </div>
  );
};

export default WorkspaceLayout;
