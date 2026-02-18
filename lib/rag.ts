import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./openai";

// Use service role client for RAG — needs to read all document chunks
// regardless of RLS policies
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
 * Given a student's query, find the 5 most relevant document chunks
 * and format them as a context block for the AI.
 */
export async function retrieveContext(query: string): Promise<string> {
  // Generate embedding for the student's question
  const queryEmbedding = await generateEmbedding(query);

  // Search for similar chunks using the match_chunks function
  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error || !chunks || chunks.length === 0) {
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

  return `The following reference material from the SEAB syllabus and study notes is relevant to the student's question. Use this to inform your response, but do not simply copy-paste it — teach using it.\n\n${contextBlock}`;
}
