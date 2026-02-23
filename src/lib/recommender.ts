"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = any;
const loadPipeline = () => import("@huggingface/transformers").then((m) => m.pipeline);

/* ------------------------------------------------------------------ */
/*  Tech items with English descriptions for embedding similarity      */
/* ------------------------------------------------------------------ */

const TECH_ITEMS: { name: string; desc: string }[] = [
  // Frontend
  { name: "React", desc: "web frontend UI component library SPA single page application interactive" },
  { name: "Next.js", desc: "React fullstack framework SSR SSG server rendering web application" },
  { name: "Vue", desc: "web frontend progressive framework reactive UI SPA" },
  { name: "Nuxt", desc: "Vue fullstack framework SSR SSG server rendering" },
  { name: "Svelte", desc: "web frontend compiler lightweight fast UI reactive" },
  { name: "Angular", desc: "web frontend enterprise framework TypeScript large scale application" },
  { name: "Tailwind CSS", desc: "CSS utility-first styling design system web frontend" },
  { name: "TypeScript", desc: "typed JavaScript static analysis type safety programming language" },
  // Backend
  { name: "Node.js", desc: "JavaScript server runtime backend API event-driven" },
  { name: "Express", desc: "Node.js minimal web framework REST API backend server" },
  { name: "Fastify", desc: "Node.js fast web framework high performance REST API backend" },
  { name: "Hono", desc: "lightweight edge web framework fast API serverless realtime" },
  { name: "Django", desc: "Python web framework full-featured admin ORM backend" },
  { name: "FastAPI", desc: "Python async fast API framework OpenAPI automatic docs" },
  { name: "Spring Boot", desc: "Java enterprise backend framework microservice large scale" },
  { name: "Go", desc: "Go golang backend concurrent high performance systems programming" },
  { name: "Rust", desc: "Rust systems programming performance safety backend low-level" },
  // Mobile
  { name: "React Native", desc: "mobile app iOS Android cross-platform JavaScript React native" },
  { name: "Expo", desc: "React Native development platform mobile app build deploy" },
  { name: "Flutter", desc: "mobile app iOS Android cross-platform Dart Google widget UI" },
  { name: "Swift", desc: "iOS Apple native mobile app development" },
  { name: "Kotlin", desc: "Android native mobile app development JVM" },
  { name: "Capacitor", desc: "hybrid mobile app web technology iOS Android wrapper" },
  // Database
  { name: "PostgreSQL", desc: "relational database SQL ACID advanced query JSON" },
  { name: "MySQL", desc: "relational database SQL popular web application" },
  { name: "MongoDB", desc: "NoSQL document database flexible schema JSON" },
  { name: "Redis", desc: "in-memory cache realtime pub/sub session fast data" },
  { name: "SQLite", desc: "embedded lightweight database local file simple" },
  { name: "Supabase", desc: "backend-as-a-service PostgreSQL realtime auth storage simple serverless" },
  { name: "DynamoDB", desc: "AWS NoSQL serverless key-value scalable cloud database" },
  // Infra
  { name: "Docker", desc: "container virtualization deployment packaging DevOps" },
  { name: "Kubernetes", desc: "container orchestration scaling microservice cluster cloud" },
  { name: "AWS", desc: "Amazon cloud infrastructure hosting scalable enterprise" },
  { name: "GCP", desc: "Google cloud platform infrastructure machine learning AI" },
  { name: "Vercel", desc: "frontend deployment serverless edge hosting Next.js simple" },
  { name: "Netlify", desc: "frontend deployment JAMstack static hosting simple" },
  { name: "Cloudflare", desc: "CDN edge network workers serverless security performance" },
];

/* ------------------------------------------------------------------ */
/*  Korean → English keyword bridge                                     */
/* ------------------------------------------------------------------ */

const KO_EN_MAP: [RegExp, string][] = [
  [/웹\s*(사이트|앱|어플|페이지)?/g, "web application website"],
  [/모바일|핸드폰/g, "mobile app"],
  [/앱/g, "app application"],
  [/ios|아이폰/gi, "iOS Apple mobile native"],
  [/android|안드로이드/gi, "Android mobile native"],
  [/프론트(엔드)?/g, "frontend UI web"],
  [/백엔드|서버/g, "backend server API"],
  [/실시간/g, "realtime websocket live"],
  [/채팅|메신저/g, "chat messaging realtime communication"],
  [/대시보드/g, "dashboard analytics chart visualization"],
  [/쇼핑|커머스|결제/g, "e-commerce shopping payment store"],
  [/블로그|게시판|글/g, "blog CMS content board"],
  [/인증|로그인|회원/g, "authentication login user auth"],
  [/관리자|어드민/g, "admin management panel"],
  [/AI|인공지능|챗봇|추천/gi, "AI machine learning chatbot recommendation LLM"],
  [/데이터|분석/g, "data analytics database"],
  [/이미지|사진|갤러리/g, "image photo gallery upload media"],
  [/영상|비디오|스트리밍/g, "video streaming media player"],
  [/지도|위치|GPS/g, "map location GPS geolocation"],
  [/알림|푸시|노티/g, "notification push alert realtime"],
  [/게임/g, "game interactive realtime graphics"],
  [/협업|공유|팀/g, "collaboration team sharing realtime sync"],
  [/에디터|편집/g, "editor editing rich text document"],
  [/검색/g, "search engine indexing filter"],
  [/소셜|SNS|피드/g, "social network feed timeline community"],
  [/예약|스케줄|캘린더/g, "booking schedule calendar appointment"],
  [/설문|투표|폼/g, "form survey poll input"],
  [/파일|업로드|저장/g, "file upload storage cloud"],
  [/간단|심플|가벼운/g, "simple lightweight minimal"],
  [/대규모|엔터프라이즈/g, "enterprise large scale production"],
];

function preprocessIdea(idea: string): string {
  let text = idea;
  // Extract existing English words
  const english = idea.match(/[a-zA-Z]+/g)?.join(" ") ?? "";
  // Map Korean keywords to English
  for (const [pattern, replacement] of KO_EN_MAP) {
    if (pattern.test(text)) {
      text += " " + replacement;
    }
    pattern.lastIndex = 0; // reset regex state
  }
  return `${english} ${text}`.trim();
}

/* ------------------------------------------------------------------ */
/*  Embedding model (lazy loaded, cached)                               */
/* ------------------------------------------------------------------ */

let embedder: Pipeline = null;
let techEmbeddings: Float32Array[] | null = null;

async function getEmbedder(onProgress?: (p: number) => void): Promise<Pipeline> {
  if (embedder) return embedder;
  const pipelineFn = await loadPipeline();
  embedder = await pipelineFn("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_callback: (data: any) => {
      if (data.progress !== undefined && onProgress) onProgress(data.progress);
    },
  });
  return embedder;
}

async function getTechEmbeddings(model: Pipeline): Promise<Float32Array[]> {
  if (techEmbeddings) return techEmbeddings;
  const descs = TECH_ITEMS.map((t) => t.desc);
  const results = await model(descs, { pooling: "mean", normalize: true });
  techEmbeddings = [];
  const dim = results.dims[1];
  for (let i = 0; i < TECH_ITEMS.length; i++) {
    const start = i * dim;
    techEmbeddings.push(new Float32Array(results.data.buffer, start * 4, dim));
  }
  return techEmbeddings;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

export async function recommendTechs(
  idea: string,
  onProgress?: (p: number) => void,
): Promise<string[]> {
  const model = await getEmbedder(onProgress);
  const cached = await getTechEmbeddings(model);

  const query = preprocessIdea(idea);
  const qResult = await model(query, { pooling: "mean", normalize: true });
  const qEmb = new Float32Array(qResult.data);

  const scores = TECH_ITEMS.map((t, i) => ({
    name: t.name,
    score: cosine(qEmb, cached[i]),
  }));

  scores.sort((a, b) => b.score - a.score);

  // Always include TypeScript if JS-ecosystem tech is in top results
  const jsRelated = new Set(["React", "Next.js", "Vue", "Nuxt", "Svelte", "Node.js", "Express", "Fastify", "Hono", "React Native", "Expo"]);
  const top = scores.slice(0, 8).map((s) => s.name);

  if (top.some((t) => jsRelated.has(t)) && !top.includes("TypeScript")) {
    top.pop();
    top.splice(1, 0, "TypeScript");
  }

  return top;
}
