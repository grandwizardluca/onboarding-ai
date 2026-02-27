import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chunkText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/openai";
import { getAuthContext } from "@/lib/auth-context";

// Ensure this route runs in Node.js runtime (required for pdf-parse)
export const runtime = "nodejs";

// Allow up to 60 s on Vercel so large PDFs can finish chunking + embedding
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// Service role client — admin operations bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/documents — Upload and process a document
 * Accepts multipart form data with a file field
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate and get org context
  let orgId: string;
  let role: string;
  try {
    ({ orgId, role } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    // Platform admins can supply an orgId override to upload to any org
    if (role === "platform_admin") {
      const overrideOrgId = formData.get("orgId") as string | null;
      if (overrideOrgId) {
        orgId = overrideOrgId;
      }
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          error: `File too large (${sizeMB} MB). Maximum is 50 MB. Try compressing in Preview → File → Export as PDF, or split into smaller files.`,
        },
        { status: 400 }
      );
    }

    const filename = file.name;
    const title = filename.replace(/\.[^.]+$/, ""); // Remove extension for title

    // Extract text based on file type
    let text: string;

    if (filename.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Import the actual parser directly — the top-level require("pdf-parse")
      // tries to load a test PDF file that doesn't exist in node_modules
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse");
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (filename.endsWith(".txt") || filename.endsWith(".md")) {
      text = await file.text();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload .pdf, .txt, or .md" },
        { status: 400 }
      );
    }

    // Strip null bytes and other control characters that crash PostgreSQL (error 22P05).
    // Common in Notion-exported PDFs and some authoring tools.
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Create document record — CRITICAL: store org_id so this document
    // belongs to the correct organization
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ title, source: filename, org_id: orgId })
      .select("id")
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Embed and store each chunk — per-chunk try-catch so one bad chunk
    // doesn't abort the whole document. Track successes for chunk_count.
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i]);

        const { error: chunkError } = await supabase
          .from("document_chunks")
          .insert({
            document_id: doc.id,
            org_id: orgId,
            content: chunks[i],
            embedding,
            chunk_index: i,
          });

        if (chunkError) {
          console.error(`[Documents] Failed to insert chunk ${i}:`, chunkError);
        } else {
          successCount++;
        }
      } catch (chunkErr) {
        console.error(`[Documents] Failed to embed chunk ${i}, skipping:`, chunkErr);
      }
    }

    // Update document with actual number of successfully stored chunks
    await supabase
      .from("documents")
      .update({ chunk_count: successCount })
      .eq("id", doc.id);

    return NextResponse.json({
      id: doc.id,
      title,
      source: filename,
      chunk_count: successCount,
    });
  } catch (error) {
    console.error("Document processing error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents — List documents for the authenticated user's organization.
 * Platform admins may pass ?orgId= to view a specific org's documents.
 */
export async function GET(request: NextRequest) {
  // Authenticate and get org context
  let orgId: string;
  let role: string;
  try {
    ({ orgId, role } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Platform admins can filter by a specific org via query param
  if (role === "platform_admin") {
    const override = request.nextUrl.searchParams.get("orgId");
    if (override) orgId = override;
  }

  // CRITICAL: filter by org_id — only return this org's documents
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, source, chunk_count, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/documents — Delete a document and all its chunks
 * Expects { id: string } in the request body
 */
export async function DELETE(request: NextRequest) {
  // Authenticate and get org context
  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // CRITICAL: filter by both id AND org_id — prevents deleting another org's document
    // Chunks are deleted automatically via ON DELETE CASCADE
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
