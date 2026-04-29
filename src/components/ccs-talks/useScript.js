import { useEffect, useState } from "react";

export function useScript(src) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector(`script[src="${src}"]`)) {
      setLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, [src]);

  return loaded;
}

