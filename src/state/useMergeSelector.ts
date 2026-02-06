// src/state/useMergeSelector.ts
// React hook for subscribing to MergeStore (same pattern as useEditorSelector)

import { useSyncExternalStore, useCallback, useRef } from "react";
import { MergeStore } from "./mergeStore";
import type { MergeState } from "../types/merge";

// Shallow equality check for selector results
const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
};

/**
 * Subscribe to MergeStore with a selector
 * Re-renders only when selected value changes (shallow comparison)
 */
export function useMergeSelector<T>(selector: (s: MergeState) => T): T {
  // Store the selector in a ref to avoid re-subscriptions
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Cache the last snapshot to avoid creating new objects on every getSnapshot call
  const cachedRef = useRef<{ state: MergeState; value: T } | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    // Simple listener that notifies React of any state change
    const listener = () => {
      onStoreChange();
    };

    // Add raw listener to MergeStore
    const unsubscribe = MergeStore.subscribe(
      (s) => s, // Select entire state
      listener
    );

    return unsubscribe;
  }, []);

  const getSnapshot = useCallback((): T => {
    const currentState = MergeStore.getState();

    // If state hasn't changed, return cached value
    if (cachedRef.current && cachedRef.current.state === currentState) {
      return cachedRef.current.value;
    }

    // Compute new selected value
    const newValue = selectorRef.current(currentState);

    // If we have a cached value and it's shallowly equal, return the cached one
    // This prevents new object references from causing re-renders
    if (cachedRef.current && shallowEqual(cachedRef.current.value, newValue)) {
      cachedRef.current.state = currentState;
      return cachedRef.current.value;
    }

    // Update cache with new value
    cachedRef.current = { state: currentState, value: newValue };
    return newValue;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Get the entire merge state (use sparingly - prefer selectors)
 */
export function useMergeState(): MergeState {
  return useMergeSelector((s) => s);
}

/**
 * Check if merge modal is open
 */
export function useMergeIsOpen(): boolean {
  return useMergeSelector((s) => s.isOpen);
}

/**
 * Get current focus state
 */
export function useMergeFocus() {
  return useMergeSelector((s) => s.focus);
}

/**
 * Get step diffs
 */
export function useMergeStepDiffs() {
  return useMergeSelector((s) => s.stepDiffs);
}

/**
 * Get a specific step diff by index
 */
export function useMergeStepDiff(index: number) {
  return useMergeSelector((s) => s.stepDiffs[index]);
}

/**
 * Get undo/redo availability
 */
export function useMergeUndoRedo() {
  return useMergeSelector((s) => ({
    canUndo: s.undoStack.length > 0,
    canRedo: s.redoStack.length > 0,
    undoCount: s.undoStack.length,
    redoCount: s.redoStack.length,
  }));
}
