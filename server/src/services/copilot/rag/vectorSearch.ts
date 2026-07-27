import {prisma} from "../../../lib/index.js";


export async function searchNarratives(userId: string, queryEmbedding: number[], topK: number = 3) {
  const results = await prisma.$queryRaw`
    SELECT id, month, content, 
           1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "monthlyNarratives"
    WHERE "userId" = ${userId}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `;
  return results;
}