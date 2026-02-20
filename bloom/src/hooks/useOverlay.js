import { useEffect, useRef } from "react";

// Focus trap + Esc-to-close for modal overlays
// Keeps keyboard users and screen readers inside the overlay
export function useOverlay(isOpen, onClose) {
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;

    // Focus first focusable element inside overlay
    const timer = setTimeout(() => {
      if (!overlayRef.current) return;
      const focusable = overlayRef.current.querySelector(
        "button, [tabindex]"
      );
      if (focusable) focusable.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Tab trap
      if (e.key === "Tab" && overlayRef.current) {
        const focusables = overlayRef.current.querySelectorAll(
          "button, [tabindex]:not([tabindex='-1']), input, select, textarea, a[href]"
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return overlayRef;
}
