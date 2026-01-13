import { useLayoutEffect, useRef } from "react";

/**
 * Hook untuk auto-resize textarea
 * @param {string} value - nilai dari textarea
 * @param {boolean} isVisible - apakah textarea sedang dirender / terlihat
 * @returns ref untuk textarea
 */
export function useAutoResizeTextarea(value, isVisible = true) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!ref.current || !isVisible) return;

    // Reset height dulu supaya scrollHeight akurat
    ref.current.style.height = "auto";

    // Set height sesuai scrollHeight
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value, isVisible]);

  return ref;
}
