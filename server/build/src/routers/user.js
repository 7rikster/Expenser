import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";
const router = Express.Router();
router.post("/create", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.user.create);
router.put("/budget", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.user.budget);
export default router;
