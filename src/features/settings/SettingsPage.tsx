import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { Download, Upload, ShieldCheck, Trash2 } from "lucide-react";
import { useData, workoutRepository } from "../../hooks/useData";
import {
  exportBackup,
  parseBackup,
  importBackup,
  previewImport,
  resetData,
} from "./backup";
import { Modal } from "../../components/common/Modal";
import { localDate } from "../../lib/date";
import type { Backup } from "../../types/domain";
export function SettingsPage() {
  const { run, pending, invalid } = useData();
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup>(),
    [preview, setPreview] =
      useState<Awaited<ReturnType<typeof previewImport>>>(),
    [reset, setReset] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const download = async () => {
    await run(async () => {
      const data = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "setlog-backup-" + localDate() + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("백업 파일을 내보냈습니다. 다운로드 폴더를 확인해주세요.");
    });
  };
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h1>내 기록을 안전하게</h1>
          <p>운동 데이터는 이 브라우저에 저장됩니다.</p>
        </div>
      </div>
      <section className="backup-notice">
        <ShieldCheck size={28} />
        <div>
          <h2>정기적인 백업을 권장해요</h2>
          <p>
            브라우저 데이터 삭제, 기기 교체 또는 저장 공간 정리로 기록이 사라질
            수 있습니다. JSON 파일을 별도 보관해주세요. 다른 기기나 브라우저와
            자동 동기화되지 않습니다.
          </p>
        </div>
      </section>
      <section className="card settings-section">
        <h2>데이터 백업 및 복구</h2>
        <div className="settings-row">
          <div>
            <h3>전체 데이터 내보내기</h3>
            <p>종목, 운동 세션, 세트를 버전 1 JSON으로 저장합니다.</p>
          </div>
          <button
            className="secondary"
            disabled={!!pending || !!invalid}
            onClick={() => void download()}
          >
            <Download size={18} />
            내보내기
          </button>
        </div>
        <div className="settings-row">
          <div>
            <h3>백업 파일 가져오기</h3>
            <p>
              기존 기록을 유지하고 백업의 새 기록과 최신 수정 내용을 병합합니다.
            </p>
          </div>
          <button
            className="secondary"
            disabled={!!pending || !!invalid}
            onClick={() => input.current?.click()}
          >
            <Upload size={18} />
            가져오기
          </button>
          <input
            ref={input}
            hidden
            type="file"
            accept=".json,application/json"
            aria-label="백업 JSON 파일"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              setPreview(undefined);
              setBackup(undefined);
              try {
                if (file.size > 20 * 1024 * 1024)
                  throw new Error("20MB 이하의 백업 파일을 선택해주세요.");
                const parsed = parseBackup(JSON.parse(await file.text()));
                const plan = await previewImport(parsed);
                setPreview(plan);
                setBackup(parsed);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "파일을 읽을 수 없습니다.",
                );
              }
            }}
          />
        </div>
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="card settings-section">
        <h2>앱 설치 및 오프라인</h2>
        <Link className="secondary" to="/install">
          홈 화면 추가 방법 보기 →
        </Link>
        <p>
          Android Chrome/Edge: 브라우저 메뉴의 ‘앱 설치’ 또는 ‘홈 화면에 추가’를
          선택하세요.
        </p>
        <p>
          iPhone Safari: 공유 버튼 → ‘홈 화면에 추가’. 처음 온라인으로 앱을 열고
          오프라인 준비 알림을 확인해주세요.
        </p>
        <p>
          설치와 Service Worker는 HTTPS 또는 localhost에서 동작합니다. 캐시된
          앱은 인터넷 없이 조회와 기록을 지원합니다.
        </p>
      </section>
      <section className="card settings-section">
        <h2>데이터 초기화</h2>
        <div className="settings-row">
          <p>모든 운동 기록과 사용자 종목을 삭제합니다.</p>
          <button
            className="danger"
            disabled={!!pending || !!invalid}
            onClick={() => setReset(true)}
          >
            <Trash2 size={18} />
            초기화
          </button>
        </div>
      </section>
      <footer className="about">
        <strong>
          SET<span>LOG</span>
        </strong>
        <p>모든 세트가 성장의 기록이 된다.</p>
        <small>v1.0.0 · 개인 운동일지 · 서버 및 회원가입 없음</small>
      </footer>
      {backup && preview && (
        <Modal
          title="백업 기록을 병합할까요?"
          onClose={() => setBackup(undefined)}
        >
          <p className="error">
            백업에 없는 기존 기록은 유지됩니다. 같은 기록은 더 최근에 수정된
            운동 전체를 적용하며, 수정 시간이 같으면 현재 기기의 기록을
            유지합니다. 기기 시간이 정확한지 확인해주세요.
          </p>
          <p>
            새 운동 {preview.summary.added}개 · 최신 기록으로 갱신{" "}
            {preview.summary.updated}개 · 동일 기록 {preview.summary.unchanged}
            개 · 현재 기록 유지 {preview.summary.keptLocal}개
          </p>
          <p>
            새 종목 {preview.summary.exercisesAdded}개 · 종목 갱신{" "}
            {preview.summary.exercisesUpdated}개 · 같은 수정 시간의 충돌{" "}
            {preview.summary.conflicts}개
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setBackup(undefined)}>
              취소
            </button>
            <button
              className="primary"
              disabled={!!pending}
              onClick={async () => {
                if (
                  await run(async () => {
                    await importBackup(backup, undefined, preview.fingerprint);
                    await workoutRepository.initialize();
                  })
                ) {
                  setBackup(undefined);
                  setMessage("백업 병합이 완료되었습니다.");
                }
              }}
            >
              기록 병합
            </button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal
          title="모든 데이터를 삭제할까요?"
          onClose={() => setReset(false)}
        >
          <p>
            운동 기록과 사용자 종목이 영구 삭제됩니다. 기본 운동 종목은 다시
            생성됩니다.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReset(false)}>
              취소
            </button>
            <button
              className="danger"
              disabled={!!pending}
              onClick={async () => {
                if (
                  await run(async () => {
                    await resetData();
                    await workoutRepository.initialize();
                  })
                ) {
                  setReset(false);
                  setMessage("데이터를 초기화했습니다.");
                }
              }}
            >
              영구 삭제
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
