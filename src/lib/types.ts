export interface DocMeta {
  doc_title: string;
  scope: string;
  audience: string;
  work_mode: string;
}

export interface Context {
  product_one_liner: string;
  core_scenarios: string[];
  quality_bars: string;
  top_risks: string[];
}

export interface Tech {
  tech_stack: string;
  git_strategy: string;
  deployment: string;
  envs: string[];
  cicd_tools: string;
}

export interface ClaudeRules {
  do_dont: string;
  task_slicing_rule: string;
  quality_gates: string;
  experiment_vs_product: string;
  observability_rules: string;
}

export interface Policies {
  decision_policy: string;
  review_policy: string;
  security_policy: string;
}

export interface TemplateStyles {
  issue_template_style: string;
  adr_template_style: string;
  pr_template_style: string;
  test_plan_style: string;
  release_template_style: string;
}

export interface InputData {
  doc_meta: DocMeta;
  context: Context;
  tech: Tech;
  claude_rules: ClaudeRules;
  policies: Policies;
  template_styles: TemplateStyles;
}

export interface ValidationMessage {
  level: "error" | "warn";
  field: string;
  message: string;
}

export interface GenerateResult {
  promptText: string;
  decisionNeeded: string[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

export interface DraftRequest {
  prompt_text: string;
  provider: "openai" | "anthropic";
  model: string;
  api_key: string;
  temperature: number;
  max_tokens: number;
}

export interface DraftResponse {
  content: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  error?: string;
}

export const TAB_LABELS = [
  "기본 정보",
  "컨텍스트",
  "기술 스택",
  "Claude 규칙",
  "정책",
  "템플릿 스타일",
] as const;
