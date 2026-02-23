"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import yaml from "js-yaml";
import type { InputData, DraftResponse } from "@/lib/types";
import { TAB_LABELS } from "@/lib/types";
import { DEFAULTS, SAMPLE_DATA } from "@/lib/defaults";
import { generate, deepMerge } from "@/lib/engine";

/* ================================================================== */
/*  Reusable UI atoms                                                  */
/* ================================================================== */

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-blue-400 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm leading-relaxed"
      />
    </div>
  );
}

function ListInput({
  label,
  items,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v) {
      onChange([...items, v]);
      setDraft("");
    }
  };
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-blue-400 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          +
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-blue-400 hover:text-red-400 transition-colors"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */

export default function Home() {
  const [data, setData] = useState<InputData>(structuredClone(DEFAULTS));
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);

  // --- Draft state ---
  const [draftProvider, setDraftProvider] = useState<"openai" | "anthropic">("openai");
  const [draftModel, setDraftModel] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [draftTemp, setDraftTemp] = useState(0.2);
  const [draftMaxTokens, setDraftMaxTokens] = useState(4000);
  const [draftResult, setDraftResult] = useState<string>("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");

  // --- computed ---
  const result = useMemo(() => generate(data), [data]);
  const hasErrors = result.errors.length > 0;

  // --- helpers ---
  const update = useCallback(
    <S extends keyof InputData>(section: S, field: keyof InputData[S], value: InputData[S][keyof InputData[S]]) => {
      setData((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
    },
    []
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.promptText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (type: "profile" | "project") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const parsed = file.name.endsWith(".json") ? JSON.parse(text) : yaml.load(text);
          setData((prev) => deepMerge(prev, parsed as Partial<InputData>));
        } catch {
          alert("파일 파싱에 실패했습니다. YAML/JSON 형식을 확인하세요.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportYaml = () => {
    const text = yaml.dump(data, { lineWidth: -1, noRefs: true });
    const blob = new Blob([text], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDraft = async (dryRun = false) => {
    if (!draftKey.trim()) {
      setDraftError("API key를 입력하세요.");
      return;
    }
    setDraftLoading(true);
    setDraftError("");
    setDraftResult("");
    try {
      const resp = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_text: result.promptText,
          provider: draftProvider,
          model: draftModel || (draftProvider === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514"),
          api_key: draftKey,
          temperature: draftTemp,
          max_tokens: draftMaxTokens,
          dry_run: dryRun,
        }),
      });
      const json: DraftResponse = await resp.json();
      if (json.error) {
        setDraftError(json.error);
      } else {
        setDraftResult(json.content);
      }
    } catch (e) {
      setDraftError(`요청 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleDraftCopy = async () => {
    await navigator.clipboard.writeText(draftResult);
  };

  const handleDraftDownload = () => {
    const blob = new Blob([draftResult], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------------------- */
  /*  Tab contents                                                     */
  /* ---------------------------------------------------------------- */

  const tabContent = [
    // 0: 기본 정보
    <div key="0" className="space-y-4">
      <TextInput label="문서 제목" value={data.doc_meta.doc_title} onChange={(v) => update("doc_meta", "doc_title", v)} placeholder="예: 내 프로젝트 개발 프로세스 정의서" />
      <TextInput label="범위" value={data.doc_meta.scope} onChange={(v) => update("doc_meta", "scope", v)} placeholder="예: MVP v1.0 개발 범위" />
      <TextInput label="대상 독자" value={data.doc_meta.audience} onChange={(v) => update("doc_meta", "audience", v)} placeholder="예: 개발팀 (백엔드 + 프론트엔드)" />
      <TextInput label="작업 방식" value={data.doc_meta.work_mode} onChange={(v) => update("doc_meta", "work_mode", v)} placeholder="바이브코딩 (Claude Code 활용)" />
    </div>,

    // 1: 컨텍스트
    <div key="1" className="space-y-4">
      <TextInput label="제품 한줄 설명" value={data.context.product_one_liner} onChange={(v) => update("context", "product_one_liner", v)} placeholder="예: 실시간 협업 문서 편집기" required />
      <ListInput label="핵심 시나리오 (최소 2개)" items={data.context.core_scenarios} onChange={(v) => update("context", "core_scenarios", v)} placeholder="시나리오를 입력하고 Enter" required />
      <TextInput label="품질 기준" value={data.context.quality_bars} onChange={(v) => update("context", "quality_bars", v)} placeholder="예: 응답시간 < 200ms, 가용성 99.9%" />
      <ListInput label="주요 리스크 (최소 2개)" items={data.context.top_risks} onChange={(v) => update("context", "top_risks", v)} placeholder="리스크를 입력하고 Enter" required />
    </div>,

    // 2: 기술 스택
    <div key="2" className="space-y-4">
      <TextInput label="기술 스택" value={data.tech.tech_stack} onChange={(v) => update("tech", "tech_stack", v)} placeholder="예: TypeScript, Next.js, PostgreSQL" required />
      <TextInput label="Git 전략" value={data.tech.git_strategy} onChange={(v) => update("tech", "git_strategy", v)} placeholder="GitHub Flow (main + feature branches)" />
      <TextInput label="배포 방식" value={data.tech.deployment} onChange={(v) => update("tech", "deployment", v)} placeholder="예: Docker + AWS ECS" required />
      <ListInput label="환경 구성 (dev 포함 필수)" items={data.tech.envs} onChange={(v) => update("tech", "envs", v)} placeholder="예: dev, staging, prod" required />
      <TextInput label="CI/CD 도구" value={data.tech.cicd_tools} onChange={(v) => update("tech", "cicd_tools", v)} placeholder="예: GitHub Actions" />
    </div>,

    // 3: Claude 규칙
    <div key="3" className="space-y-4">
      <TextArea label="Do / Don't" value={data.claude_rules.do_dont} onChange={(v) => update("claude_rules", "do_dont", v)} placeholder="DO: ...\nDON'T: ..." rows={4} />
      <TextArea label="태스크 분할 규칙" value={data.claude_rules.task_slicing_rule} onChange={(v) => update("claude_rules", "task_slicing_rule", v)} placeholder="예: 하나의 PR은 하나의 기능/버그만 포함" />
      <TextArea label="품질 게이트" value={data.claude_rules.quality_gates} onChange={(v) => update("claude_rules", "quality_gates", v)} placeholder="예: lint + unit test + type check 통과 필수" />
      <TextArea label="실험 vs 프로덕션 구분" value={data.claude_rules.experiment_vs_product} onChange={(v) => update("claude_rules", "experiment_vs_product", v)} placeholder="예: 실험은 experiment/ 브랜치" />
      <TextArea label="관측성(Observability) 규칙" value={data.claude_rules.observability_rules} onChange={(v) => update("claude_rules", "observability_rules", v)} placeholder="예: 구조화 로깅 필수, Sentry 연동" />
    </div>,

    // 4: 정책
    <div key="4" className="space-y-4">
      <TextArea label="의사결정 정책" value={data.policies.decision_policy} onChange={(v) => update("policies", "decision_policy", v)} placeholder="예: ADR로 기록, 72시간 내 리뷰" />
      <TextArea label="리뷰 정책" value={data.policies.review_policy} onChange={(v) => update("policies", "review_policy", v)} placeholder="예: 최소 1인 승인, 셀프머지 금지" />
      <TextArea label="보안 정책" value={data.policies.security_policy} onChange={(v) => update("policies", "security_policy", v)} placeholder="예: 시크릿은 환경변수, 의존성 주간 스캔" />
    </div>,

    // 5: 템플릿 스타일
    <div key="5" className="space-y-4">
      <TextInput label="이슈 템플릿" value={data.template_styles.issue_template_style} onChange={(v) => update("template_styles", "issue_template_style", v)} placeholder="예: 문제/원인/해결 3단 구조" />
      <TextInput label="ADR 템플릿" value={data.template_styles.adr_template_style} onChange={(v) => update("template_styles", "adr_template_style", v)} placeholder="예: 상태/컨텍스트/결정/결과 4단 구조" />
      <TextInput label="PR 템플릿" value={data.template_styles.pr_template_style} onChange={(v) => update("template_styles", "pr_template_style", v)} placeholder="예: 변경사항/테스트/체크리스트" />
      <TextInput label="테스트 계획" value={data.template_styles.test_plan_style} onChange={(v) => update("template_styles", "test_plan_style", v)} placeholder="예: 시나리오/기대결과/실행조건" />
      <TextInput label="릴리스 템플릿" value={data.template_styles.release_template_style} onChange={(v) => update("template_styles", "release_template_style", v)} placeholder="예: 버전/변경로그/롤백 계획" />
    </div>,
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">V</div>
            <h1 className="text-base font-semibold text-slate-100">vibe-promptgen</h1>
            <span className="text-xs text-slate-500 hidden sm:inline">개발 프로세스 정의서 프롬프트 생성기</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setData(structuredClone(SAMPLE_DATA))} className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors">
              샘플 데이터
            </button>
            <button onClick={() => setData(structuredClone(DEFAULTS))} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-500/10 border border-slate-500/20 transition-colors">
              초기화
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Import / Export bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => handleImport("profile")} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">
            Profile 가져오기
          </button>
          <button onClick={() => handleImport("project")} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">
            Project 가져오기
          </button>
          <button onClick={handleExportYaml} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#12121a] border border-[#2a2a3a] hover:border-slate-500 transition-colors">
            YAML 내보내기
          </button>
          {hasErrors && (
            <span className="ml-auto text-xs text-red-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              필수 입력 {result.errors.length}개 누락
            </span>
          )}
          {!hasErrors && result.decisionNeeded.length > 0 && (
            <span className="ml-auto text-xs text-yellow-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              결정 필요 {result.decisionNeeded.length}개
            </span>
          )}
          {!hasErrors && result.decisionNeeded.length === 0 && (
            <span className="ml-auto text-xs text-green-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              모든 항목 입력 완료
            </span>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-[#1e1e2e] overflow-x-auto">
              <div className="flex min-w-max">
                {TAB_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setTab(i)}
                    className={`px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                      tab === i
                        ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-5">{tabContent[tab]}</div>
          </div>

          {/* Right: Preview */}
          <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden flex flex-col">
            <div className="border-b border-[#1e1e2e] px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">미리보기</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">
                  {copied ? "복사됨!" : "복사"}
                </button>
                <button onClick={handleDownload} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">
                  다운로드
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 max-h-[600px] lg:max-h-[calc(100vh-280px)]">
              <pre ref={previewRef} className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">
                {result.promptText || "왼쪽 폼에 입력하면 여기에 실시간으로 프롬프트가 생성됩니다."}
              </pre>
            </div>
          </div>
        </div>

        {/* Validation errors */}
        {result.errors.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">필수 입력 누락</h3>
            <ul className="space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-300/80">{e.field}: {e.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* LLM Draft Section */}
        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#16161f] transition-colors"
          >
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
                {/* Provider */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Provider</label>
                  <select
                    value={draftProvider}
                    onChange={(e) => setDraftProvider(e.target.value as "openai" | "anthropic")}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Model</label>
                  <input
                    type="text"
                    value={draftModel}
                    onChange={(e) => setDraftModel(e.target.value)}
                    placeholder={draftProvider === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514"}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {/* Temp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Temperature</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={draftTemp}
                    onChange={(e) => setDraftTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {/* Max tokens */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Max Tokens</label>
                  <input
                    type="number"
                    min={100}
                    max={16000}
                    step={100}
                    value={draftMaxTokens}
                    onChange={(e) => setDraftMaxTokens(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">API Key</label>
                <input
                  type="password"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder={draftProvider === "openai" ? "sk-..." : "sk-ant-..."}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3a] text-slate-100 placeholder:text-slate-600 text-sm outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-600">키는 서버에 저장되지 않으며 1회 호출 후 폐기됩니다.</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDraft(false)}
                  disabled={draftLoading || hasErrors}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                >
                  {draftLoading ? "생성 중..." : "문서 초안 생성"}
                </button>
                <button
                  onClick={() => handleDraft(true)}
                  disabled={draftLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-[#1a1a26] border border-[#2a2a3a] hover:border-slate-500 transition-colors"
                >
                  Dry Run
                </button>
                {hasErrors && <span className="text-xs text-red-400">필수 입력을 먼저 채워주세요.</span>}
              </div>

              {/* Error */}
              {draftError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">{draftError}</div>
              )}

              {/* Result */}
              {draftResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-400">생성 완료</span>
                    <div className="flex items-center gap-2">
                      <button onClick={handleDraftCopy} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">복사</button>
                      <button onClick={handleDraftDownload} className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#1a1a26] hover:bg-[#22222e] border border-[#2a2a3a] transition-colors">다운로드</button>
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

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-600">
          <span>vibe-promptgen v0.1.0</span>
          <a href="https://github.com/2riing/vibe-promptgen" target="_blank" rel="noopener" className="hover:text-slate-400 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
