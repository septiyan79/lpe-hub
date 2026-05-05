import { useLayoutEffect, useRef } from "react";

export function useAutoResizeTextarea(value, isVisible = true) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!ref.current || !isVisible) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value, isVisible]);

  return ref;
}
