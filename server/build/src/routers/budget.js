import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";
const router = Express.Router();
router.get("/", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.userBudget.get);
router.put("/", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.userBudget.update);
router.patch("/dismiss-warning", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.userBudget.dismissWarning);
export default router;
