import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chunkText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/openai";

// Ensure this route runs in Node.js runtime (required for pdf-parse)
export const runtime = "nodejs";

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
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ title, source: filename })
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

    // Embed and store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert({
          document_id: doc.id,
          content: chunks[i],
          embedding,
          chunk_index: i,
        });

      if (chunkError) {
        console.error(`Error inserting chunk ${i}:`, chunkError);
      }
    }

    // Update document with chunk count
    await supabase
      .from("documents")
      .update({ chunk_count: chunks.length })
      .eq("id", doc.id);

    return NextResponse.json({
      id: doc.id,
      title,
      source: filename,
      chunk_count: chunks.length,
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
 * GET /api/documents — List all documents
 */
export async function GET() {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, source, chunk_count, created_at")
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
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Chunks are deleted automatically via ON DELETE CASCADE
    const { error } = await supabase.from("documents").delete().eq("id", id);

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
