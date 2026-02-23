import type { InputData } from "./types";

export const DEFAULTS: InputData = {
  doc_meta: {
    idea: "",
    doc_title: "",
    scope: "MVP v1.0",
    audience: "풀스택 개발자",
    work_mode: "바이브코딩 (Claude Code 활용)",
  },
  context: {
    product_one_liner: "",
    core_scenarios: [],
    quality_bars: "응답시간 < 200ms, 테스트 커버리지 > 80%",
    top_risks: ["기술 부채 누적", "일정 지연"],
  },
  tech: {
    tech_stack: "",
    git_strategy: "GitHub Flow (main + feature branches)",
    deployment: "Vercel",
    envs: ["dev", "prod"],
    cicd_tools: "GitHub Actions, Vercel Auto Deploy",
  },
  claude_rules: {
    do_dont: "DO: 단일 책임 함수 작성\nDO: 테스트 먼저 작성 (TDD)\nDO: 타입 명시 (no any)\nDO: 에러 핸들링 명시\nDON'T: 500줄 이상 파일 금지\nDON'T: any 타입 사용 금지\nDON'T: console.log 방치 금지\nDON'T: 하드코딩 금지",
    task_slicing_rule: "하나의 PR은 하나의 기능/버그만 포함, 300줄 이내 권장",
    quality_gates: "lint 통과, 타입 체크 통과, 단위 테스트 통과, 빌드 성공",
    experiment_vs_product: "실험은 experiment/ 브랜치에서 진행, 프로덕션은 main 기준",
    observability_rules: "구조화 로깅 (JSON), 헬스체크 엔드포인트",
  },
  policies: {
    decision_policy: "ADR로 기록",
    review_policy: "",
    security_policy: "시크릿은 환경변수 관리, HTTPS 필수, 입력값 검증 필수",
  },
  template_styles: {
    issue_template_style: `## 이슈 템플릿
### 문제 (Problem)
- 현상:
- 영향 범위:
- 재현 조건:

### 원인 (Cause)
- 근본 원인:
- 관련 코드/모듈:

### 해결 (Solution)
- 해결 방안:
- 예상 작업량:
- 완료 조건:
- [ ] 테스트 통과
- [ ] 코드 리뷰 완료`,
    adr_template_style: `## ADR-NNN: [결정 제목]
### 상태 (Status)
- [ ] 제안 / [x] 승인 / [ ] 폐기 / [ ] 대체

### 컨텍스트 (Context)
- 배경 및 제약 사항:
- 관련 요구사항:

### 결정 (Decision)
- 선택한 방안:
- 핵심 근거:

### 결과 (Consequences)
- 긍정적 결과:
- 부정적 결과 / 트레이드오프:
- 후속 조치:`,
    pr_template_style: `## PR 템플릿
### 관련 이슈
- closes #

### 변경 사항
-

### 테스트
- [ ] 단위 테스트 추가/수정
- [ ] 수동 테스트 완료
- 테스트 방법:

### 체크리스트
- [ ] lint / type check 통과
- [ ] 기존 테스트 깨지지 않음
- [ ] 문서 업데이트 (필요 시)
- [ ] 마이그레이션 필요 여부 확인`,
    test_plan_style: `## 테스트 계획
### 테스트 범위
-

### 테스트 케이스
| # | 시나리오 | 실행 조건 | 기대 결과 | 우선순위 |
|---|----------|-----------|-----------|----------|
| 1 |          |           |           | High     |
| 2 |          |           |           | Medium   |

### 테스트 환경
- 환경:
- 테스트 데이터:

### 통과 기준
- 전체 케이스 통과율: 100%
- 크리티컬 버그: 0건`,
    release_template_style: `## 릴리스 노트 v0.0.0
### 릴리스 정보
- 버전: v0.0.0
- 날짜: YYYY-MM-DD
- 배포 환경: staging → prod

### 변경 로그
#### 새 기능
-
#### 버그 수정
-
#### 개선
-

### 배포 체크리스트
- [ ] staging 검증 완료
- [ ] DB 마이그레이션 실행
- [ ] 환경변수 확인
- [ ] 모니터링 대시보드 확인

### 롤백 계획
- 롤백 기준: 에러율 > N% 또는 응답시간 > N ms
- 롤백 절차:
  1.
  2.
- 롤백 담당:`,
  },
};

export const SAMPLE_DATA: InputData = {
  doc_meta: {
    idea: "팀원들이 실시간으로 문서를 함께 편집하고, 댓글과 멘션으로 소통할 수 있는 Notion 같은 웹 앱을 만들고 싶습니다. 마크다운 에디터 기반이고, 오프라인에서도 작업 후 동기화되면 좋겠습니다.",
    doc_title: "실시간 협업 편집기 개발 프로세스 정의서",
    scope: "MVP v1.0",
    audience: "백엔드 개발자, 프론트엔드 개발자, PM/PO",
    work_mode: "바이브코딩 (Claude Code 활용)",
  },
  context: {
    product_one_liner: "실시간 협업 문서 편집기 — 여러 사용자가 동시에 편집 가능",
    core_scenarios: [
      "사용자가 새 문서를 생성한다",
      "사용자가 문서를 실시간으로 공동 편집한다",
      "사용자가 문서를 팀원에게 공유한다",
    ],
    quality_bars: "응답시간 < 200ms, 가용성 99.9%, 동시 편집 지연 < 100ms",
    top_risks: [
      "동시 편집 충돌 (CRDT/OT 복잡성)",
      "데이터 유실 (네트워크 단절 시)",
      "대규모 문서 성능 저하",
    ],
  },
  tech: {
    tech_stack: "TypeScript, Next.js 15, Hono, PostgreSQL, Redis, Y.js",
    git_strategy: "GitHub Flow (main + feature branches)",
    deployment: "Docker + Vercel (프론트) + AWS ECS (백엔드)",
    envs: ["dev", "staging", "prod"],
    cicd_tools: "GitHub Actions + Vercel Auto Deploy",
  },
  claude_rules: {
    do_dont:
      "DO: 단일 책임 함수, 테스트 먼저, 커밋 메시지에 이슈 번호\nDON'T: 500줄 이상 파일, any 타입, console.log 방치",
    task_slicing_rule: "하나의 PR은 하나의 기능/버그만 포함, 300줄 이내 권장",
    quality_gates: "lint + unit test + type check 통과 필수",
    experiment_vs_product: "실험은 experiment/ 브랜치, 프로덕션은 main 기준",
    observability_rules: "구조화 로깅 필수, 에러는 Sentry 연동",
  },
  policies: {
    decision_policy: "ADR로 기록, 72시간 내 리뷰",
    review_policy: "최소 1인 승인, 셀프머지 금지",
    security_policy: "시크릿은 환경변수, 의존성 주간 스캔",
  },
  template_styles: {
    ...DEFAULTS.template_styles,
  },
};

export const DEFAULT_TEMPLATE = `# 개발 프로세스 정의서 작성 프롬프트

> 아래 정보를 바탕으로 **개발 프로세스 정의서**를 작성해 주세요.
> 누락된 항목은 임의로 가정하지 말고 **"[결정 필요]"** 로 표기해 주세요.
> 출력은 Markdown이며, **실행 가능한 체크리스트** 중심으로 작성합니다.

---

## 0. 프로젝트 아이디어

{IDEA}

---

## 1. 문서 메타정보

| 항목 | 내용 |
|------|------|
| 문서 제목 | {DOC_TITLE} |
| 범위 | {SCOPE} |
| 대상 독자 | {AUDIENCE} |
| 작업 방식 | {WORK_MODE} |

---

## 2. 제품/프로젝트 컨텍스트

### 제품 한줄 설명
{PRODUCT_ONE_LINER}

### 핵심 시나리오
{CORE_SCENARIOS}

### 품질 기준
{QUALITY_BARS}

### 주요 리스크
{TOP_RISKS}

---

## 3. 기술 스택 및 환경

| 항목 | 내용 |
|------|------|
| 기술 스택 | {TECH_STACK} |
| Git 전략 | {GIT_STRATEGY} |
| 배포 방식 | {DEPLOYMENT} |
| 환경 구성 | {ENVS} |
| CI/CD 도구 | {CICD_TOOLS} |

---

## 4. Claude Code 작업 규칙

### Do / Don't
{DO_DONT}

### 태스크 분할 규칙
{TASK_SLICING_RULE}

### 품질 게이트
{QUALITY_GATES}

### 실험 vs 프로덕션 구분
{EXPERIMENT_VS_PRODUCT}

### 관측성(Observability) 규칙
{OBSERVABILITY_RULES}

---

## 5. 정책

### 의사결정 정책
{DECISION_POLICY}

### 리뷰 정책
{REVIEW_POLICY}

### 보안 정책
{SECURITY_POLICY}

---

## 6. 템플릿/스타일 가이드

| 항목 | 스타일 |
|------|--------|
| 이슈 템플릿 | {ISSUE_TEMPLATE_STYLE} |
| ADR 템플릿 | {ADR_TEMPLATE_STYLE} |
| PR 템플릿 | {PR_TEMPLATE_STYLE} |
| 테스트 계획 | {TEST_PLAN_STYLE} |
| 릴리스 템플릿 | {RELEASE_TEMPLATE_STYLE} |
`;
