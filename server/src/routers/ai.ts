import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";
import upload from "../middlewares/upload";

const router = Express.Router(); 

router.post("/scan-receipt", middlewares.ClerkAuth.ClerkExpressRequireAuth(), upload.single("receipt"), controllers.ai.scanReceipt);

export default router;
