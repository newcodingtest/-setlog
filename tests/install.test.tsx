import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, it, expect, vi } from "vitest";
import { InstallProvider } from "../src/app/InstallProvider";
import { InstallPromotion } from "../src/features/install/InstallPromotion";
import { InstallPage } from "../src/features/install/InstallPage";
import { detectInstallPlatform } from "../src/hooks/useInstall";
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
function view() {
  return render(
    <MemoryRouter>
      <InstallProvider>
        <InstallPromotion />
        <InstallPage />
      </InstallProvider>
    </MemoryRouter>,
  );
}
it("iPhone과 iPad 데스크톱 UA 및 Android를 분류한다", () => {
  expect(detectInstallPlatform("iPhone", "iPhone", 5)).toBe("iphone");
  expect(detectInstallPlatform("Macintosh", "MacIntel", 5)).toBe("iphone");
  expect(detectInstallPlatform("Android", "Linux", 5)).toBe("android");
  expect(detectInstallPlatform("Windows", "Win32", 0)).toBe("desktop");
});
it("설치 이벤트가 없어도 홈 CTA와 수동 안내를 제공한다", async () => {
  view();
  expect(screen.getByRole("link", { name: "홈 화면 추가" })).toHaveAttribute(
    "href",
    "/install",
  );
  expect(
    screen.queryByRole("button", { name: "지금 설치" }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "iPhone · iPad" }));
  expect(
    screen.getByRole("heading", { name: "‘홈 화면에 추가’를 선택하세요" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Android" }));
  expect(
    screen.getByRole("heading", { name: "Chrome에서 SetLog를 여세요" }),
  ).toBeInTheDocument();
});
it("브라우저 설치 창을 한 번만 열고 거절해도 설치 완료로 표시하지 않는다", async () => {
  view();
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) },
  );
  fireEvent(window, event);
  await userEvent.click(screen.getByRole("button", { name: "지금 설치" }));
  await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  expect(event.defaultPrevented).toBe(true);
  expect(
    screen.getByRole("link", { name: "홈 화면 추가" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "지금 설치" }),
  ).not.toBeInTheDocument();
});
it("실제 설치 완료 이벤트 후 권유를 숨긴다", () => {
  view();
  fireEvent(window, new Event("appinstalled"));
  expect(
    screen.queryByRole("link", { name: "홈 화면 추가" }),
  ).not.toBeInTheDocument();
});
it("설치 요청 실패 시 수동 방법을 안내한다", async () => {
  view();
  fireEvent(
    window,
    Object.assign(new Event("beforeinstallprompt"), {
      prompt: vi.fn().mockRejectedValue(new Error("unsupported")),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    }),
  );
  await userEvent.click(screen.getByRole("button", { name: "지금 설치" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "아래 브라우저 메뉴",
  );
});
it("카카오톡에서는 외부 브라우저 안내와 복사 주소를 표시한다", () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone KAKAOTALK");
  view();
  expect(screen.getByText("카카오톡에서 열고 계신가요?")).toBeInTheDocument();
  expect(screen.getByLabelText("SetLog 주소")).toHaveValue(
    new URL("/", window.location.href).href,
  );
});
it("클립보드 복사가 불가능할 때 수동 복사 안내를 제공한다", async () => {
  view();
  await userEvent.click(screen.getByRole("button", { name: "주소 복사" }));
  expect(await screen.findByRole("status")).toHaveTextContent("선택해서 복사");
});
it("홈 화면 앱으로 실행하면 설치 권유를 숨긴다", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  view();
  expect(
    screen.queryByRole("link", { name: "홈 화면 추가" }),
  ).not.toBeInTheDocument();
});
