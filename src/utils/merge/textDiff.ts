// src/utils/merge/textDiff.ts
// Text diffing utility using a simplified Myers diff algorithm

import type { TextSegment } from "../../types/merge";

/**
 * Compute character-level diff between two strings
 * Returns segments marked as same, added, or removed
 */
export function computeTextDiff(oldText: string, newText: string): TextSegment[] {
  // Handle edge cases
  if (oldText === newText) {
    return oldText ? [{ text: oldText, type: "same" }] : [];
  }
  if (!oldText) {
    return newText ? [{ text: newText, type: "added" }] : [];
  }
  if (!newText) {
    return [{ text: oldText, type: "removed" }];
  }

  // Use word-level diff for better readability
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);

  const lcs = longestCommonSubsequence(oldWords, newWords);
  const segments: TextSegment[] = [];

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldWords.length || newIdx < newWords.length) {
    // Check if current positions match LCS
    const lcsWord = lcs[lcsIdx];

    if (lcsWord !== undefined && oldWords[oldIdx] === lcsWord && newWords[newIdx] === lcsWord) {
      // Both match LCS - same
      addSegment(segments, oldWords[oldIdx], "same");
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else {
      // Collect removed words (in old but not matching LCS position)
      while (oldIdx < oldWords.length && (lcsWord === undefined || oldWords[oldIdx] !== lcsWord)) {
        addSegment(segments, oldWords[oldIdx], "removed");
        oldIdx++;
      }

      // Collect added words (in new but not matching LCS position)
      while (newIdx < newWords.length && (lcsWord === undefined || newWords[newIdx] !== lcsWord)) {
        addSegment(segments, newWords[newIdx], "added");
        newIdx++;
      }
    }
  }

  return mergeAdjacentSegments(segments);
}

/**
 * Tokenize text into words while preserving whitespace
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = "";

  for (const char of text) {
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Find longest common subsequence of two arrays
 */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // DP table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Add segment to array, merging with previous if same type
 */
function addSegment(segments: TextSegment[], text: string, type: TextSegment["type"]): void {
  const last = segments[segments.length - 1];
  if (last && last.type === type) {
    last.text += text;
  } else {
    segments.push({ text, type });
  }
}

/**
 * Merge adjacent segments of the same type
 */
function mergeAdjacentSegments(segments: TextSegment[]): TextSegment[] {
  if (segments.length === 0) return segments;

  const merged: TextSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const last = merged[merged.length - 1];

    if (last.type === current.type) {
      last.text += current.text;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Check if two texts are semantically similar (for step alignment)
 * Returns a score from 0 to 1
 */
export function computeTextSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1;
  if (!text1 || !text2) return 0;

  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Jaccard similarity
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
