import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function getPublicUrl(filePath: string): string {
  return supabaseAdmin.storage.from("ui-images").getPublicUrl(filePath).data
    .publicUrl;
}

// GET — return all images + current settings
export async function GET() {
  const [{ data: settings }, { data: images }] = await Promise.all([
    supabaseAdmin.from("ui_settings").select("*").eq("id", 1).single(),
    supabaseAdmin
      .from("ui_images")
      .select("*")
      .order("uploaded_at", { ascending: false }),
  ]);

  const imagesWithUrls = (images || []).map((img) => ({
    ...img,
    url: getPublicUrl(img.file_path),
  }));

  return NextResponse.json({
    images: imagesWithUrls,
    settings: settings ?? { background_mode: "standard", sidebar_mode: "standard" },
  });
}

// POST — action=upload | activate | set-mode
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // ── Upload ──────────────────────────────────────────────────────────────────
  if (action === "upload") {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type || !["background", "sidebar"].includes(type)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Accepted formats: jpg, png, webp" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ui-images")
      .upload(filePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: "Storage upload failed" },
        { status: 500 }
      );
    }

    const { data: row, error: dbError } = await supabaseAdmin
      .from("ui_images")
      .insert({ type, file_path: filePath, is_active: false })
      .select()
      .single();

    if (dbError) {
      // Clean up the uploaded file if DB insert fails
      await supabaseAdmin.storage.from("ui-images").remove([filePath]);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    return NextResponse.json({ id: row.id, url: getPublicUrl(filePath) });
  }

  // ── Activate ────────────────────────────────────────────────────────────────
  if (action === "activate") {
    const { id } = await request.json();

    const { data: img } = await supabaseAdmin
      .from("ui_images")
      .select("type")
      .eq("id", id)
      .single();

    if (!img) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Deactivate all images of this type, then activate the target
    await supabaseAdmin
      .from("ui_images")
      .update({ is_active: false })
      .eq("type", img.type);

    await supabaseAdmin
      .from("ui_images")
      .update({ is_active: true })
      .eq("id", id);

    return NextResponse.json({ success: true });
  }

  // ── Set mode ────────────────────────────────────────────────────────────────
  if (action === "set-mode") {
    const body = await request.json();
    const update: Record<string, string> = {};
    if (body.background_mode) update.background_mode = body.background_mode;
    if (body.sidebar_mode) update.sidebar_mode = body.sidebar_mode;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await supabaseAdmin.from("ui_settings").update(update).eq("id", 1);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE ?id=...
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: img } = await supabaseAdmin
    .from("ui_images")
    .select("file_path")
    .eq("id", id)
    .single();

  if (!img) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabaseAdmin.storage.from("ui-images").remove([img.file_path]);
  await supabaseAdmin.from("ui_images").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
