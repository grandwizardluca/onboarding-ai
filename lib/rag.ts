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

export interface RAGSource {
  document_id: string;
  document_title: string;
  chunk_index: number;
  similarity: number;
}

export interface RAGResult {
  context: string;
  sources: RAGSource[];
}

// Minimum similarity to surface a source as a citation (retrieval uses 0.3,
// but we only show citations for chunks that are clearly relevant).
const CITATION_THRESHOLD = 0.4;

/**
 * Given a user's query, find the 5 most relevant document chunks
 * for that organization and format them as a context block for the AI.
 *
 * CRITICAL: orgId is passed as p_org_id so match_chunks only returns
 * chunks belonging to this organization — never another org's data.
 *
 * Returns both the formatted context string (for the system prompt) and
 * a sources array (for the citation header sent to the frontend).
 */
export async function retrieveContext(query: string, orgId: string): Promise<RAGResult> {
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
    return { context: "", sources: [] };
  }

  if (!chunks || chunks.length === 0) {
    console.warn("[RAG] ⚠️ No chunks returned. Check: (1) documents uploaded for this orgId, (2) match_chunks RPC accepts p_org_id, (3) similarity threshold 0.3 not too strict");
    return { context: "", sources: [] };
  }

  const results = chunks as ChunkResult[];

  // Fetch document titles for citation display — CRITICAL: filter by org_id
  // so we never accidentally surface another org's document names.
  const docIds = [...new Set(results.map((c) => c.document_id))];
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title")
    .in("id", docIds)
    .eq("org_id", orgId);

  const titleMap = new Map((docs ?? []).map((d) => [d.id, d.title as string]));

  // Build sources for citations — only chunks above the citation threshold
  const sources: RAGSource[] = results
    .filter((c) => c.similarity >= CITATION_THRESHOLD)
    .map((c) => ({
      document_id: c.document_id,
      document_title: titleMap.get(c.document_id) ?? "Unknown Document",
      chunk_index: c.chunk_index,
      similarity: c.similarity,
    }));

  console.log("[RAG] sources for citations:", sources.length, "(threshold:", CITATION_THRESHOLD, ")");

  // Format all retrieved chunks as a context block for the system prompt
  const contextBlock = results
    .map((chunk, i) => `[Reference ${i + 1}]\n${chunk.content}`)
    .join("\n\n---\n\n");

  const context = `The following reference material is relevant to the user's question. Use it to inform your response.\n\n${contextBlock}`;

  return { context, sources };
}
