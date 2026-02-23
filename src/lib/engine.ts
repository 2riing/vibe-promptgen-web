import type { InputData, GenerateResult, ValidationMessage } from "./types";

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

interface RequiredRule {
  type: "str" | "list" | "str_or_list";
  minLen?: number;
  mustContain?: string;
}

const REQUIRED: Record<string, RequiredRule> = {
  "context.product_one_liner": { type: "str" },
  "context.core_scenarios": { type: "list", minLen: 2 },
  "context.top_risks": { type: "list", minLen: 2 },
  "tech.tech_stack": { type: "str_or_list" },
  "tech.deployment": { type: "str" },
  "tech.envs": { type: "list", minLen: 1, mustContain: "dev" },
};

function getNestedValue(data: InputData, path: string): unknown {
  const [section, field] = path.split(".") as [keyof InputData, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data[section] as any)?.[field];
}

export function validate(data: InputData) {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];

  for (const [path, rule] of Object.entries(REQUIRED)) {
    const val = getNestedValue(data, path);

    if (val === undefined || val === null || val === "") {
      errors.push({ level: "error", field: path, message: "필수 입력이 누락되었습니다." });
      continue;
    }

    if (rule.type === "list") {
      if (!Array.isArray(val) || val.length === 0) {
        errors.push({ level: "error", field: path, message: "리스트가 비어 있습니다." });
        continue;
      }
      if (rule.minLen && val.length < rule.minLen) {
        errors.push({
          level: "error",
          field: path,
          message: `최소 ${rule.minLen}개 항목이 필요합니다. (현재 ${val.length}개)`,
        });
        continue;
      }
      if (rule.mustContain && !val.includes(rule.mustContain)) {
        errors.push({
          level: "error",
          field: path,
          message: `'${rule.mustContain}' 항목이 포함되어야 합니다.`,
        });
      }
    }
  }

  // Warn for empty optional fields
  const OPTIONAL_FIELDS = [
    "doc_meta.idea", "doc_meta.doc_title", "doc_meta.scope", "doc_meta.audience", "doc_meta.work_mode",
    "context.quality_bars", "claude_rules.do_dont", "claude_rules.task_slicing_rule",
    "claude_rules.quality_gates", "claude_rules.experiment_vs_product", "claude_rules.observability_rules",
    "policies.decision_policy", "policies.review_policy", "policies.security_policy",
  ];
  for (const path of OPTIONAL_FIELDS) {
    if (path in REQUIRED) continue;
    const val = getNestedValue(data, path);
    if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
      warnings.push({ level: "warn", field: path, message: "미입력 — 결정 필요로 표시됩니다." });
    }
  }

  return { errors, warnings };
}

/* ------------------------------------------------------------------ */
/*  Generate — Claude Code optimized CLAUDE.md format                   */
/* ------------------------------------------------------------------ */

function bullets(val: unknown): string {
  if (!val) return "";
  if (Array.isArray(val)) return val.filter(Boolean).map((v) => `- ${v}`).join("\n");
  if (typeof val === "string" && val.includes(", ")) return val.split(", ").filter(Boolean).map((v) => `- ${v}`).join("\n");
  if (typeof val === "string") return val;
  return String(val ?? "");
}

function inline(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "string") return val;
  return String(val ?? "");
}

function section(title: string, content: string): string {
  if (!content.trim()) return "";
  return `\n### ${title}\n${content}\n`;
}

export function generate(data: InputData): GenerateResult {
  const { errors, warnings } = validate(data);
  const decisionNeeded: string[] = [];

  const need = (label: string, val: unknown): string => {
    const s = inline(val);
    if (!s.trim()) { decisionNeeded.push(label); return `[결정 필요]`; }
    return s;
  };

  // Parse DO / DON'T
  const doLines: string[] = [];
  const dontLines: string[] = [];
  if (data.claude_rules.do_dont) {
    for (const line of data.claude_rules.do_dont.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DO:")) doLines.push(trimmed.replace(/^DO:\s*/, ""));
      else if (trimmed.startsWith("DON'T:")) dontLines.push(trimmed.replace(/^DON'T:\s*/, ""));
    }
  }

  const lines: string[] = [];
  const push = (...s: string[]) => lines.push(...s);

  // Header
  const title = data.doc_meta.doc_title || "CLAUDE.md";
  push(`# ${title}`, "");

  if (data.context.product_one_liner) {
    push(`> ${data.context.product_one_liner}`, "");
  }

  // Project Idea
  if (data.doc_meta.idea) {
    push("## Project Overview", "", data.doc_meta.idea, "");
  }

  // Scope & Meta
  push("## Scope", "");
  push(`- **범위**: ${need("범위", data.doc_meta.scope)}`);
  push(`- **대상**: ${need("대상 독자", data.doc_meta.audience)}`);
  push(`- **작업 방식**: ${need("작업 방식", data.doc_meta.work_mode)}`);
  push("");

  // Core Scenarios
  if (data.context.core_scenarios.length) {
    push("## Core Scenarios", "", bullets(data.context.core_scenarios), "");
  }

  // Tech Stack
  push("## Tech Stack", "");
  push(`- **Stack**: ${need("기술 스택", data.tech.tech_stack)}`);
  push(`- **Git**: ${need("Git 전략", data.tech.git_strategy)}`);
  push(`- **Deploy**: ${need("배포", data.tech.deployment)}`);
  push(`- **Environments**: ${need("환경", data.tech.envs)}`);
  push(`- **CI/CD**: ${need("CI/CD", data.tech.cicd_tools)}`);
  push("");

  // Rules — MUST / MUST NOT
  push("---", "", "## Rules", "");

  if (doLines.length) {
    push("### MUST");
    push(doLines.map((d) => `- ${d}`).join("\n"));
    push("");
  }

  if (dontLines.length) {
    push("### MUST NOT");
    push(dontLines.map((d) => `- ${d}`).join("\n"));
    push("");
  }

  if (!doLines.length && !dontLines.length) {
    decisionNeeded.push("Do/Don't 규칙");
  }

  // Task Sizing
  if (data.claude_rules.task_slicing_rule) {
    push("### Task Sizing");
    push(`- ${data.claude_rules.task_slicing_rule}`, "");
  }

  // Quality Gates
  if (data.claude_rules.quality_gates) {
    push("### Quality Gates (PR merge 조건)");
    push(bullets(data.claude_rules.quality_gates), "");
  }

  // Experiment vs Production
  if (data.claude_rules.experiment_vs_product) {
    push("### Experiment vs Production");
    push(`- ${data.claude_rules.experiment_vs_product}`, "");
  }

  // Policies
  const hasPolicy = data.claude_rules.observability_rules || data.policies.security_policy || data.policies.decision_policy || data.policies.review_policy;
  if (hasPolicy) {
    push("---", "", "## Policies", "");
  }

  if (data.claude_rules.observability_rules) {
    push("### Observability");
    push(bullets(data.claude_rules.observability_rules), "");
  }
  if (data.policies.security_policy) {
    push("### Security");
    push(bullets(data.policies.security_policy), "");
  }
  if (data.policies.decision_policy) {
    push("### Decision Making");
    push(bullets(data.policies.decision_policy), "");
  }
  if (data.policies.review_policy) {
    push("### Code Review");
    push(bullets(data.policies.review_policy), "");
  }

  // Quality & Risks
  if (data.context.quality_bars || data.context.top_risks.length) {
    push("---", "", "## Quality & Risks", "");
    if (data.context.quality_bars) {
      push("### Quality Standards");
      push(bullets(data.context.quality_bars), "");
    }
    if (data.context.top_risks.length) {
      push("### Key Risks");
      push(bullets(data.context.top_risks), "");
    }
  }

  // Templates
  const ts = data.template_styles;
  const hasTemplates = ts.issue_template_style || ts.adr_template_style || ts.pr_template_style || ts.test_plan_style || ts.release_template_style;
  if (hasTemplates) {
    push("---", "", "## Templates", "");
    if (ts.issue_template_style) push("### Issue Template", "", ts.issue_template_style, "");
    if (ts.adr_template_style) push("### ADR Template", "", ts.adr_template_style, "");
    if (ts.pr_template_style) push("### PR Template", "", ts.pr_template_style, "");
    if (ts.test_plan_style) push("### Test Plan", "", ts.test_plan_style, "");
    if (ts.release_template_style) push("### Release Notes", "", ts.release_template_style, "");
  }

  // Decision needed appendix
  if (decisionNeeded.length) {
    push("---", "", "## TODO (결정 필요)", "");
    push(decisionNeeded.map((v) => `- [ ] ${v}`).join("\n"), "");
  }

  return {
    promptText: lines.join("\n"),
    decisionNeeded,
    errors,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  Merge (import YAML/JSON)                                           */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepMerge(base: any, override: any): any {
  if (!override || typeof override !== "object" || Array.isArray(override)) return override ?? base;
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) continue;
    if (typeof val === "object" && !Array.isArray(val) && typeof result[key] === "object") {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
