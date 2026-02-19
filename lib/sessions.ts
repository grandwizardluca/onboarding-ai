import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

export interface StudySession {
  id?: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  mouse_active_count: number;
  keyboard_active_count: number;
  messages_sent: number;
}

/**
 * Compute study sessions from activity events for a user in a date range.
 * A session starts at the first event after a 5+ minute gap and ends
 * at the last event before the next 5+ minute gap.
 * Results are upserted into the study_sessions table.
 */
export async function computeSessions(
  userId: string,
  from: string,
  to: string
): Promise<StudySession[]> {
  // Fetch all activity events in the date range
  const { data: events, error } = await supabaseAdmin
    .from("activity_events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true });

  if (error || !events || events.length === 0) {
    return [];
  }

  // Group events into sessions using 5-minute gap logic
  const sessions: StudySession[] = [];
  let sessionEvents = [events[0]];

  for (let i = 1; i < events.length; i++) {
    const prevTime = new Date(events[i - 1].created_at).getTime();
    const currTime = new Date(events[i].created_at).getTime();

    if (currTime - prevTime > SESSION_GAP_MS) {
      // Gap found — close the current session and start a new one
      sessions.push(buildSession(userId, sessionEvents));
      sessionEvents = [events[i]];
    } else {
      sessionEvents.push(events[i]);
    }
  }

  // Close the last session
  if (sessionEvents.length > 0) {
    sessions.push(buildSession(userId, sessionEvents));
  }

  // Delete old sessions in this range and insert fresh ones
  await supabaseAdmin
    .from("study_sessions")
    .delete()
    .eq("user_id", userId)
    .gte("started_at", from)
    .lte("started_at", to);

  if (sessions.length > 0) {
    await supabaseAdmin.from("study_sessions").insert(sessions);
  }

  return sessions;
}

function buildSession(
  userId: string,
  events: Array<{
    created_at: string;
    mouse_active: boolean;
    keyboard_active: boolean;
    message_sent: boolean;
  }>
): StudySession {
  const startTime = new Date(events[0].created_at);
  const endTime = new Date(events[events.length - 1].created_at);
  const durationMs = endTime.getTime() - startTime.getTime();
  // Minimum 1 minute for single-event sessions
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  return {
    user_id: userId,
    started_at: events[0].created_at,
    ended_at: events[events.length - 1].created_at,
    duration_minutes: durationMinutes,
    mouse_active_count: events.filter((e) => e.mouse_active).length,
    keyboard_active_count: events.filter((e) => e.keyboard_active).length,
    messages_sent: events.filter((e) => e.message_sent).length,
  };
}
