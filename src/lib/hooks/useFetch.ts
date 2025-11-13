import { useState, useEffect } from "react";

export function useFetch<T>(path: string): {
  loading: boolean;
  data: T | null;
} {
  const [data, setData] = useState<T | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      const user = await fetch(path, { signal: controller.signal });

      try {
        if (user.ok) {
          setData(await user.json());
        } else {
          console.error(await user.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })().catch((e) => null);

    return () => {
      controller.abort("cancelled");
    };
  }, []);

  return { loading, data };
}
