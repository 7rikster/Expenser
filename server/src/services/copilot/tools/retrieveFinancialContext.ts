import { generateEmbedding } from "../rag/embeddingService.js";
import { searchNarratives } from "../rag/vectorSearch.js";
export async function retrieveFinancialContext({
  userId,
  args,
}: {
  userId: string;
  args: { query: string };
}) {
  const query = args.query;
  if (!query) {
    return { error: "Query is required" };
  }
  // 1. Generate search query embedding
  const embedding = await generateEmbedding(query);
  // 2. Perform cosine similarity raw query search
  const matches = (await searchNarratives(userId, embedding)) as Array<{
    month?: string;
    content?: string;
    similarity?: number;
  }>;
  // 3. Return results format (mapping DB "content" back)
  return {
    narratives: matches.map((m) => ({
      month: m.month,
      content: m.content, // Map database content column
      similarity: m.similarity,
    })),
  };
}
