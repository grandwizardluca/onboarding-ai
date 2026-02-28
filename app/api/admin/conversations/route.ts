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

  // Otherwise, return all conversations with user email, org name, and message count
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, created_at, updated_at, org_id, organizations(name, slug)")
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
      const [userResult, { count }] = await Promise.all([
        // Widget sessions have null user_id — guard before calling getUserById
        conv.user_id
          ? supabase.auth.admin.getUserById(conv.user_id)
          : Promise.resolve({ data: null }),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id),
      ]);

      const org = conv.organizations as unknown as { name: string; slug: string } | null;

      return {
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        org_id: conv.org_id,
        org_name: org?.name ?? "Unknown",
        org_slug: org?.slug ?? "",
        user_email: (userResult as { data: { user?: { email?: string } } | null }).data?.user?.email || "Widget session",
        message_count: count || 0,
      };
    })
  );

  return NextResponse.json(enriched);
}
