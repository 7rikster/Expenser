import { GoogleGenerativeAI, FunctionCallingMode, type Part } from "@google/generative-ai";
import { Response } from "express";
import { copilotToolDeclarations } from "./toolDeclarations.js";
import { executeToolCall, type ToolCallContext } from "./toolRegistry.js";
import { buildSystemPrompt } from "./systemPrompt.js";

const MAX_TOOL_ROUNDS = 10;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2!);

// ── SSE Helpers ─────────────────────────────────────────────
function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Determine action type from tool calls ───────────────────
function resolveAction(calledTools: string[]): string {
  if (calledTools.includes("create_draft_transactions")) return "CREATE_DRAFT";
  if (calledTools.includes("approve_drafts")) return "APPROVE_DRAFTS";
  if (calledTools.includes("manage_drafts")) {
    // Check the last manage_drafts call for the sub-action
    return "UPDATE_DRAFT"; // Will be refined by tool result
  }
  if (calledTools.includes("execute_delete_transaction")) return "DELETE_DB";
  if (calledTools.includes("confirm_delete_transaction")) return "CONFIRM_DELETE_DB";
  if (calledTools.includes("search_transactions")) return "LIST_DB";
  if (calledTools.length > 0) return "COPILOT_RESPONSE";
  return "GENERAL";
}

// ── Main Orchestrator ───────────────────────────────────────
export interface CopilotOptions {
  userId: string;
  clerkUserId: string;
  message?: string;
  fileData?: { base64: string; mimeType: string };
  pendingDrafts: any[];
  lastAssistantMessage?: string;
  dbTransactionIds?: string[];
}

export async function runCopilot(options: CopilotOptions, res: Response) {
  const {
    userId,
    clerkUserId,
    message,
    fileData,
    pendingDrafts,
    lastAssistantMessage,
    dbTransactionIds,
  } = options;

  try {
    const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

    const systemPrompt = buildSystemPrompt({
      localDate,
      pendingDrafts,
      lastAssistantMessage,
      dbTransactionIds,
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ functionDeclarations: copilotToolDeclarations }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingMode.AUTO },
      },
      systemInstruction: systemPrompt,
    });

    // Build user message parts
    const userParts: Part[] = [];
    if (message) {
      userParts.push({ text: message });
    }
    if (fileData) {
      userParts.push({
        inlineData: {
          data: fileData.base64,
          mimeType: fileData.mimeType,
        },
      });
    }

    if (userParts.length === 0) {
      sendSSE(res, "error", { message: "No message or file provided." });
      res.end();
      return;
    }

    // Start chat and send initial message
    const chat = model.startChat();
    let response = await chat.sendMessage(userParts);

    const calledTools: string[] = [];
    const collectedTransactions: any[] = [];
    let manageDraftsAction: string | null = null;
    let finalReplyText = "";

    // Tool context carries state between calls
    const toolContext: ToolCallContext = {
      pendingDrafts: [...pendingDrafts],
      dbTransactionIds: dbTransactionIds || [],
    };

    // ── Multi-turn tool calling loop ──────────────────────
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.response.candidates?.[0];
      if (!candidate || !candidate.content?.parts) break;

      const parts = candidate.content.parts;

      // Check for function calls
      const functionCalls = parts.filter((p) => p.functionCall);
      if (functionCalls.length === 0) {
        // No function calls — extract text response
        const textParts = parts.filter((p) => p.text);
        finalReplyText = textParts.map((p) => p.text).join("");
        break;
      }

      // Execute each function call
      const functionResponses: Part[] = [];

      for (const part of functionCalls) {
        const fc = part.functionCall!;
        const toolName = fc.name;
        const toolArgs = fc.args || {};

        calledTools.push(toolName);
        sendSSE(res, "tool_start", { tool: toolName });

        try {
          const result = await executeToolCall(
            toolName,
            userId,
            clerkUserId,
            toolArgs,
            toolContext
          );

          sendSSE(res, "tool_end", { tool: toolName });

          // Collect side effects
          if (toolName === "create_draft_transactions" && result.drafts) {
            collectedTransactions.push(...result.drafts);
          }
          if (toolName === "manage_drafts") {
            manageDraftsAction = result.action;
            collectedTransactions.length = 0;
            collectedTransactions.push(...(result.drafts || []));
          }
          if (toolName === "confirm_delete_transaction" && result.transactions) {
            collectedTransactions.push(...result.transactions);
            // Update context for potential follow-up execute_delete
            toolContext.dbTransactionIds = result.transactions.map(
              (t: any) => t.id
            );
          }
          if (toolName === "approve_drafts") {
            // Drafts were approved — clear them
            toolContext.pendingDrafts = [];
          }

          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: result,
            },
          } as Part);
        } catch (error: any) {
          sendSSE(res, "tool_end", { tool: toolName });
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: { error: error.message || "Tool execution failed" },
            },
          } as Part);
        }
      }

      // Send function responses back to the model
      response = await chat.sendMessage(functionResponses);
    }

    // If we didn't get text from the loop, try one more time
    if (!finalReplyText) {
      const candidate = response.response.candidates?.[0];
      if (candidate?.content?.parts) {
        const textParts = candidate.content.parts.filter((p) => p.text);
        finalReplyText = textParts.map((p) => p.text).join("");
      }
    }

    if (!finalReplyText) {
      finalReplyText = "I processed your request, but I couldn't generate a response. Please try again.";
    }

    // Stream the text response
    sendSSE(res, "text_delta", { delta: finalReplyText });

    // Resolve action type
    let action = resolveAction(calledTools);
    if (action === "UPDATE_DRAFT" && manageDraftsAction) {
      action = manageDraftsAction;
    }

    // Build the done payload
    const donePayload: any = {
      action,
      replyText: finalReplyText,
      transactions: collectedTransactions,
    };

    // Include side effect info
    if (action === "CONFIRM_DELETE_DB") {
      donePayload.dbTransactionIds = toolContext.dbTransactionIds;
    }

    sendSSE(res, "done", donePayload);
    res.end();
  } catch (error: any) {
    console.error("Copilot Orchestrator Error:", error);
    sendSSE(res, "error", {
      message: "There was an error processing your request. Please try again after some time.",
    });
    res.end();
  }
}
