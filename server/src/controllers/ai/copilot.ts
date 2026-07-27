import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/index.js";
import { runCopilot } from "src/services/copilot/orchestrator";

const copilot = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    /* 1. Auth validation */
    const { userId: clerkUserId } = req.auth();
    if (!clerkUserId) {
      res.status(401).json({ status: "error", msg: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      res.status(404).json({ status: "error", msg: "User not found" });
      return;
    }

    /* 2. Extract inputs */
    const file = req.file;
    const {
      message,
      pendingTransactions,
      lastAssistantMessage,
      dbTransactionIds: dbTransactionIdsRaw,
    } = req.body;

    const parsedPending = pendingTransactions
      ? JSON.parse(pendingTransactions)
      : [];
    const dbTransactionIds = dbTransactionIdsRaw
      ? JSON.parse(dbTransactionIdsRaw)
      : [];

    if (!file && !message) {
      res.status(400).json({
        status: "error",
        msg: "Please provide either a text prompt or an image.",
      });
      return;
    }

    /* 3. Set SSE headers */
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    /* 4. Build file data if present */
    const fileData = file
      ? {
          base64: file.buffer.toString("base64"),
          mimeType: file.mimetype,
        }
      : undefined;

    /* 5. Run the copilot orchestrator */
    await runCopilot(
      {
        userId: user.id,
        clerkUserId,
        message,
        fileData,
        pendingDrafts: parsedPending,
        lastAssistantMessage,
        dbTransactionIds,
      },
      res
    );
  } catch (error) {
    console.error("Copilot Controller Error:", error);
    // If headers already sent (SSE started), write error event
    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: "Internal server error" })}\n\n`
      );
      res.end();
    } else {
      res.status(500).json({
        status: "error",
        msg: "Internal server error during copilot processing",
      });
    }
  }
};

export default copilot;
