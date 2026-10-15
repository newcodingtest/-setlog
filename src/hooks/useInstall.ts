import { createContext, useContext } from "react";
export type InstallPlatform = "iphone" | "android" | "desktop";
export interface InstallState {
  installed: boolean;
  canPrompt: boolean;
  installing: boolean;
  error: string;
  inApp: boolean;
  platform: InstallPlatform;
  requestInstall: () => Promise<void>;
}
export const InstallContext = createContext<InstallState | null>(null);
export function useInstall() {
  const state = useContext(InstallContext);
  if (!state) throw new Error("InstallProvider required");
  return state;
}
export function detectInstallPlatform(
  userAgent: string,
  platform: string,
  touchPoints: number,
): InstallPlatform {
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && touchPoints > 1)
  )
    return "iphone";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}
