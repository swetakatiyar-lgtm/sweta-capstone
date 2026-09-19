import { useEffect } from "react";

/**
 * Closes a dialog/modal on Escape — shared by every full-screen modal in
 * the app instead of each one re-implementing its own keydown listener.
 * Pass `enabled: false` to disable it during a phase where the modal
 * shouldn't be dismissible (e.g. ApplyFlowModal mid-"applying").
 */
export default function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, enabled]);
}
