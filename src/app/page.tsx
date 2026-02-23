"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import yaml from "js-yaml";
import type { InputData, DraftResponse } from "@/lib/types";
import { TAB_LABELS } from "@/lib/types";
import { DEFAULTS, SAMPLE_DATA } from "@/lib/defaults";
import { generate, deepMerge } from "@/lib/engine";
import { recommendTechs } from "@/lib/recommender";

/* ================================================================== */
/*  Reusable UI atoms                                                  */
/* ================================================================== */

function TextInput({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 3}
        className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm leading-relaxed" />
    </div>
  );
}

function ListInput({ label, items, onChange, placeholder, required }: {
  label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; required?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (v) { onChange([...items, v]); setDraft(""); } };
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm" />
        <button type="button" onClick={add} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">+</button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
              {item}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-blue-400 hover:text-red-400 transition-colors">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  ChipSelect — 클릭으로 토글, 결과는 콤마 구분 문자열              */
/* ================================================================== */

function ChipSelect({ label, value, onChange, options, allowCustom }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; allowCustom?: boolean;
}) {
  const selected = new Set(value ? value.split(", ").filter(Boolean) : []);
  const [custom, setCustom] = useState("");

  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    onChange(Array.from(next).join(", "));
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.has(v)) {
      onChange([...Array.from(selected), v].join(", "));
      setCustom("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selected.has(opt)
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10"
                : "bg-[#1a1a26] border-[#2a2a3a] text-slate-500 hover:text-slate-300 hover:border-slate-500"
            }`}>
            {selected.has(opt) && <span className="mr-1">&#10003;</span>}{opt}
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2 mt-1">
          <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="직접 추가..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-xs outline-none focus:border-blue-500" />
          <button type="button" onClick={addCustom} className="px-2.5 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-400 hover:text-white text-xs transition-colors">+</button>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  ChipListSelect — 배열 필드용 (string[])                           */
/* ================================================================== */

function ChipListSelect({ label, items, onChange, presets, placeholder, required }: {
  label: string; items: string[]; onChange: (v: string[]) => void; presets: string[]; placeholder?: string; required?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const itemSet = new Set(items);

  const toggle = (opt: string) => {
    if (itemSet.has(opt)) onChange(items.filter((i) => i !== opt));
    else onChange([...items, opt]);
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !itemSet.has(v)) { onChange([...items, v]); setCustom(""); }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((opt) => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              itemSet.has(opt)
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10"
                : "bg-[#1a1a26] border-[#2a2a3a] text-slate-500 hover:text-slate-300 hover:border-slate-500"
            }`}>
            {itemSet.has(opt) && <span className="mr-1">&#10003;</span>}{opt}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder={placeholder ?? "직접 추가..."}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-xs outline-none focus:border-blue-500" />
        <button type="button" onClick={addCustom} className="px-2.5 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-400 hover:text-white text-xs transition-colors">+</button>
      </div>
      {/* Show non-preset custom items as removable chips */}
      {items.filter((i) => !presets.includes(i)).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.filter((i) => !presets.includes(i)).map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
              {item}
              <button type="button" onClick={() => onChange(items.filter((i) => i !== item))} className="hover:text-red-400">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  GroupedChipSelect — 카테고리별 칩 선택 (기술 스택용)               */
/* ================================================================== */

interface ChipGroup { label: string; icon: string; options: string[]; }

function GroupedChipSelect({ label, value, onChange, groups, required }: {
  label: string; value: string; onChange: (v: string) => void; groups: ChipGroup[]; required?: boolean;
}) {
  const selected = new Set(value ? value.split(", ").filter(Boolean) : []);
  const [custom, setCustom] = useState("");

  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    onChange(Array.from(next).join(", "));
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.has(v)) { onChange([...Array.from(selected), v].join(", ")); setCustom(""); }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {groups.map((g) => (
        <div key={g.label} className="space-y-1.5">
          <div className="text-xs text-slate-500 font-medium">{g.icon} {g.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.options.map((opt) => (
              <button key={opt} type="button" onClick={() => toggle(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected.has(opt)
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-[#1a1a26] border-[#2a2a3a] text-slate-500 hover:text-slate-300 hover:border-slate-500"
                }`}>
                {selected.has(opt) && <span className="mr-1">&#10003;</span>}{opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="목록에 없는 기술 직접 추가..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-xs outline-none focus:border-blue-500" />
        <button type="button" onClick={addCustom} className="px-2.5 py-1.5 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-400 hover:text-white text-xs transition-colors">+</button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SelectInput                                                        */
/* ================================================================== */

interface SelectOption { label: string; value: string; }

function SelectInput({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: SelectOption[];
}) {
  const isCustom = value !== "" && !options.some((o) => o.value === value);
  const [showCustom, setShowCustom] = useState(isCustom);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <select value={showCustom ? "__custom__" : value}
        onChange={(e) => {
          if (e.target.value === "__custom__") { setShowCustom(true); onChange(""); }
          else { setShowCustom(false); onChange(e.target.value); }
        }}
        className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500 transition-colors">
        <option value="">-- 선택하세요 --</option>
        {options.map((o) => (<option key={o.label} value={o.value}>{o.label}</option>))}
        <option value="__custom__">직접 입력...</option>
      </select>
      {showCustom && (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="직접 입력하세요..." rows={3}
          className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm leading-relaxed mt-1.5" />
      )}
      {value && !showCustom && (
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{value}</div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Preset data for template styles (from previous impl)               */
/* ================================================================== */

const ISSUE_OPTIONS: SelectOption[] = [
  { label: "문제/원인/해결 3단 구조", value: `## 이슈 템플릿\n### 문제 (Problem)\n- 현상:\n- 영향 범위:\n- 재현 조건:\n\n### 원인 (Cause)\n- 근본 원인:\n- 관련 코드/모듈:\n\n### 해결 (Solution)\n- 해결 방안:\n- 예상 작업량:\n- 완료 조건:\n- [ ] 테스트 통과\n- [ ] 코드 리뷰 완료` },
  { label: "Bug Report (환경/재현/예상/실제)", value: `## Bug Report\n### 환경\n- OS / 브라우저:\n- 버전:\n- 배포 환경: dev / staging / prod\n\n### 재현 단계\n1.\n2.\n3.\n\n### 예상 동작\n-\n\n### 실제 동작\n-\n\n### 스크린샷 / 로그\n-\n\n### 우선순위: P0 / P1 / P2 / P3` },
  { label: "Feature Request (배경/제안/기대효과)", value: `## Feature Request\n### 배경/동기\n- 현재 상황:\n- 사용자 Pain Point:\n\n### 제안\n- 기능 설명:\n- 주요 유저 스토리:\n\n### 기대 효과\n- 사용자 가치:\n- 비즈니스 임팩트:\n\n### 수용 기준 (Acceptance Criteria)\n- [ ]\n- [ ]\n\n### 우선순위: Must / Should / Could / Won't` },
];

const ADR_OPTIONS: SelectOption[] = [
  { label: "상태/컨텍스트/결정/결과 4단 구조", value: `## ADR-NNN: [결정 제목]\n### 상태 (Status)\n- [ ] 제안 / [x] 승인 / [ ] 폐기 / [ ] 대체\n\n### 컨텍스트 (Context)\n- 배경 및 제약 사항:\n- 관련 요구사항:\n\n### 결정 (Decision)\n- 선택한 방안:\n- 핵심 근거:\n\n### 결과 (Consequences)\n- 긍정적 결과:\n- 부정적 결과 / 트레이드오프:\n- 후속 조치:` },
  { label: "MADR 표준 (옵션/비교표 포함)", value: `## ADR-NNN: [결정 제목]\n- 날짜: YYYY-MM-DD\n- 상태: 제안 | 승인 | 폐기 | 대체\n\n### 맥락과 문제\n-\n\n### 고려한 옵션\n1. 옵션 A:\n2. 옵션 B:\n\n### 결정\n- 선택: 옵션 X\n- 근거:\n\n### 각 옵션의 장단점\n| 옵션 | 장점 | 단점 |\n|------|------|------|\n| A    |      |      |\n| B    |      |      |\n\n### 후속 조치\n- [ ]` },
];

const PR_OPTIONS: SelectOption[] = [
  { label: "변경사항/테스트/체크리스트", value: `## PR 템플릿\n### 관련 이슈\n- closes #\n\n### 변경 사항\n-\n\n### 테스트\n- [ ] 단위 테스트 추가/수정\n- [ ] 수동 테스트 완료\n\n### 체크리스트\n- [ ] lint / type check 통과\n- [ ] 기존 테스트 깨지지 않음\n- [ ] 문서 업데이트 (필요 시)` },
  { label: "What/Why/How + 리뷰 포인트", value: `## PR 템플릿\n### What (무엇을 바꿨나)\n-\n\n### Why (왜 바꿨나)\n-\n\n### How (어떻게 바꿨나)\n-\n\n### 스크린샷 (UI 변경 시)\n-\n\n### 리뷰 포인트\n- 특히 봐주셨으면 하는 부분:\n\n### 체크리스트\n- [ ] 셀프 리뷰 완료\n- [ ] 테스트 통과` },
  { label: "Conventional (Breaking/Features/Fixes)", value: `## PR 템플릿\n### 타입: feat / fix / refactor / docs / chore\n### 관련 이슈: #\n\n### Breaking Changes\n- 없음 / 있음:\n\n### 주요 변경\n-\n\n### 테스트 계획\n-\n\n### 배포 노트\n- 환경변수 추가:\n- DB 마이그레이션:\n- 의존성 변경:` },
];

const TEST_PLAN_OPTIONS: SelectOption[] = [
  { label: "시나리오/기대결과/실행조건", value: `## 테스트 계획\n### 테스트 범위\n-\n\n### 테스트 케이스\n| # | 시나리오 | 실행 조건 | 기대 결과 | 우선순위 |\n|---|----------|-----------|-----------|----------|\n| 1 |          |           |           | High     |\n| 2 |          |           |           | Medium   |\n\n### 테스트 환경\n- 환경:\n- 테스트 데이터:\n\n### 통과 기준\n- 전체 케이스 통과율: 100%\n- 크리티컬 버그: 0건` },
  { label: "Given-When-Then (BDD 스타일)", value: `## 테스트 계획 (BDD)\n### Feature: [기능명]\n\n#### Scenario 1:\n- **Given**:\n- **When**:\n- **Then**:\n\n#### Scenario 2:\n- **Given**:\n- **When**:\n- **Then**:\n\n### Edge Cases\n-\n\n### 비기능 테스트\n- [ ] 성능: 응답시간 < N ms\n- [ ] 부하: 동시 접속 N명\n- [ ] 보안: 인증/인가 검증` },
];

const RELEASE_OPTIONS: SelectOption[] = [
  { label: "버전/변경로그/롤백 계획", value: `## 릴리스 노트 v0.0.0\n### 릴리스 정보\n- 버전: v0.0.0\n- 날짜: YYYY-MM-DD\n- 배포 환경: staging → prod\n\n### 변경 로그\n#### 새 기능\n-\n#### 버그 수정\n-\n#### 개선\n-\n\n### 배포 체크리스트\n- [ ] staging 검증 완료\n- [ ] DB 마이그레이션 실행\n- [ ] 환경변수 확인\n- [ ] 모니터링 대시보드 확인\n\n### 롤백 계획\n- 롤백 기준: 에러율 > N%\n- 롤백 절차:\n  1.\n  2.` },
  { label: "릴리스 체크리스트 중심", value: `## 릴리스 체크리스트 v0.0.0\n### Pre-release\n- [ ] feature freeze 완료\n- [ ] QA 테스트 통과\n- [ ] 성능/보안 스캔 통과\n- [ ] 문서 업데이트\n\n### Deploy\n- [ ] DB 마이그레이션\n- [ ] 환경변수 배포\n- [ ] 배포 실행\n\n### Post-release\n- [ ] 헬스체크 확인\n- [ ] 에러 모니터링 확인\n- [ ] 팀 공유 / 릴리스 노트 발행\n\n### Rollback\n- 트리거:\n- 절차:\n- 담당:` },
];

/* ================================================================== */
/*  Preset data for other tabs                                         */
/* ================================================================== */

const TECH_GROUPS: ChipGroup[] = [
  { label: "프론트엔드", icon: "🖥", options: ["React", "Next.js", "Vue", "Nuxt", "Svelte", "Angular", "Tailwind CSS", "TypeScript"] },
  { label: "백엔드", icon: "⚙", options: ["Node.js", "Express", "Fastify", "Hono", "Django", "FastAPI", "Spring Boot", "Go", "Rust"] },
  { label: "앱 (모바일)", icon: "📱", options: ["React Native", "Expo", "Flutter", "Swift", "Kotlin", "Capacitor"] },
  { label: "데이터베이스", icon: "🗄", options: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Supabase", "DynamoDB"] },
  { label: "인프라/배포", icon: "☁", options: ["Docker", "Kubernetes", "AWS", "GCP", "Vercel", "Netlify", "Cloudflare"] },
];

/* ================================================================== */
/*  Tech Stack presets & AI recommend                                  */
/* ================================================================== */

interface StackPreset { label: string; icon: string; techs: string[]; color: string; }

const STACK_PRESETS: StackPreset[] = [
  { label: "프론트엔드 전용", icon: "🖥", color: "cyan", techs: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Vercel"] },
  { label: "백엔드 API 전용", icon: "⚙", color: "amber", techs: ["Node.js", "TypeScript", "Fastify", "PostgreSQL", "Redis", "Docker"] },
  { label: "풀스택", icon: "🚀", color: "violet", techs: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL", "Redis", "Docker", "Vercel"] },
  { label: "심플 JAMstack", icon: "⚡", color: "green", techs: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"] },
  { label: "모바일 앱", icon: "📱", color: "pink", techs: ["React Native", "Expo", "TypeScript", "Node.js", "Fastify", "PostgreSQL", "Docker"] },
  { label: "크로스플랫폼 앱", icon: "🌐", color: "teal", techs: ["Flutter", "TypeScript", "Node.js", "Fastify", "PostgreSQL", "Supabase", "Docker"] },
];


const SCOPE_OPTIONS: SelectOption[] = [
  { label: "MVP v1.0", value: "MVP v1.0" },
  { label: "Beta 릴리스", value: "Beta 릴리스" },
  { label: "정식 릴리스 v1.0", value: "정식 릴리스 v1.0" },
  { label: "기능 추가/업그레이드", value: "기능 추가/업그레이드" },
  { label: "리팩토링/마이그레이션", value: "리팩토링/마이그레이션" },
  { label: "PoC (Proof of Concept)", value: "PoC (Proof of Concept)" },
];

const WORK_MODE_OPTIONS: SelectOption[] = [
  { label: "바이브코딩 (Claude Code 활용)", value: "바이브코딩 (Claude Code 활용)" },
  { label: "페어 프로그래밍 (AI 보조)", value: "페어 프로그래밍 (AI 보조)" },
  { label: "애자일 스크럼", value: "애자일 스크럼" },
  { label: "칸반", value: "칸반" },
];

const AUDIENCE_PRESETS = ["백엔드 개발자", "프론트엔드 개발자", "풀스택 개발자", "디자이너", "PM/PO", "QA 엔지니어", "DevOps/인프라", "경영진/이해관계자"];

const QUALITY_PRESETS = ["응답시간 < 200ms", "가용성 99.9%", "에러율 < 0.1%", "테스트 커버리지 > 80%", "Lighthouse > 90", "Core Web Vitals 통과", "접근성 WCAG 2.1 AA"];

const RISK_PRESETS = ["보안 취약점", "성능 저하/병목", "데이터 유실/정합성", "확장성 한계", "외부 API 의존성", "기술 부채 누적", "일정 지연", "인력/리소스 부족"];

const GIT_OPTIONS: SelectOption[] = [
  { label: "GitHub Flow (main + feature branches)", value: "GitHub Flow (main + feature branches)" },
  { label: "Git Flow (develop/release/hotfix)", value: "Git Flow (develop/release/hotfix)" },
  { label: "Trunk-based Development", value: "Trunk-based Development" },
  { label: "GitLab Flow (environment branches)", value: "GitLab Flow (environment branches)" },
];

const DEPLOY_PRESETS = ["Docker", "Docker Compose", "Kubernetes", "Vercel", "Netlify", "AWS ECS", "AWS Lambda", "GCP Cloud Run", "Railway", "Fly.io"];
const ENV_PRESETS = ["dev", "staging", "prod", "QA", "load-test"];
const CICD_PRESETS = ["GitHub Actions", "GitLab CI", "Jenkins", "CircleCI", "ArgoCD", "Vercel Auto Deploy"];

const DO_PRESETS = ["단일 책임 함수 작성", "테스트 먼저 작성 (TDD)", "커밋 메시지에 이슈 번호 포함", "PR당 하나의 기능/버그만", "코드 리뷰 필수", "타입 명시 (no any)", "에러 핸들링 명시", "환경변수로 설정 관리"];
const DONT_PRESETS = ["500줄 이상 파일 금지", "any 타입 사용 금지", "console.log 방치 금지", "하드코딩 금지", "셀프 머지 금지", "테스트 없이 머지 금지", "주석 없는 복잡 로직 금지", "미사용 코드 방치 금지"];

const TASK_SLICE_OPTIONS: SelectOption[] = [
  { label: "PR당 하나의 기능, 300줄 이내", value: "하나의 PR은 하나의 기능/버그만 포함, 300줄 이내 권장" },
  { label: "이슈 기반 분할 (1 이슈 = 1 PR)", value: "1개 이슈 = 1개 PR, 이슈에 명시된 범위만 작업" },
  { label: "시간 기반 (4시간 이내 완료 단위)", value: "하나의 태스크는 4시간 이내에 완료 가능한 단위로 분할" },
  { label: "레이어 기반 (API/UI/DB 분리)", value: "API, UI, DB 스키마 변경을 별도 PR로 분리하여 진행" },
];

const QUALITY_GATE_PRESETS = ["lint 통과", "타입 체크 통과", "단위 테스트 통과", "E2E 테스트 통과", "코드 리뷰 1인 이상", "커버리지 기준 충족", "빌드 성공", "보안 스캔 통과"];

const EXP_VS_PROD_OPTIONS: SelectOption[] = [
  { label: "브랜치 분리 (experiment/ vs main)", value: "실험은 experiment/ 브랜치에서 진행, 프로덕션은 main 기준" },
  { label: "피처 플래그 기반 분리", value: "피처 플래그로 실험/프로덕션 구분, 같은 코드베이스에서 관리" },
  { label: "별도 프로젝트/디렉토리", value: "실험은 /experiments 디렉토리, 프로덕션은 /src 에서 관리" },
];

const OBSERVABILITY_PRESETS = ["구조화 로깅 (JSON)", "Sentry 에러 추적", "DataDog APM", "Prometheus + Grafana", "헬스체크 엔드포인트", "슬로우 쿼리 알림", "가동시간 모니터링", "분산 추적 (OpenTelemetry)"];

const DECISION_PRESETS = ["ADR로 기록", "72시간 내 리뷰 완료", "Slack에 의사결정 공유", "이해관계자 동의 필수", "롤백 기준 사전 정의"];
const REVIEW_PRESETS = ["최소 1인 승인", "셀프머지 금지", "CODEOWNERS 자동 지정", "48시간 내 리뷰", "시니어 리뷰 필수 (핵심 모듈)", "UI 변경 시 스크린샷 첨부"];
const SECURITY_PRESETS = ["시크릿은 환경변수 관리", "의존성 주간 자동 스캔", "OWASP Top 10 체크", "SQL 인젝션 방지", "CORS 정책 설정", "HTTPS 필수", "인증/인가 미들웨어", "입력값 검증 필수"];

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */

export default function Home() {
  const [data, setData] = useState<InputData>(structuredClone(DEFAULTS));
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);

  const [draftProvider, setDraftProvider] = useState<"openai" | "anthropic">("openai");
  const [draftModel, setDraftModel] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [draftTemp, setDraftTemp] = useState(0.2);
  const [draftMaxTokens, setDraftMaxTokens] = useState(4000);
  const [draftResult, setDraftResult] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendProgress, setRecommendProgress] = useState("");

  const result = useMemo(() => generate(data), [data]);
  const hasErrors = result.errors.length > 0;

  const update = useCallback(
    <S extends keyof InputData>(section: S, field: keyof InputData[S], value: InputData[S][keyof InputData[S]]) => {
      setData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    }, []
  );

  const handleCopy = async () => { await navigator.clipboard.writeText(result.promptText); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleDownload = () => {
    const blob = new Blob([result.promptText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "prompt.md"; a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (type: "profile" | "project") => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".yaml,.yml,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { const text = ev.target?.result as string; const parsed = file.name.endsWith(".json") ? JSON.parse(text) : yaml.load(text); setData((prev) => deepMerge(prev, parsed as Partial<InputData>)); } catch { alert("파일 파싱에 실패했습니다."); } };
      reader.readAsText(file);
    }; input.click();
  };

  const handleExportYaml = () => {
    const text = yaml.dump(data, { lineWidth: -1, noRefs: true });
    const blob = new Blob([text], { type: "text/yaml;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "project.yaml"; a.click(); URL.revokeObjectURL(url);
  };

  const handleDraft = async (dryRun = false) => {
    if (!draftKey.trim()) { setDraftError("API key를 입력하세요."); return; }
    setDraftLoading(true); setDraftError(""); setDraftResult("");
    try {
      const resp = await fetch("/api/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_text: result.promptText, provider: draftProvider, model: draftModel || (draftProvider === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514"), api_key: draftKey, temperature: draftTemp, max_tokens: draftMaxTokens, dry_run: dryRun }),
      });
      const json: DraftResponse = await resp.json();
      if (json.error) setDraftError(json.error); else setDraftResult(json.content);
    } catch (e) { setDraftError(`요청 실패: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setDraftLoading(false); }
  };

  const handleRecommend = async () => {
    if (!data.doc_meta.idea.trim()) { setTab(0); return; }
    setRecommendLoading(true);
    setRecommendProgress("AI 모델 로딩 중...");
    try {
      const techs = await recommendTechs(data.doc_meta.idea, (p) => {
        if (p < 100) setRecommendProgress(`모델 다운로드 중... ${Math.round(p)}%`);
        else setRecommendProgress("분석 중...");
      });
      if (techs.length) update("tech", "tech_stack", techs.join(", "));
    } catch (e) { alert(`추천 실패: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setRecommendLoading(false); setRecommendProgress(""); }
  };

  /* ---------------------------------------------------------------- */
  /*  Tab contents                                                     */
  /* ---------------------------------------------------------------- */

  const tabContent = [
    // 0: 기본 정보
    <div key="0" className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <span className="text-lg">💡</span> 어떤 걸 만들고 싶으신가요?
        </label>
        <p className="text-xs text-slate-500">자유롭게 아이디어를 적어주세요. 구체적일수록 좋은 프롬프트가 생성됩니다.</p>
        <textarea value={data.doc_meta.idea} onChange={(e) => update("doc_meta", "idea", e.target.value)}
          placeholder="예: 팀원들이 실시간으로 문서를 함께 편집하고, 댓글과 멘션으로 소통할 수 있는 Notion 같은 웹 앱을 만들고 싶습니다. 마크다운 에디터 기반이고, 오프라인에서도 작업 후 동기화되면 좋겠습니다..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a26] border border-blue-500/20 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm leading-relaxed" />
      </div>
      <TextInput label="문서 제목" value={data.doc_meta.doc_title} onChange={(v) => update("doc_meta", "doc_title", v)} placeholder="예: 내 프로젝트 개발 프로세스 정의서" />
      <SelectInput label="범위" value={data.doc_meta.scope} onChange={(v) => update("doc_meta", "scope", v)} options={SCOPE_OPTIONS} />
      <ChipSelect label="대상 독자 (복수 선택)" value={data.doc_meta.audience} onChange={(v) => update("doc_meta", "audience", v)} options={AUDIENCE_PRESETS} allowCustom />
      <SelectInput label="작업 방식" value={data.doc_meta.work_mode} onChange={(v) => update("doc_meta", "work_mode", v)} options={WORK_MODE_OPTIONS} />
    </div>,

    // 1: 컨텍스트
    <div key="1" className="space-y-5">
      <TextInput label="제품 한줄 설명" value={data.context.product_one_liner} onChange={(v) => update("context", "product_one_liner", v)} placeholder="예: 실시간 협업 문서 편집기" required />
      <ListInput label="핵심 시나리오 (최소 2개)" items={data.context.core_scenarios} onChange={(v) => update("context", "core_scenarios", v)} placeholder="시나리오를 입력하고 Enter" required />
      <ChipSelect label="품질 기준 (복수 선택)" value={data.context.quality_bars} onChange={(v) => update("context", "quality_bars", v)} options={QUALITY_PRESETS} allowCustom />
      <ChipListSelect label="주요 리스크 (최소 2개)" items={data.context.top_risks} onChange={(v) => update("context", "top_risks", v)} presets={RISK_PRESETS} placeholder="직접 추가..." required />
    </div>,

    // 2: 기술 스택
    <div key="2" className="space-y-5">
      {/* AI 추천 */}
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={handleRecommend}
          disabled={!data.doc_meta.idea.trim() || recommendLoading}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold border-2 border-dashed border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-300 hover:border-blue-400/60 hover:from-blue-500/20 hover:to-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0">
          {recommendLoading
            ? <><span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /><span>{recommendProgress || "분석 중..."}</span></>
            : <><span className="text-sm">✨</span><span>AI 추천</span></>}
        </button>
        <p className="text-[11px] text-slate-500">
          {!data.doc_meta.idea.trim()
            ? "기본 정보 탭에서 아이디어를 먼저 입력하세요"
            : "브라우저 내 AI가 아이디어를 분석합니다"}
        </p>
      </div>

      {/* Quick stack presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">빠른 선택</label>
        <div className="flex flex-wrap gap-2">
          {STACK_PRESETS.map((preset) => {
            const isActive = data.tech.tech_stack === preset.techs.join(", ");
            return (
              <button key={preset.label} type="button" onClick={() => update("tech", "tech_stack", preset.techs.join(", "))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                    : "bg-[#1a1a26] border-[#2a2a3a] text-slate-400 hover:text-slate-200 hover:border-slate-500"
                }`}>
                <span className="mr-1">{preset.icon}</span>{preset.label}
              </button>
            );
          })}
        </div>
      </div>
      <GroupedChipSelect label="기술 스택 (개별 선택)" value={data.tech.tech_stack} onChange={(v) => update("tech", "tech_stack", v)} groups={TECH_GROUPS} required />
      <SelectInput label="Git 전략" value={data.tech.git_strategy} onChange={(v) => update("tech", "git_strategy", v)} options={GIT_OPTIONS} />
      <ChipSelect label="배포 방식" value={data.tech.deployment} onChange={(v) => update("tech", "deployment", v)} options={DEPLOY_PRESETS} allowCustom />
      <ChipListSelect label="환경 구성 (dev 포함 필수)" items={data.tech.envs} onChange={(v) => update("tech", "envs", v)} presets={ENV_PRESETS} required />
      <ChipSelect label="CI/CD 도구" value={data.tech.cicd_tools} onChange={(v) => update("tech", "cicd_tools", v)} options={CICD_PRESETS} allowCustom />
    </div>,

    // 3: Claude 규칙
    <div key="3" className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300">Do / Don&apos;t 규칙</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-400">DO (해야 할 것)</div>
            <div className="flex flex-wrap gap-1.5">
              {DO_PRESETS.map((opt) => {
                const doList = data.claude_rules.do_dont.split("\n").filter(l => l.startsWith("DO:")).join("") + data.claude_rules.do_dont;
                const isOn = doList.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => {
                    const lines = data.claude_rules.do_dont ? data.claude_rules.do_dont.split("\n") : [];
                    if (isOn) { update("claude_rules", "do_dont", lines.filter(l => !l.includes(opt)).join("\n")); }
                    else { update("claude_rules", "do_dont", [...lines, `DO: ${opt}`].filter(Boolean).join("\n")); }
                  }}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${isOn ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-[#1a1a26] border-[#2a2a3a] text-slate-500 hover:text-slate-300 hover:border-slate-500"}`}>
                    {isOn && <span className="mr-1">&#10003;</span>}{opt}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-red-400">DON&apos;T (하지 말 것)</div>
            <div className="flex flex-wrap gap-1.5">
              {DONT_PRESETS.map((opt) => {
                const isOn = data.claude_rules.do_dont.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => {
                    const lines = data.claude_rules.do_dont ? data.claude_rules.do_dont.split("\n") : [];
                    if (isOn) { update("claude_rules", "do_dont", lines.filter(l => !l.includes(opt)).join("\n")); }
                    else { update("claude_rules", "do_dont", [...lines, `DON'T: ${opt}`].filter(Boolean).join("\n")); }
                  }}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${isOn ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-[#1a1a26] border-[#2a2a3a] text-slate-500 hover:text-slate-300 hover:border-slate-500"}`}>
                    {isOn && <span className="mr-1">&#10003;</span>}{opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <SelectInput label="태스크 분할 규칙" value={data.claude_rules.task_slicing_rule} onChange={(v) => update("claude_rules", "task_slicing_rule", v)} options={TASK_SLICE_OPTIONS} />
      <ChipSelect label="품질 게이트 (통과 조건)" value={data.claude_rules.quality_gates} onChange={(v) => update("claude_rules", "quality_gates", v)} options={QUALITY_GATE_PRESETS} allowCustom />
      <SelectInput label="실험 vs 프로덕션 구분" value={data.claude_rules.experiment_vs_product} onChange={(v) => update("claude_rules", "experiment_vs_product", v)} options={EXP_VS_PROD_OPTIONS} />
      <ChipSelect label="관측성(Observability)" value={data.claude_rules.observability_rules} onChange={(v) => update("claude_rules", "observability_rules", v)} options={OBSERVABILITY_PRESETS} allowCustom />
    </div>,

    // 4: 정책
    <div key="4" className="space-y-5">
      <ChipSelect label="의사결정 정책" value={data.policies.decision_policy} onChange={(v) => update("policies", "decision_policy", v)} options={DECISION_PRESETS} allowCustom />
      <ChipSelect label="리뷰 정책" value={data.policies.review_policy} onChange={(v) => update("policies", "review_policy", v)} options={REVIEW_PRESETS} allowCustom />
      <ChipSelect label="보안 정책" value={data.policies.security_policy} onChange={(v) => update("policies", "security_policy", v)} options={SECURITY_PRESETS} allowCustom />
    </div>,

    // 5: 템플릿 스타일
    <div key="5" className="space-y-5">
      <p className="text-xs text-slate-500">각 항목에서 프리셋을 선택하거나 &quot;직접 입력&quot;으로 커스텀할 수 있습니다.</p>
      <SelectInput label="이슈 템플릿" value={data.template_styles.issue_template_style} onChange={(v) => update("template_styles", "issue_template_style", v)} options={ISSUE_OPTIONS} />
      <SelectInput label="ADR (Architecture Decision Record) 템플릿" value={data.template_styles.adr_template_style} onChange={(v) => update("template_styles", "adr_template_style", v)} options={ADR_OPTIONS} />
      <SelectInput label="PR 템플릿" value={data.template_styles.pr_template_style} onChange={(v) => update("template_styles", "pr_template_style", v)} options={PR_OPTIONS} />
      <SelectInput label="테스트 계획" value={data.template_styles.test_plan_style} onChange={(v) => update("template_styles", "test_plan_style", v)} options={TEST_PLAN_OPTIONS} />
      <SelectInput label="릴리스 템플릿" value={data.template_styles.release_template_style} onChange={(v) => update("template_styles", "release_template_style", v)} options={RELEASE_OPTIONS} />
    </div>,
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">V</div>
            <h1 className="text-base font-semibold text-slate-100">vibe-promptgen</h1>
            <span className="text-xs text-slate-500 hidden sm:inline">개발 프로세스 정의서 프롬프트 생성기</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setData(structuredClone(SAMPLE_DATA))} className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors">샘플 데이터</button>
            <button onClick={() => setData(structuredClone(DEFAULTS))} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-500/10 border border-slate-500/20 transition-colors">초기화</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => handleImport("profile")} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">Profile 가져오기</button>
          <button onClick={() => handleImport("project")} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">Project 가져오기</button>
          <button onClick={handleExportYaml} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">YAML 내보내기</button>
          {hasErrors && <span className="ml-auto text-xs text-red-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />필수 입력 {result.errors.length}개 누락</span>}
          {!hasErrors && result.decisionNeeded.length > 0 && <span className="ml-auto text-xs text-yellow-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />결정 필요 {result.decisionNeeded.length}개</span>}
          {!hasErrors && result.decisionNeeded.length === 0 && <span className="ml-auto text-xs text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />모든 항목 입력 완료</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
            <div className="border-b border-[#1e1e2e] overflow-x-auto">
              <div className="flex min-w-max">
                {TAB_LABELS.map((label, i) => (
                  <button key={i} onClick={() => setTab(i)}
                    className={`px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${tab === i ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5" : "text-slate-500 hover:text-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(100vh-260px)]">{tabContent[tab]}</div>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden flex flex-col">
            <div className="border-b border-[#1e1e2e] px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">미리보기</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">{copied ? "복사됨!" : "복사"}</button>
                <button onClick={handleDownload} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">다운로드</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 max-h-[600px] lg:max-h-[calc(100vh-260px)]">
              <pre ref={previewRef} className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">{result.promptText || "왼쪽 폼에 입력하면 여기에 실시간으로 프롬프트가 생성됩니다."}</pre>
            </div>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">필수 입력 누락</h3>
            <ul className="space-y-1">{result.errors.map((e, i) => (<li key={i} className="text-xs text-red-300/80">{e.field}: {e.message}</li>))}</ul>
          </div>
        )}

        {/* LLM Draft */}
        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
          <button onClick={() => setShowDraft(!showDraft)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#16161f] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">AI</div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-200">LLM 문서 초안 생성</div>
                <div className="text-xs text-slate-500">OpenAI / Anthropic API로 프로세스 정의서 초안을 자동 생성합니다</div>
              </div>
            </div>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${showDraft ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showDraft && (
            <div className="border-t border-[#1e1e2e] p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Provider</label>
                  <select value={draftProvider} onChange={(e) => setDraftProvider(e.target.value as "openai" | "anthropic")} className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500">
                    <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Model</label>
                  <input type="text" value={draftModel} onChange={(e) => setDraftModel(e.target.value)} placeholder={draftProvider === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514"} className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Temperature</label>
                  <input type="number" min={0} max={2} step={0.1} value={draftTemp} onChange={(e) => setDraftTemp(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Max Tokens</label>
                  <input type="number" min={100} max={16000} step={100} value={draftMaxTokens} onChange={(e) => setDraftMaxTokens(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">API Key</label>
                <input type="password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} placeholder={draftProvider === "openai" ? "sk-..." : "sk-ant-..."} className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-sm outline-none focus:border-blue-500" />
                <p className="text-xs text-slate-600">키는 서버에 저장되지 않으며 1회 호출 후 폐기됩니다.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleDraft(false)} disabled={draftLoading || hasErrors} className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all">{draftLoading ? "생성 중..." : "문서 초안 생성"}</button>
                <button onClick={() => handleDraft(true)} disabled={draftLoading} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-[#1a1a26] border border-[#2a2a3a] hover:border-slate-500 transition-colors">Dry Run</button>
                {hasErrors && <span className="text-xs text-red-400">필수 입력을 먼저 채워주세요.</span>}
              </div>
              {draftError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">{draftError}</div>}
              {draftResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-400">생성 완료</span>
                    <div className="flex items-center gap-2">
                      <button onClick={async () => { await navigator.clipboard.writeText(draftResult); }} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">복사</button>
                      <button onClick={() => { const b = new Blob([draftResult], { type: "text/markdown" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "draft.md"; a.click(); URL.revokeObjectURL(u); }} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">다운로드</button>
                    </div>
                  </div>
                  <div className="bg-[#0a0a0f] rounded-lg border border-[#1e1e2e] overflow-auto max-h-[500px] p-4">
                    <pre className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">{draftResult}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#1e1e2e] mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-600">
          <span>vibe-promptgen v0.1.0</span>
          <a href="https://github.com/2riing/vibe-promptgen-web" target="_blank" rel="noopener" className="hover:text-slate-400 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
