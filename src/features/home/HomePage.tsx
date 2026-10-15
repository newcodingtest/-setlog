import { InstallPromotion } from "../install/InstallPromotion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  CalendarDays,
  Flame,
  TrendingUp,
} from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { useData, workoutRepository } from "../../hooks/useData";
import { overallStats, sessionVolume } from "../statistics/calculations";
import { dateLabel, localDate } from "../../lib/date";
import { Empty, LoadError } from "../../components/common/Empty";
export function HomePage() {
  const navigate = useNavigate();
  const { run, pending } = useData();
  const { data, error } = useResource(async () => ({
    sessions: await workoutRepository.completedDetails(),
    active: await workoutRepository.active(),
  }));
  const stats = overallStats(data?.sessions ?? []);
  const start = async () => {
    let id = "";
    if (
      await run(async () => {
        id = await workoutRepository.start();
      })
    )
      navigate("/workout/" + id);
  };
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR DAILY PROGRESS</span>
          <h1>오늘도, 한 세트 더.</h1>
          <p>{dateLabel(localDate())} · 작은 기록이 만드는 큰 변화</p>
        </div>
        <span className="date-icon">
          <CalendarDays />
        </span>
      </div>
      <InstallPromotion />
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">EVERY SET COUNTS</span>
          <h2>
            모든 세트가
            <br />
            성장의 기록이 된다.
          </h2>
          <p>
            어제의 나를 넘어서는 오늘의 운동.
            <br />
            SetLog와 함께 기록하세요.
          </p>
          <button
            className="primary"
            disabled={!!pending}
            onClick={() => void start()}
          >
            <Play size={18} fill="currentColor" />
            {data?.active ? "운동 이어하기" : "운동 시작"}
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="barbell">
            <i />
            <i />
            <b />
            <i />
            <i />
          </div>
          <span>SET / LOG</span>
        </div>
      </section>
      {data?.active && (
        <Link className="active-banner" to={"/workout/" + data.active.id}>
          <span className="pulse" />
          <div>
            <strong>진행 중인 운동이 있어요</strong>
            <small>
              {dateLabel(data.active.workoutDate)} · 자동 저장된 기록
            </small>
          </div>
          <ArrowRight size={20} />
        </Link>
      )}
      <div className="summary-grid">
        <article className="card metric">
          <Flame size={20} />
          <span>이번 주 운동</span>
          <strong>
            {stats.week}
            <small>회</small>
          </strong>
          <p>한 세트씩 쌓이는 꾸준함</p>
        </article>
        <article className="card metric">
          <CalendarDays size={20} />
          <span>최근 30일 운동</span>
          <strong>
            {stats.last30}
            <small>회</small>
          </strong>
          <p>꾸준히 이어가는 내 루틴</p>
        </article>
        <article className="card metric">
          <TrendingUp size={20} />
          <span>최근 30일 볼륨</span>
          <strong>
            {stats.volume30.toLocaleString()}
            <small>kg</small>
          </strong>
          <p>완료 세트의 중량 × 횟수</p>
        </article>
      </div>
      <div className="section-title">
        <h2>최근 운동 기록</h2>
        <Link to="/history">
          전체 보기 <ArrowRight size={16} />
        </Link>
      </div>
      {error && <LoadError message={error} />}
      <div className="record-list">
        {data?.sessions.slice(0, 4).map((s) => (
          <Link className="card record" key={s.id} to={"/workout/" + s.id}>
            <div className="record-date">
              <strong>{Number(s.workoutDate.slice(8))}</strong>
              <span>{Number(s.workoutDate.slice(5, 7))}월</span>
            </div>
            <div className="record-body">
              <h3>
                {s.exercises
                  .map((e) => e.muscleGroup)
                  .filter((g, i, a) => a.indexOf(g) === i)
                  .join(" · ")}{" "}
                운동
              </h3>
              <p>{s.exercises.map((e) => e.name).join(", ")}</p>
              <small>
                {s.exercises.length}종목 ·{" "}
                {
                  s.exercises.flatMap((e) => e.sets).filter((s) => s.completed)
                    .length
                }
                세트 · {sessionVolume(s).toLocaleString()}kg
              </small>
            </div>
            <ArrowUpRight size={20} />
          </Link>
        ))}
        {data && !data.sessions.length && (
          <Empty title="아직 기록된 운동이 없어요" />
        )}
      </div>
      <div className="tip">
        <span>SETLOG TIP</span>
        <p>
          무게보다 중요한 건 꾸준함이에요. 지난 기록을 참고해 오늘의 목표를
          정해보세요.
        </p>
      </div>
    </>
  );
}
