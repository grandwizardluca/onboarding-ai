import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic();

interface PageElement {
  index: number;
  type: string;
  text: string;
  id: string;
  ariaLabel: string;
  placeholder: string;
  nearbyLabel: string;
  visibleInViewport: boolean;
}

interface AnalysisResult {
  elementType: string | null;
  elementIndex: number | null;
  confidence: number;
  tooltip: string;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  // Auth via X-API-Key
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey?.trim()) {
    return Response.json({ error: "Missing X-API-Key" }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("api_key", apiKey.trim())
    .maybeSingle();

  if (!org) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { snapshot, step } = body as {
    snapshot: { url: string; elements: PageElement[] };
    step: { title: string; instructions: string };
  };

  if (!snapshot?.elements || !step?.title) {
    return Response.json({ error: "Missing snapshot or step" }, { status: 400 });
  }

  // Build element list for prompt
  const elementLines = snapshot.elements
    .map((el) => {
      const parts: string[] = [`[${el.index}] ${el.type.toUpperCase()}`];
      if (el.text) parts.push(`text="${el.text}"`);
      if (el.id) parts.push(`id="${el.id}"`);
      if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`);
      if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
      if (el.nearbyLabel) parts.push(`label="${el.nearbyLabel}"`);
      parts.push(el.visibleInViewport ? "(in viewport)" : "(below fold — user must scroll)");
      return parts.join(" ");
    })
    .join("\n");

  const prompt = `You are an onboarding assistant identifying which UI element a user should interact with next.

Current step: "${step.title}"
Instructions: "${step.instructions}"
Page URL: ${snapshot.url}

Interactive elements on the page:
${elementLines}

You MUST select the single best element for this step. Be decisive — pick the closest match even if it's not perfect. Only return null elementIndex if the page is completely unrelated to this step (e.g. a login page when the step is about DNS).

Rules:
- Prefer elements in the viewport (visible) over below-fold elements
- Match on text, aria-label, placeholder, or nearby label
- Tooltip must be under 60 characters, imperative (e.g. "Click to add DNS record", "Enter your domain here")
- Set confidence 0.5–1.0 based on how clearly the element matches; do not round to extremes

Respond with ONLY valid JSON, no markdown fences:
{
  "elementType": "button" | "input" | "select" | "link" | null,
  "elementIndex": <number or null>,
  "confidence": <0.5 to 1.0>,
  "tooltip": "<short imperative instruction>",
  "reasoning": "<one sentence>"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const result: AnalysisResult = JSON.parse(text);
    return Response.json(result);
  } catch (error) {
    console.error("[analyze-page] Failed:", error);
    // Return no-match on parse or API error — don't crash the user experience
    return Response.json({
      elementType: null,
      elementIndex: null,
      confidence: 0,
      tooltip: "",
      reasoning: "Analysis failed",
    });
  }
}
