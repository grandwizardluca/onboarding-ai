import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./openai";

// Use service role client for RAG — needs to read document chunks
// regardless of RLS policies. org_id filtering happens inside match_chunks.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

/**
 * Given a user's query, find the 5 most relevant document chunks
 * for that organization and format them as a context block for the AI.
 *
 * CRITICAL: orgId is passed as p_org_id so match_chunks only returns
 * chunks belonging to this organization — never another org's data.
 */
export async function retrieveContext(query: string, orgId: string): Promise<string> {
  console.log("[RAG] retrieveContext called — orgId:", orgId, "query:", query.slice(0, 80));

  // Generate embedding for the user's question
  const queryEmbedding = await generateEmbedding(query);
  console.log("[RAG] embedding generated, first 5 dims:", queryEmbedding.slice(0, 5));

  // Search for similar chunks — CRITICAL: filter by org_id so each
  // organization only sees their own documents
  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5,
    p_org_id: orgId,
  });

  console.log("[RAG] match_chunks returned — error:", error, "chunks:", chunks?.length ?? 0);
  if (error) {
    console.error("[RAG] match_chunks error detail:", JSON.stringify(error));
    return "";
  }

  if (!chunks || chunks.length === 0) {
    console.warn("[RAG] ⚠️ No chunks returned. Check: (1) documents uploaded for this orgId, (2) match_chunks RPC accepts p_org_id, (3) similarity threshold 0.3 not too strict");
    return "";
  }

  const results = chunks as ChunkResult[];

  // Format chunks as a context block
  const contextBlock = results
    .map(
      (chunk, i) =>
        `[Reference ${i + 1}]\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  return `The following reference material is relevant to the user's question. Use it to inform your response.\n\n${contextBlock}`;
}
