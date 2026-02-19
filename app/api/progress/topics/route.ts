import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all topic mentions for this user, aggregated across conversations
    const { data, error } = await supabaseAdmin
      .from("conversation_topics")
      .select("topic_key, topic_label, category, mention_count, last_mentioned_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    // Aggregate by topic (a topic may appear in multiple conversations)
    const topicMap: Record<
      string,
      {
        topic_key: string;
        topic_label: string;
        category: string;
        total_mentions: number;
        conversation_count: number;
        last_mentioned_at: string;
      }
    > = {};

    for (const row of data || []) {
      if (topicMap[row.topic_key]) {
        topicMap[row.topic_key].total_mentions += row.mention_count;
        topicMap[row.topic_key].conversation_count += 1;
        if (row.last_mentioned_at > topicMap[row.topic_key].last_mentioned_at) {
          topicMap[row.topic_key].last_mentioned_at = row.last_mentioned_at;
        }
      } else {
        topicMap[row.topic_key] = {
          topic_key: row.topic_key,
          topic_label: row.topic_label,
          category: row.category,
          total_mentions: row.mention_count,
          conversation_count: 1,
          last_mentioned_at: row.last_mentioned_at,
        };
      }
    }

    return NextResponse.json({ topics: Object.values(topicMap) });
  } catch (error) {
    console.error("Topics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
