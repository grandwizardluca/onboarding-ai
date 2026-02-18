import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("id");

  // If an ID is provided, return the full message thread
  if (conversationId) {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json(messages);
  }

  // Otherwise, return all conversations with user email and message count
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  // Enrich with user email and message count
  const enriched = await Promise.all(
    (conversations || []).map(async (conv) => {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(
        conv.user_id
      );

      // Get message count
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id);

      return {
        ...conv,
        user_email: userData?.user?.email || "Unknown",
        message_count: count || 0,
      };
    })
  );

  return NextResponse.json(enriched);
}
