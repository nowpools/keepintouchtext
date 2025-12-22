import { useEffect } from "react";

/**
 * Keeps CSS variables in sync with the iOS visual viewport so dialogs can size/scroll correctly
 * when the on-screen keyboard is shown.
 *
 * Sets:
 * - --vvh: visual viewport height in px
 * - --vv-offset-top: visual viewport offsetTop in px
 * - --keyboard-inset: estimated keyboard height in px
 */
export function useVisualViewportVars(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;

    const update = () => {
      const vvh = vv.height;
      const vvOffsetTop = vv.offsetTop;
      const keyboardInset = Math.max(
        0,
        window.innerHeight - (vv.height + vv.offsetTop),
      );

      root.style.setProperty("--vvh", `${Math.round(vvh)}px`);
      root.style.setProperty("--vv-offset-top", `${Math.round(vvOffsetTop)}px`);
      root.style.setProperty("--keyboard-inset", `${Math.round(keyboardInset)}px`);
    };

    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);
}
