import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { workoutRepository } from "../../hooks/useData";
import { localDate, parseDate, dateLabel } from "../../lib/date";
import { sessionVolume } from "../statistics/calculations";
import { Empty, LoadError } from "../../components/common/Empty";
export function HistoryPage() {
  const [month, setMonth] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1, 12);
    }),
    [selected, setSelected] = useState(localDate());
  const { data, error } = useResource(() =>
    workoutRepository.completedDetails(),
  );
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  const dates = new Set(data?.map((s) => s.workoutDate));
  const selectedSessions =
    data?.filter((s) => s.workoutDate === selected) ?? [];
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">WORKOUT HISTORY</span>
          <h1>쌓여가는 나의 기록</h1>
          <p>달력에서 운동한 날을 확인하세요.</p>
        </div>
      </div>
      {error && <LoadError message={error} />}
      <div className="history-layout">
        <section className="card calendar">
          <div className="calendar-title">
            <button
              className="icon"
              aria-label="이전 달"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1, 12),
                )
              }
            >
              <ChevronLeft />
            </button>
            <h2>
              {month.getFullYear()}년 {month.getMonth() + 1}월
            </h2>
            <button
              className="icon"
              aria-label="다음 달"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
                )
              }
            >
              <ChevronRight />
            </button>
          </div>
          <div className="calendar-grid">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"blank" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = localDate(
                new Date(month.getFullYear(), month.getMonth(), i + 1, 12),
              );
              return (
                <button
                  aria-label={date + (dates.has(date) ? " 운동 완료" : "")}
                  aria-pressed={selected === date}
                  className={
                    (selected === date ? "selected " : "") +
                    (date === localDate() ? "today " : "")
                  }
                  key={date}
                  onClick={() => setSelected(date)}
                >
                  {i + 1}
                  <span className={dates.has(date) ? "calendar-dot" : ""} />
                </button>
              );
            })}
          </div>
          <p className="calendar-legend">
            <i /> 운동 완료{" "}
            <button
              className="text-button"
              onClick={() => {
                setSelected(localDate());
                const d = parseDate(localDate());
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
              }}
            >
              오늘로 이동
            </button>
          </p>
        </section>
        <section>
          <div className="section-title">
            <h2>{dateLabel(selected)}</h2>
            <span className="muted">{selectedSessions.length}회</span>
          </div>
          {selectedSessions.map((s) => (
            <Link
              className="card history-record"
              key={s.id}
              to={"/workout/" + s.id}
            >
              <div className="section-title">
                <h3>
                  {s.exercises
                    .map((e) => e.muscleGroup)
                    .filter((g, i, a) => a.indexOf(g) === i)
                    .join(" · ")}{" "}
                  운동
                </h3>
                <ArrowUpRight size={19} />
              </div>
              {s.exercises.map((e) => (
                <div className="history-exercise" key={e.id}>
                  <strong>{e.name}</strong>
                  <small>
                    {e.sets
                      .filter((s) => s.completed)
                      .map((s) => s.weight + "kg × " + s.reps + "회")
                      .join(" / ") || "완료 세트 없음"}
                  </small>
                </div>
              ))}
              <p className="muted">
                총 볼륨 {sessionVolume(s).toLocaleString()}kg · 눌러서 수정
              </p>
              {s.memo && <p>{s.memo}</p>}
            </Link>
          ))}
          {!selectedSessions.length && (
            <Empty title="이날의 운동 기록이 없어요">
              초록 점이 표시된 날짜를 선택해보세요.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
