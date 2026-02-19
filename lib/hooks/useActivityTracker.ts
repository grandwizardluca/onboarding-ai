"use client";

import { useEffect, useRef } from "react";

const PULSE_INTERVAL = 30000; // 30 seconds

export function useActivityTracker() {
  const mouseRef = useRef(false);
  const keyboardRef = useRef(false);
  const tabFocusedRef = useRef(true);

  useEffect(() => {
    const onMouse = () => {
      mouseRef.current = true;
    };
    const onKey = () => {
      keyboardRef.current = true;
    };
    const onFocus = () => {
      tabFocusedRef.current = true;
    };
    const onBlur = () => {
      tabFocusedRef.current = false;
    };

    document.addEventListener("mousemove", onMouse);
    document.addEventListener("keydown", onKey);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    const interval = setInterval(() => {
      const mouse = mouseRef.current;
      const keyboard = keyboardRef.current;
      const tabFocused = tabFocusedRef.current;

      // Only send if there was any real activity
      if (mouse || keyboard) {
        fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mouse, keyboard, tabFocused }),
        }).catch(() => {});
      }

      // Reset flags for next window
      mouseRef.current = false;
      keyboardRef.current = false;
    }, PULSE_INTERVAL);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousemove", onMouse);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
