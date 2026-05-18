import Express from "express";
import * as controllers from "../controllers";
import * as middlewares from "../middlewares";

const router = Express.Router();

router.get("/", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.dashboard.getDashboardData);
router.get("/monthly-trend", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.dashboard.getMonthlyTrend);
router.get("/weekly-pattern", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.dashboard.getWeeklyPattern);
router.get("/category-breakdown", middlewares.ClerkAuth.ClerkExpressRequireAuth(), controllers.dashboard.getCategoryBreakdown);

export default router;
