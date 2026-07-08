import { useEffect, useRef } from "react";

export interface KeyState {
  [key: string]: boolean;
}

/** Simple, dependency-free keyboard tracker. Returns a mutable ref so useFrame
 *  loops can read current key state every frame without triggering re-renders. */
export function useKeyboard() {
  const keys = useRef<KeyState>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}
