import { useEffect, useState } from "react";

/**
 * Re-run `selector` whenever the localStorage-backed store emits a change.
 * Keeps components in sync without a heavier state library.
 */
export function useStore<T>(selector: () => T, deps: unknown[] = []): T {
  const [value, setValue] = useState<T>(selector);

  useEffect(() => {
    const update = () => setValue(selector());
    update();
    window.addEventListener("bx:change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("bx:change", update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
