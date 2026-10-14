import { useEffect, useState } from "react";
import { useData } from "./useData";
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { revision } = useData();
  const [data, setData] = useState<T>(),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    load()
      .then((value) => {
        if (alive) {
          setData(value);
          setError("");
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            e instanceof Error ? e.message : "데이터를 불러올 수 없습니다.",
          );
      });
    return () => {
      alive = false;
    }; // loader dependencies are supplied by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, ...deps]);
  return { data, error };
}
