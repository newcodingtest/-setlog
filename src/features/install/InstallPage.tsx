import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Copy,
  Check,
  WifiOff,
  MousePointer2,
} from "lucide-react";
import { useInstall, type InstallPlatform } from "../../hooks/useInstall";
const guides: Record<
  InstallPlatform,
  { title: string; steps: { title: string; body: string }[] }
> = {
  iphone: {
    title: "iPhone · iPad",
    steps: [
      {
        title: "Safari에서 SetLog를 여세요",
        body: "카카오톡에서 열었다면 메뉴에서 외부 브라우저로 열기를 선택하거나, 아래 주소를 복사해 Safari 주소창에 붙여넣으세요.",
      },
      {
        title: "공유 버튼을 누르세요",
        body: "Safari 메뉴에서 공유 버튼(네모 위로 화살표)을 찾아 누르세요. iOS 버전에 따라 위치가 다를 수 있어요.",
      },
      {
        title: "‘홈 화면에 추가’를 선택하세요",
        body: "공유 메뉴를 아래로 내려 ‘홈 화면에 추가’를 찾으세요. ‘웹 앱으로 열기’ 옵션이 보이면 켜고 ‘추가’를 누르세요.",
      },
      {
        title: "홈 화면의 SetLog 아이콘으로 시작하세요",
        body: "이제 주소를 입력할 필요 없이 SetLog 아이콘을 눌러 바로 운동을 기록할 수 있어요.",
      },
    ],
  },
  android: {
    title: "Android",
    steps: [
      {
        title: "Chrome에서 SetLog를 여세요",
        body: "카카오톡 안의 브라우저에서는 설치 메뉴가 보이지 않을 수 있어요. 외부 브라우저로 열거나 주소를 복사해 Chrome에서 여세요.",
      },
      {
        title: "오른쪽 위 메뉴 ⋮를 누르세요",
        body: "Chrome의 더보기 메뉴를 열어주세요. 설치 버튼이 보이면 아래 ‘지금 설치’로도 시작할 수 있어요.",
      },
      {
        title: "‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하세요",
        body: "브라우저가 보여주는 안내에 따라 ‘설치’ 또는 ‘추가’를 누르세요. 기기와 브라우저에 따라 메뉴 이름이 조금 달라요.",
      },
      {
        title: "홈 화면의 SetLog 아이콘으로 시작하세요",
        body: "아이콘을 누르면 운동일지가 바로 열립니다. 설치 메뉴가 없다면 Chrome 메뉴에서 다시 확인해주세요.",
      },
    ],
  },
  desktop: {
    title: "PC · Mac",
    steps: [
      {
        title: "Chrome 또는 Edge에서 SetLog를 여세요",
        body: "브라우저 주소창에 SetLog 주소를 입력해주세요. 모바일에서도 같은 주소로 접속할 수 있어요.",
      },
      {
        title: "주소창의 설치 아이콘이나 브라우저 메뉴를 여세요",
        body: "‘SetLog 설치’, ‘앱 설치’ 등 브라우저가 제공하는 설치 항목을 선택하세요. Safari에서는 ‘파일 → Dock에 추가’를 사용할 수 있어요.",
      },
      {
        title: "설치 안내를 확인하고 앱을 실행하세요",
        body: "설치한 앱을 작업 표시줄이나 Dock에 고정하면 다음 운동을 더 빠르게 시작할 수 있어요.",
      },
    ],
  },
};
export function InstallPage() {
  const state = useInstall();
  const [selected, setSelected] = useState<InstallPlatform>(state.platform),
    [copied, setCopied] = useState("");
  const address = new URL("/", window.location.href).href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied("주소를 복사했어요. Safari 또는 Chrome에 붙여넣으세요.");
    } catch {
      setCopied("아래 주소를 길게 누르거나 선택해서 복사해주세요.");
    }
  };
  return (
    <>
      <Link className="back" to="/">
        <ArrowLeft size={17} />
        홈으로
      </Link>
      <div className="page-title">
        <div>
          <span className="eyebrow">ONE TAP. EVERY SET.</span>
          <h1>
            홈 화면에 추가하고,
            <br />
            운동에만 집중하세요.
          </h1>
          <p>한 번만 추가하면, 다음 운동부터는 아이콘 한 번이면 돼요.</p>
        </div>
      </div>
      <section className="card install-benefits">
        <div className="mini-app" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" />
          <span>SetLog</span>
        </div>
        <div>
          <h2>운동일지를 내 폰의 앱처럼</h2>
          <p>
            <MousePointer2 size={16} />
            주소 검색 없이 바로 실행
          </p>
          <p>
            <WifiOff size={16} />
            오프라인 준비 후 인터넷 없이 기록
          </p>
          <p>
            <Check size={16} />
            별도 앱스토어 다운로드 없이 무료
          </p>
        </div>
      </section>
      {state.installed ? (
        <div className="install-status success" role="status">
          <Check size={19} />홈 화면 앱을 사용할 준비가 됐어요. 다음에도 SetLog
          아이콘으로 열어주세요.
        </div>
      ) : (
        <div className="install-action">
          {state.canPrompt && !state.inApp && (
            <button
              className="primary"
              disabled={state.installing}
              onClick={() => void state.requestInstall()}
            >
              <Download size={18} />
              {state.installing ? "설치 창을 여는 중…" : "지금 설치"}
            </button>
          )}
          <p>
            {state.inApp
              ? "카카오톡·앱 안에서는 먼저 외부 브라우저로 열어주세요."
              : "아래에서 사용하는 기기를 선택하고 순서대로 따라 해보세요."}
          </p>
        </div>
      )}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.inApp && (
        <aside className="in-app-notice">
          <strong>카카오톡에서 열고 계신가요?</strong>
          <p>
            메뉴(⋯ 또는 ⋮)에서 ‘다른 브라우저로 열기’를 선택하세요. 메뉴가
            없다면 주소를 복사해 iPhone은 Safari, Android는 Chrome에서 여세요.
          </p>
        </aside>
      )}
      <div
        className="install-device-picker"
        role="group"
        aria-label="설치 안내 기기 선택"
      >
        {(["iphone", "android", "desktop"] as const).map((platform) => (
          <button
            key={platform}
            aria-pressed={selected === platform}
            onClick={() => setSelected(platform)}
          >
            {guides[platform].title}
          </button>
        ))}
      </div>
      <section
        className="card install-guide"
        aria-labelledby="install-guide-title"
      >
        <h2 id="install-guide-title">
          {guides[selected].title}에서 홈 화면 추가
        </h2>
        <ol>
          {guides[selected].steps.map((step, index) => (
            <li key={step.title}>
              <span className="install-step-number">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              {selected === "iphone" && index === 1 ? (
                <Share size={22} aria-hidden="true" />
              ) : index === 2 && selected !== "desktop" ? (
                <PlusSquare size={22} aria-hidden="true" />
              ) : selected === "android" && index === 1 ? (
                <MoreVertical size={22} aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </section>
      <section className="card install-address">
        <div>
          <Smartphone size={20} />
          <h2>외부 브라우저에서 열 주소</h2>
        </div>
        <input
          aria-label="SetLog 주소"
          readOnly
          value={address}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button className="secondary" onClick={() => void copy()}>
          <Copy size={17} />
          주소 복사
        </button>
        {copied && <p role="status">{copied}</p>}
      </section>
      <p className="install-footnote">
        처음에는 인터넷에 연결한 상태에서 ‘오프라인 사용 준비가 완료되었습니다’
        알림을 확인해주세요. 홈 화면 추가는 데이터 백업을 대신하지 않아요.{" "}
        <Link to="/settings">설정에서 정기적으로 JSON 백업</Link>도 해주세요.
      </p>
    </>
  );
}
