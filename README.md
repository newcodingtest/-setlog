# SetLog · 셋로그

> 모든 세트가 성장의 기록이 된다.

서버와 회원가입 없이 사용하는 웨이트 트레이닝 기록 PWA입니다. 운동 데이터는 이 브라우저의 IndexedDB에 저장되며, 앱 셸을 처음 캐시한 뒤에는 오프라인에서도 기록과 조회가 가능합니다. Mock 운동 기록은 넣지 않았습니다.

## 실행

Node.js 22.12 이상 LTS와 npm을 권장합니다. 의존성 버전은 package-lock.json으로 고정합니다.

```sh
npm ci
npm run dev
```

개발 서버: http://localhost:5173

현재 Windows 작업 환경에 Node가 없어 프로젝트 내부의 무시되는 .tools 폴더에 Node v22.23.3을 준비했습니다. 이 작업 폴더에서는 다음 방법도 사용할 수 있습니다. .tools는 배포 소스나 Git에 포함되지 않습니다. 다른 PC에서는 Node를 설치하고 위 명령을 사용하세요.

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-SetLog.ps1
powershell -ExecutionPolicy Bypass -File .\Start-SetLog.ps1 -Task build
```

## 빌드와 품질 검사

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4173
npm run test:e2e
```

E2E는 설치된 Chrome을 사용하고 프로덕션 preview 서버를 자동 실행합니다. Chrome을 찾지 못하면 PLAYWRIGHT_CHROME_EXECUTABLE에 Chrome 실행 파일의 절대 경로를 지정하세요. 예: PowerShell에서 $env:PLAYWRIGHT_CHROME_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'. Chrome이 없으면 npm exec playwright install chromium 후 playwright.config.ts의 channel을 제거해 Playwright Chromium을 사용할 수 있습니다.

빌드 결과는 dist/입니다. 정적 호스팅에서 모든 앱 경로를 index.html로 연결하는 SPA fallback을 설정하세요. 루트 경로 배포를 기본으로 합니다. 모바일 PWA에는 HTTPS가 필요하며 localhost는 개발용 예외입니다. LAN의 일반 HTTP 주소에서는 설치와 Service Worker를 검증할 수 없습니다.

## 구현 기능

- 기본 운동 23종, 운동명 검색, 부위 필터, 사용자 종목 추가·수정·삭제, 운동별 기록 조회.
- WorkoutExercise에 운동명과 부위를 스냅샷으로 보존. 종목 삭제는 숨김 처리하여 과거 기록과 연결 유지.
- 한 개의 진행 중 운동, 시작 및 이어하기, 운동 종목 추가·제거·순서 이동.
- 세트 추가·삭제·번호 재정렬, 직전 입력값 복사, 소수 kg·0kg 맨몸·양의 정수 반복 지원.
- 유효 입력 즉시 IndexedDB 저장, 저장 상태 및 실패 표시, 재시도, 저장·오류 입력 중 탐색/완료 보호.
- 이전 완료 운동에서 동일 종목의 완료 세트 비교. 운동 날짜와 메모 편집.
- 운동 종료 확인, 완료 세트만 통계 반영, 과거 기록 수정 및 삭제 확인.
- 월별 달력, 완료 날짜 표시, 선택 날짜의 세션/세트 상세 조회.
- 운동별 최고 중량·볼륨·반복 합계, 날짜별 중량/볼륨 차트, 접근성 대체 표, 기록 없는 안내.
- 전체 횟수, 이번 주, 최근 7일·30일 횟수와 30일 볼륨. 날짜 경계는 로컬 날짜 사용.
- 버전 1 JSON 내보내기/가져오기. 형식, 필드 타입, 날짜, 관계, 중복 ID/종목/순서/세트 번호 검증. 20MB 가져오기 제한.
- 기존 데이터 교체 전 경고, 원자적 복구, 실패 시 롤백, 초기화 확인, 정기 백업 안내.
- 다크 차콜/라임 UI, 반응형 데스크톱 사이드바·모바일 하단 메뉴, 숫자 키패드, 접근 가능한 모달.
- Manifest, 192/512px 및 maskable PNG 아이콘, 앱 셸 precache, 설치 프롬프트, 오프라인 준비 알림, 사용자 선택 업데이트.

## PWA 설치 및 오프라인

1. npm run build 후 npm run preview를 실행합니다. 개발 서버에는 Service Worker를 활성화하지 않았습니다.
2. localhost 또는 HTTPS에서 앱을 열고 ‘오프라인 사용 준비가 완료되었습니다’ 알림을 확인합니다.
3. Android Chrome/Edge: 앱의 설치 버튼 또는 브라우저 메뉴 → 앱 설치/홈 화면에 추가.
4. iPhone Safari: 공유 → 홈 화면에 추가. Safari는 앱의 beforeinstallprompt 버튼을 지원하지 않을 수 있습니다.
5. 한 번 온라인에서 준비한 뒤 네트워크를 끊고 앱을 다시 열어 조회 및 입력을 확인합니다.
6. 새 배포가 감지되면 업데이트 안내에서 적용 시점을 선택합니다. 입력 오류·저장 중에는 새로고침하지 않습니다.

## 실제 프로젝트 구조

```text
setlog/
├── public/icons/                 # 일반·maskable PNG 아이콘
├── src/
│   ├── app/                     # App, DataProvider
│   ├── components/common/       # Modal, Empty, LoadError
│   ├── db/                      # Dexie 스키마, 기본 운동
│   ├── features/
│   │   ├── home/
│   │   ├── exercise/
│   │   ├── workout/
│   │   ├── history/
│   │   ├── statistics/
│   │   └── settings/            # 설정, 백업 검증·교체
│   ├── hooks/                   # useData, useResource
│   ├── lib/                     # 로컬 날짜, 세트 입력 검증
│   ├── repositories/            # WorkoutRepository
│   ├── styles/                  # Tailwind + 모바일 CSS
│   ├── types/                   # 엔티티 및 Backup 타입
│   └── main.tsx
├── tests/                       # IndexedDB·컴포넌트 테스트
├── e2e/                         # Chrome 모바일·백업·반응형 테스트
├── docs/                        # 검증 결과와 화면 캡처
├── AGENTS.md
├── README.md
├── Start-SetLog.ps1
├── eslint.config.js
├── playwright.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── package-lock.json
```

## 주요 라이브러리

React/React DOM 19.3, TypeScript 6.0.3, Vite 8.3, Tailwind CSS 4.3 및 @tailwindcss/vite, React Router 7.18, Dexie 4.4, vite-plugin-pwa 2.0, Lucide React 1.57, Recharts 3.10. 테스트에는 Vitest 5, React Testing Library, fake-indexeddb, Playwright를 사용합니다. 전역 상태는 작은 React Context와 저장 작업 큐로 충분하여 Zustand는 추가하지 않았습니다.

## 데이터 모델과 인덱스

Exercise → WorkoutExercise → WorkoutSet이며 WorkoutSession → WorkoutExercise 관계입니다. Exercise는 사용자 종목 수정 후에도 연결 ID를 유지합니다. 세션 삭제는 연결된 종목 및 세트를 같은 트랜잭션에서 삭제합니다.

| 테이블           | 키 및 인덱스                                         | 조회 목적                |
| ---------------- | ---------------------------------------------------- | ------------------------ |
| exercises        | id, name, muscleGroup                                | 종목 선택·검색·필터      |
| sessions         | id, workoutDate, status, startedAt                   | 날짜별 기록·진행 중 세션 |
| workoutExercises | id, sessionId, exerciseId, [sessionId+displayOrder]  | 세션 구성·종목 연결·정렬 |
| sets             | id, workoutExerciseId, [workoutExerciseId+setNumber] | 운동별 세트·정렬         |

workoutDate는 로컬 YYYY-MM-DD입니다. startedAt, completedAt, createdAt, updatedAt은 UTC ISO 시간입니다. 날짜만 나타내는 값에 toISOString().slice(0,10)을 사용하지 않습니다. 최근 7일/30일은 오늘을 포함하며, 이번 주는 월요일부터 오늘까지입니다. 훈련 볼륨은 완료 세트의 Σ(중량 × 반복), 맨몸의 볼륨은 0이고 반복 합계는 유지합니다.

Dexie version(1)이 현재 스키마입니다. 향후 버전은 새 version().stores().upgrade()로 추가하고 기존 데이터를 보존하는 테스트를 작성해야 합니다. 백업은 format: setlog, version: 1로 식별하며 미지원 버전은 교체 전에 거부합니다. 향후 백업 마이그레이션은 parseBackup 진입점에 추가할 수 있습니다. UI는 저장소 API만 사용하므로 Spring Boot 연동 시 저장소 및 동기화 모듈을 교체·추가할 수 있습니다.

## 검증 기록

2026-10-14, Windows/Node 22.23.3/설치된 Chrome에서 검증했습니다. 자세한 최종 결과는 docs/VERIFICATION.md에 기록합니다.

- 타입 검사, ESLint, 프로덕션 빌드.
- fake-indexeddb 기반 저장소·입력·통계 테스트와 Testing Library의 입력·완료·실패 재시도.
- Chrome 모바일 뷰포트에서 60×10, 70×8, 70×8 → 완료 → 볼륨 1,720kg.
- 날짜를 다음 날로 변경한 세션에서 이전 세트 표시 및 재실행 복구.
- 실제 브라우저 네트워크 차단 후 앱 재실행·새 세트 저장·재조회.
- JSON 다운로드, 잘못된 파일 거부, 교체 전 확인, 초기화 및 복구, 종목 스냅샷·삭제.
- 320/390/768/1440px 화면의 가로 넘침 및 모달 포커스·Escape·포커스 복구.

## 제한사항 및 다음 단계

- 저장은 브라우저/origin별로 분리됩니다. 브라우저 데이터 삭제·기기 변경을 대비해 정기 백업이 필요합니다.
- 데이터 병합 대신 전체 교체만 제공합니다. 알 수 없는 버전과 중복 데이터는 거부합니다.
- 여러 기기의 자동 동기화와 여러 탭의 실시간 편집 동기화는 제공하지 않습니다. 한 탭에서 기록하는 것을 권장합니다.
- 비어 있거나 잘못된 입력값은 화면의 초안으로만 남고 영구 저장하지 않습니다. 오류를 해결하면 저장됩니다.
- 실물 iPhone/Android의 홈 화면 설치, OS 키보드·safe-area·백그라운드 종료와 새 배포 업데이트 수명주기는 직접 검증하지 못했습니다. Chrome의 Service Worker 제어와 오프라인 조회/쓰기는 자동 검증합니다.
- 대규모 기록의 통계는 전체 완료 세션을 로딩하므로 매우 많은 기록에는 집계 캐시·페이지 단위 조회가 다음 개선점입니다.
- 향후 추천 기능: 운동 루틴 템플릿, 휴식 타이머, 백업 병합과 스키마 마이그레이션, 선택적인 Spring Boot 동기화. 현재 MVP에는 포함하지 않았습니다.

## 구현 참고

[Vite 실행 환경](https://vite.dev/guide/), [Tailwind Vite 통합](https://tailwindcss.com/docs/installation/using-vite), [Vite PWA 업데이트 흐름](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates)을 확인하고 호환되는 npm 안정 버전을 설치했습니다.
