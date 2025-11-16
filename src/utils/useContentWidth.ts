import { useEffect, useRef, useState } from "react";

interface UseContentWidthOptions {
  minWidth?: number;
  maxWidth?: number;
  padding?: number;
}

export function useContentWidth(options: UseContentWidthOptions = {}) {
  const {
    minWidth = 320,
    maxWidth = 1200,
    padding = 40, // Account for scrollbars and padding
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState<number>(minWidth);

  useEffect(() => {
    if (!containerRef.current) return;

    const measureContent = () => {
      if (!containerRef.current) return;

      // Create a temporary div to measure content
      const measurer = document.createElement("div");
      measurer.style.position = "absolute";
      measurer.style.visibility = "hidden";
      measurer.style.whiteSpace = "nowrap";
      measurer.style.font = window.getComputedStyle(containerRef.current).font;

      document.body.appendChild(measurer);

      let maxWidth = minWidth;

      // Measure all text content recursively
      const measureElement = (element: Element) => {
        // Get all text nodes and input values
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              measurer.textContent = text;
              maxWidth = Math.max(maxWidth, measurer.offsetWidth);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Measure input/textarea values
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
              const value = (element as HTMLInputElement).value;
              if (value) {
                measurer.textContent = value;
                maxWidth = Math.max(maxWidth, measurer.offsetWidth);
              }
            }

            // Measure select options
            if (element.tagName === "SELECT") {
              const select = element as HTMLSelectElement;
              Array.from(select.options).forEach((option) => {
                measurer.textContent = option.text;
                maxWidth = Math.max(maxWidth, measurer.offsetWidth);
              });
            }
          }
        }
      };

      measureElement(containerRef.current);
      document.body.removeChild(measurer);

      // Add padding and clamp to min/max
      const finalWidth = Math.min(
        Math.max(maxWidth + padding, options.minWidth ?? minWidth),
        options.maxWidth ?? maxWidth
      );

      setContentWidth(finalWidth);
    };

    // Initial measurement
    measureContent();

    // Use MutationObserver to detect content changes
    const observer = new MutationObserver(measureContent);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value"],
    });

    // Also measure on window resize
    window.addEventListener("resize", measureContent);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureContent);
    };
  }, [minWidth, maxWidth, padding, options.minWidth, options.maxWidth]);

  return { containerRef, contentWidth };
}
