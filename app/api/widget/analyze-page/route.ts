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

  const prompt = `You are helping guide a user through a software onboarding step on a real website.

Current workflow step: "${step.title}"
Step instructions: "${step.instructions}"

Page URL: ${snapshot.url}

Interactive elements found on the page:
${elementLines}

Which SINGLE element should be highlighted to best help the user complete this step?

Rules:
- Choose the element most directly relevant to the step instructions
- If an element is "below fold", the user needs to scroll — still select it if it's the right one
- Only return null if truly no element relates to this step
- Keep tooltip under 60 characters, action-oriented (e.g. "Click here to add DNS record")

Respond with ONLY valid JSON, no markdown fences:
{
  "elementType": "button" | "input" | "select" | "link" | null,
  "elementIndex": <number or null>,
  "confidence": <0.0 to 1.0>,
  "tooltip": "<short user-friendly instruction>",
  "reasoning": "<one sentence explanation>"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
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
