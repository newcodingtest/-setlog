import { Link } from "react-router-dom";
import { ArrowUpRight, Smartphone, Check } from "lucide-react";
import { useInstall } from "../../hooks/useInstall";
export function InstallPromotion() {
  const { installed } = useInstall();
  if (installed) return null;
  return (
    <section
      className="install-promotion"
      aria-labelledby="install-promotion-title"
    >
      <span className="install-promotion-icon" aria-hidden="true">
        <Smartphone size={28} />
      </span>
      <div className="install-promotion-copy">
        <span className="eyebrow">헬스장에서는 앱처럼, 더 빠르게</span>
        <h2 id="install-promotion-title">운동 전, 홈 화면에 꼭 추가하세요</h2>
        <p>
          주소 찾을 필요 없이 아이콘 한 번으로.
          <br className="mobile-break" /> 운동할 때마다 바로 꺼내 기록하세요.
        </p>
        <div className="install-perks">
          <span>
            <Check size={13} />
            빠른 실행
          </span>
          <span>
            <Check size={13} />
            오프라인 기록
          </span>
          <span>
            <Check size={13} />
            무료
          </span>
        </div>
      </div>
      <Link className="primary" to="/install">
        홈 화면 추가
        <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
