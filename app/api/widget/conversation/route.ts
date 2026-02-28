import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) {
    return Response.json({ error: "Missing conversationId" }, { status: 400 });
  }

  // Verify conversation belongs to this org
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", org.id)
    .maybeSingle();

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return Response.json(messages ?? []);
}
