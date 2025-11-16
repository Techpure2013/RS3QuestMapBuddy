import { useEffect, useRef, useState } from "react";
import type { EditorState } from "./model";
import { EditorStore } from "./editorStore";

export function useEditorSelector<T>(
  selector: (s: EditorState, d: typeof EditorStore.derived) => T
): T {
  const [value, setValue] = useState<T>(() =>
    selector(EditorStore.getState(), EditorStore.derived)
  );
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useEffect(() => {
    const unsubscribe = EditorStore.subscribe(selectorRef.current, setValue);
    return unsubscribe;
  }, []);

  return value;
}
