import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { DataContext } from "../hooks/useData";
export function DataProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0),
    [pending, setPending] = useState(0),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [invalid, setInvalidCount] = useState(0);
  const invalidIds = useRef(new Set<string>());
  const queue = useRef(Promise.resolve());
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setPending((n) => n + 1);
    let success = false;
    const next = queue.current.then(async () => {
      try {
        await action();
        setRevision((n) => n + 1);
        setError("");
        setSaved(true);
        success = true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "저장에 실패했습니다. 다시 시도해주세요.",
        );
      } finally {
        setPending((n) => n - 1);
      }
    });
    queue.current = next;
    await next;
    return success;
  }, []);
  const setInvalid = useCallback((id: string, value: boolean) => {
    if (value) invalidIds.current.add(id);
    else invalidIds.current.delete(id);
    setInvalidCount(invalidIds.current.size);
  }, []);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (pending || invalid) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending, invalid]);
  return (
    <DataContext.Provider
      value={{
        revision,
        pending,
        error,
        saved,
        invalid,
        setInvalid,
        run,
        clearError: () => setError(""),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
