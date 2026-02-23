import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 소프트웨어 개발 프로세스 전문가입니다.
사용자가 제공하는 프롬프트를 바탕으로 **개발 프로세스 정의서** 문서 초안을 작성합니다.

## 출력 규칙
- 출력 형식: Markdown
- 구조: 1페이지 요약 → 본문 프로세스 → 부록/템플릿 → 결정 필요 목록
- 누락된 입력은 가정하지 말고 **"[결정 필요]"** 로 표기
- 장황한 설명 금지, **실행 가능한 체크리스트** 중심
- 각 섹션은 명확한 담당자/기한/완료 조건을 포함`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt_text,
      provider,
      model,
      api_key,
      temperature = 0.2,
      max_tokens = 4000,
      dry_run = false,
    } = body;

    if (!api_key) {
      return NextResponse.json({ error: "API key가 필요합니다." }, { status: 400 });
    }

    // Dry-run: return payload without calling
    if (dry_run) {
      return NextResponse.json({
        content: JSON.stringify(
          {
            provider,
            model,
            temperature,
            max_tokens,
            system_prompt_length: SYSTEM_PROMPT.length,
            user_prompt_length: prompt_text.length,
          },
          null,
          2
        ),
        model,
      });
    }

    if (provider === "openai") {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt_text },
          ],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return NextResponse.json({ error: `OpenAI 오류 (${resp.status}): ${err}` }, { status: resp.status });
      }

      const data = await resp.json();
      const choice = data.choices?.[0];
      return NextResponse.json({
        content: choice?.message?.content ?? "",
        model: data.model,
        input_tokens: data.usage?.prompt_tokens,
        output_tokens: data.usage?.completion_tokens,
      });
    }

    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens,
          temperature,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt_text }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return NextResponse.json({ error: `Anthropic 오류 (${resp.status}): ${err}` }, { status: resp.status });
      }

      const data = await resp.json();
      const text = data.content
        ?.filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("");

      return NextResponse.json({
        content: text ?? "",
        model: data.model,
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
      });
    }

    return NextResponse.json({ error: `지원하지 않는 provider: ${provider}` }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `서버 오류: ${message}` }, { status: 500 });
  }
}
