import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";
import upload from "../middlewares/upload";
const router = Express.Router();
router.post("/scan-receipt", middlewares.ClerkAuth.ClerkExpressRequireAuth(), upload.single("receipt"), controllers.ai.scanReceipt);
router.post("/natural-language-extraction", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.ai.naturalLanguageExtraction);
router.post("/assistant", middlewares.ClerkAuth.ClerkExpressRequireAuth(), upload.single("file"), controllers.ai.assistant);
export default router;
