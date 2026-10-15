import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Routes, Route, Link } from "react-router-dom";
import {
  Dumbbell,
  House,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  Library,
  Check,
  CloudOff,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useData, workoutRepository } from "../hooks/useData";
import { HomePage } from "../features/home/HomePage";
import { WorkoutPage } from "../features/workout/WorkoutPage";
import { HistoryPage } from "../features/history/HistoryPage";
const StatisticsPage = lazy(() =>
  import("../features/statistics/StatisticsPage").then((module) => ({
    default: module.StatisticsPage,
  })),
);
import { SettingsPage } from "../features/settings/SettingsPage";
import { ExercisesPage } from "../features/exercise/ExercisesPage";
import { useInstall } from "../hooks/useInstall";
import { InstallPage } from "../features/install/InstallPage";
const tabs = [
  { to: "/", label: "홈", icon: House },
  { to: "/history", label: "히스토리", icon: CalendarDays },
  { to: "/statistics", label: "성장 통계", icon: ChartNoAxesCombined },
  { to: "/exercises", label: "운동 종목", icon: Library },
  { to: "/settings", label: "설정", icon: Settings },
];
export function App() {
  const { pending, error, saved, invalid, run, clearError } = useData();
  const [ready, setReady] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine);
  const { installed } = useInstall();
  const {
    needRefresh: [refresh, setRefresh],
    offlineReady: [cached, setCached],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    workoutRepository
      .initialize()
      .then(() => setReady(true))
      .catch(() => {
        void run(() => workoutRepository.initialize()).then((ok) =>
          setReady(ok),
        );
      });
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    }; // initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <Link className="logo" to="/">
          <span className="logo-mark">
            <Dumbbell size={24} />
          </span>
          SET<span>LOG</span>
        </Link>
        <p className="sidebar-caption">YOUR PERSONAL WORKOUT LOG</p>
        <nav aria-label="주 메뉴">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={(e) => {
                if (invalid || pending) e.preventDefault();
              }}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="small-dot" />
          로컬에 안전하게 저장<p>한 세트씩, 더 강해지는 나.</p>
        </div>
      </aside>
      <div
        className="app-shell"
        onClickCapture={(e) => {
          if (
            (invalid || pending) &&
            (e.target as HTMLElement).closest("a[href]")
          )
            e.preventDefault();
        }}
      >
        <header className="app-header">
          <Link className="mobile-logo" to="/">
            SET<span>LOG</span>
          </Link>
          <span className="header-label">나의 트레이닝 노트</span>
          <div className="header-actions">
            {offline && (
              <span className="offline">
                <CloudOff size={15} />
                오프라인
              </span>
            )}
            <span
              className={"save-state " + (error ? "error" : "")}
              role="status"
            >
              {pending ? (
                "저장 중…"
              ) : invalid ? (
                "입력 확인 필요"
              ) : error ? (
                "저장 실패"
              ) : saved ? (
                <>
                  <Check size={14} />
                  저장 완료
                </>
              ) : (
                "기기에 저장"
              )}
            </span>
            {!installed && (
              <Link className="install-button" to="/install">
                홈 화면 추가
              </Link>
            )}
          </div>
        </header>
        {error && (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <button onClick={clearError}>닫기</button>
            {!ready && (
              <button
                onClick={() =>
                  void run(() => workoutRepository.initialize()).then((ok) =>
                    setReady(ok),
                  )
                }
              >
                다시 시도
              </button>
            )}
          </div>
        )}
        {refresh && (
          <div className="update-banner" role="status">
            <span>새 버전이 준비됐어요. 저장을 마친 후 업데이트하세요.</span>
            <button
              disabled={!!pending || !!invalid}
              onClick={() => void updateServiceWorker(true)}
            >
              업데이트
            </button>
            <button onClick={() => setRefresh(false)}>나중에</button>
          </div>
        )}
        {cached && (
          <div className="update-banner" role="status">
            오프라인 사용 준비가 완료되었습니다.
            <button onClick={() => setCached(false)}>닫기</button>
          </div>
        )}
        <main id="main">
          {ready ? (
            <Suspense fallback={<p>화면을 불러오는 중…</p>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/workout/:id" element={<WorkoutPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route
                  path="*"
                  element={
                    <p>
                      페이지를 찾을 수 없습니다. <Link to="/">홈으로</Link>
                    </p>
                  }
                />
              </Routes>
            </Suspense>
          ) : (
            <p>운동일지를 준비하는 중…</p>
          )}
        </main>
        <footer className="desktop-footer">
          SETLOG <span>EVERY SET COUNTS.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="모바일 메뉴">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={(e) => {
              if (invalid || pending) e.preventDefault();
            }}
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
