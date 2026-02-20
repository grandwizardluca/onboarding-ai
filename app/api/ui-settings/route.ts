import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public GET — returns active image URLs + display modes for student UI
export async function GET() {
  const [{ data: settings }, { data: bgImage }, { data: sidebarImage }] =
    await Promise.all([
      supabaseAdmin.from("ui_settings").select("*").eq("id", 1).single(),
      supabaseAdmin
        .from("ui_images")
        .select("file_path")
        .eq("type", "background")
        .eq("is_active", true)
        .single(),
      supabaseAdmin
        .from("ui_images")
        .select("file_path")
        .eq("type", "sidebar")
        .eq("is_active", true)
        .single(),
    ]);

  const getUrl = (filePath: string | null | undefined) => {
    if (!filePath) return null;
    return supabaseAdmin.storage.from("ui-images").getPublicUrl(filePath).data
      .publicUrl;
  };

  return NextResponse.json({
    background_mode: settings?.background_mode ?? "standard",
    background_url: getUrl(bgImage?.file_path),
    sidebar_mode: settings?.sidebar_mode ?? "standard",
    sidebar_url: getUrl(sidebarImage?.file_path),
  });
}
