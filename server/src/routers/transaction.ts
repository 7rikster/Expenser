import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";

const router = Express.Router();

router.post("/create", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.transaction.create);
router.get("/list", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.transaction.list);
router.delete("/bulk", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.transaction.deleteTransaction);
router.put("/:id", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.transaction.updateTransaction);
router.post("/bulk-create", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.transaction.bulkCreate);

export default router;