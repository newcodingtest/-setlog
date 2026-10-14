# SetLog 개발 지침

## 목적과 기술

모든 세트가 성장의 기록이 된다. SetLog는 서버·회원가입 없이 오프라인에서도 사용하는 개인 웨이트 운동일지 PWA다. React 19, TypeScript strict, Vite, Tailwind CSS 4, React Router, Dexie/IndexedDB, Lucide, Recharts, vite-plugin-pwa, Vitest/Testing Library를 사용한다. npm과 package-lock.json을 유지한다.

## 구조

- src/app: 앱 구성, 라우트, 저장 상태 Provider
- src/components/common: 공통 접근성 UI
- src/features: home, exercise, workout, history, statistics, settings
- src/db: Dexie 스키마 및 기본 종목
- src/repositories: 데이터 접근과 트랜잭션
- src/hooks: UI 데이터 조회 및 상태
- src/lib: 날짜와 입력 검증
- src/types: 도메인 타입
- src/styles, public/icons: 반응형 스타일과 PWA 아이콘
- tests: 도메인 및 UI 단위 테스트, e2e: 프로덕션 브라우저 테스트

## TypeScript 및 React

strict 타입 검사를 유지하고 any와 강제 non-null 단언을 새로 도입하지 않는다. 외부 입력은 unknown에서 런타임 검증한다. 컴포넌트는 표시·입력에 집중하고 계산 및 검증은 순수 함수로 분리한다. Hook 의존성을 정확히 지정하고 안정적인 callback을 사용한다. 라우트 단위로 무거운 차트를 지연 로딩한다. 사용자에게 보이는 문구는 한국어로 쓴다.

## 데이터 접근

UI에서 Dexie/IndexedDB 쿼리를 작성하지 않는다. WorkoutRepository와 백업 모듈을 통해서만 저장한다. 관계 변경 및 백업 교체는 원자적 트랜잭션으로 처리한다. UUID로 엔티티를 식별하고 WorkoutExercise에 이름·부위 스냅샷을 유지한다. 운동 종목 삭제는 archive 처리해 과거 연결을 보존한다. 완료 세트만 통계에 포함하며 진행 중 세션은 성장 통계에서 제외한다. 중량 0과 소수를 허용하고 반복은 양의 정수여야 한다. workoutDate는 로컬 YYYY-MM-DD, 나머지 시간은 UTC ISO 문자열이다. 스키마 변경 시 기존 version(1)을 수정하지 말고 새 Dexie version과 마이그레이션·테스트를 추가한다. 백업의 format/version을 명시하고 버전 변경 시 마이그레이션 경로를 설계한다.

## 저장과 모바일 UX

유효한 입력은 즉시 저장하고 진행 중 세션을 재실행 시 복구한다. 저장 중/완료/실패와 입력 오류를 표시한다. 저장 실패를 숨기지 않는다. 다크 차콜·라임 컬러, 읽기 쉬운 대비, 44px 터치 영역과 숫자 inputMode를 유지한다. 320px부터 데스크톱까지 가로 넘침을 방지한다. 하단 탐색은 safe-area를 포함한다. 모달은 접근 가능한 dialog, 포커스 가두기·복구, Escape 지원을 유지한다. 삭제·복구·초기화는 먼저 구체적인 확인을 표시한다. PWA 업데이트는 저장 중 또는 오류 입력 중에는 적용하지 않는다.

## 테스트와 검증

저장소 테스트는 fake-indexeddb로 각 테스트 DB를 분리한다. 세션 생성, 복구, 세트 검증, 이전 기록, 삭제, 스냅샷, 통계, 백업 무결성과 트랜잭션을 검증한다. UI 테스트는 사용자 행동과 접근 가능한 이름을 사용한다. e2e는 빌드 결과에서 모바일 완료 시나리오와 실제 네트워크 차단·재실행을 확인한다.
변경 후 npm run typecheck, npm run lint, npm test, npm run build를 실행한다. 저장·PWA·라우트·레이아웃 변경에는 npm run test:e2e도 실행한다. 실패 원인을 고친 후 관련 검사를 다시 실행한다. 실제 실행한 검증과 실행하지 못한 실제 기기/설치 검증을 구분해 보고한다. 불필요한 의존성·외부 API·클라우드·동기화 기능을 추가하지 않는다. README의 실행법과 제한사항을 함께 갱신한다.

## 백업 병합 유지 규칙

백업 가져오기는 전체 초기화하지 말고 UUID 기준으로 병합한다. 로컬 전용 기록을 보존하고 같은 세션은 하위 종목·세트를 포함한 최신 스냅샷 전체로 처리한다. 같은 수정 시간의 충돌은 로컬 우선으로 안내한다. 두 개의 진행 중 세션을 만들거나 다른 부모의 하위 ID 충돌을 허용하지 않는다. 미리보기와 쓰기 사이 데이터 변경을 확인하고 병합 전체를 원자적 트랜잭션으로 실행한다. 반복 가져오기·오래된 백업·최신 삭제 세트·롤백·PC/휴대폰 독립 브라우저 시나리오를 테스트한다.
