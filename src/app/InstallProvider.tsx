import { useEffect, useRef, useState, type ReactNode } from "react";
import { InstallContext, detectInstallPlatform } from "../hooks/useInstall";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
export function InstallProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(standalone),
    [available, setAvailable] = useState(false),
    [installing, setInstalling] = useState(false),
    [error, setError] = useState("");
  const deferred = useRef<InstallEvent | null>(null);
  const prompting = useRef(false);
  const userAgent = navigator.userAgent;
  const platform = detectInstallPlatform(
    userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
  const inApp = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(userAgent);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const prompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setAvailable(true);
    };
    const done = () => {
      deferred.current = null;
      setAvailable(false);
      setInstalled(true);
    };
    const changed = () => setInstalled(standalone());
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", changed);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", changed);
    };
  }, []);
  const requestInstall = async () => {
    if (prompting.current || !deferred.current) return;
    const event = deferred.current;
    deferred.current = null;
    prompting.current = true;
    setAvailable(false);
    setInstalling(true);
    setError("");
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      setError("설치 창을 열지 못했어요. 아래 브라우저 메뉴를 이용해주세요.");
    } finally {
      prompting.current = false;
      setInstalling(false);
    }
  };
  return (
    <InstallContext.Provider
      value={{
        installed,
        canPrompt: available,
        installing,
        error,
        inApp,
        platform,
        requestInstall,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}
