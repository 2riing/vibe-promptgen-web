import type { InputData, GenerateResult, ValidationMessage } from "./types";
import { DEFAULT_TEMPLATE } from "./defaults";

/* ------------------------------------------------------------------ */
/*  Field → Template variable mapping                                  */
/* ------------------------------------------------------------------ */

const FIELD_MAP: Record<string, string> = {
  "doc_meta.idea": "IDEA",
  "doc_meta.doc_title": "DOC_TITLE",
  "doc_meta.scope": "SCOPE",
  "doc_meta.audience": "AUDIENCE",
  "doc_meta.work_mode": "WORK_MODE",
  "context.product_one_liner": "PRODUCT_ONE_LINER",
  "context.core_scenarios": "CORE_SCENARIOS",
  "context.quality_bars": "QUALITY_BARS",
  "context.top_risks": "TOP_RISKS",
  "tech.tech_stack": "TECH_STACK",
  "tech.git_strategy": "GIT_STRATEGY",
  "tech.deployment": "DEPLOYMENT",
  "tech.envs": "ENVS",
  "tech.cicd_tools": "CICD_TOOLS",
  "claude_rules.do_dont": "DO_DONT",
  "claude_rules.task_slicing_rule": "TASK_SLICING_RULE",
  "claude_rules.quality_gates": "QUALITY_GATES",
  "claude_rules.experiment_vs_product": "EXPERIMENT_VS_PRODUCT",
  "claude_rules.observability_rules": "OBSERVABILITY_RULES",
  "policies.decision_policy": "DECISION_POLICY",
  "policies.review_policy": "REVIEW_POLICY",
  "policies.security_policy": "SECURITY_POLICY",
  "template_styles.issue_template_style": "ISSUE_TEMPLATE_STYLE",
  "template_styles.adr_template_style": "ADR_TEMPLATE_STYLE",
  "template_styles.pr_template_style": "PR_TEMPLATE_STYLE",
  "template_styles.test_plan_style": "TEST_PLAN_STYLE",
  "template_styles.release_template_style": "RELEASE_TEMPLATE_STYLE",
};

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
  for (const path of Object.keys(FIELD_MAP)) {
    if (path in REQUIRED) continue;
    const val = getNestedValue(data, path);
    if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
      warnings.push({ level: "warn", field: path, message: "미입력 — 결정 필요로 표시됩니다." });
    }
  }

  return { errors, warnings };
}

/* ------------------------------------------------------------------ */
/*  Template substitution                                              */
/* ------------------------------------------------------------------ */

function formatValue(val: unknown): string {
  if (Array.isArray(val)) {
    return val.length ? val.map((v) => `- ${v}`).join("\n") : "";
  }
  if (typeof val === "string") return val;
  return String(val ?? "");
}

export function generate(data: InputData): GenerateResult {
  const { errors, warnings } = validate(data);

  // Build variable map
  const varMap: Record<string, string> = {};
  for (const [path, varName] of Object.entries(FIELD_MAP)) {
    varMap[varName] = formatValue(getNestedValue(data, path));
  }

  const decisionNeeded: string[] = [];
  const promptText = DEFAULT_TEMPLATE.replace(/\{([A-Z_]+)\}/g, (_, varName: string) => {
    const val = varMap[varName];
    if (!val || !val.trim()) {
      decisionNeeded.push(varName);
      return `[결정 필요: ${varName}]`;
    }
    return val;
  });

  // Append decision-needed & warnings
  let appendix = "";
  if (decisionNeeded.length) {
    appendix += "\n---\n\n## [결정 필요 항목]\n\n";
    appendix += decisionNeeded.map((v) => `- [ ] ${v}`).join("\n") + "\n";
  }
  if (warnings.length) {
    appendix += "\n---\n\n## [경고 목록]\n\n";
    appendix += warnings.map((w) => `- ${w.field}: ${w.message}`).join("\n") + "\n";
  }

  return {
    promptText: promptText + appendix,
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
