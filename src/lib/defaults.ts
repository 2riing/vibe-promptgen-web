import type { InputData } from "./types";

export const DEFAULTS: InputData = {
  doc_meta: {
    doc_title: "",
    scope: "",
    audience: "",
    work_mode: "바이브코딩 (Claude Code 활용)",
  },
  context: {
    product_one_liner: "",
    core_scenarios: [],
    quality_bars: "",
    top_risks: [],
  },
  tech: {
    tech_stack: "",
    git_strategy: "GitHub Flow (main + feature branches)",
    deployment: "",
    envs: [],
    cicd_tools: "",
  },
  claude_rules: {
    do_dont: "",
    task_slicing_rule: "",
    quality_gates: "",
    experiment_vs_product: "",
    observability_rules: "",
  },
  policies: {
    decision_policy: "",
    review_policy: "",
    security_policy: "",
  },
  template_styles: {
    issue_template_style: "",
    adr_template_style: "",
    pr_template_style: "",
    test_plan_style: "",
    release_template_style: "",
  },
};

export const SAMPLE_DATA: InputData = {
  doc_meta: {
    doc_title: "실시간 협업 편집기 개발 프로세스 정의서",
    scope: "MVP v1.0 개발 범위",
    audience: "개발팀 (백엔드 + 프론트엔드)",
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
    issue_template_style: "문제/원인/해결 3단 구조",
    adr_template_style: "상태/컨텍스트/결정/결과 4단 구조",
    pr_template_style: "변경사항/테스트/체크리스트",
    test_plan_style: "시나리오/기대결과/실행조건",
    release_template_style: "버전/변경로그/롤백 계획",
  },
};

export const DEFAULT_TEMPLATE = `# 개발 프로세스 정의서 작성 프롬프트

> 아래 정보를 바탕으로 **개발 프로세스 정의서**를 작성해 주세요.
> 누락된 항목은 임의로 가정하지 말고 **"[결정 필요]"** 로 표기해 주세요.
> 출력은 Markdown이며, **실행 가능한 체크리스트** 중심으로 작성합니다.

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
