import dotEnv from "dotenv";
dotEnv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import * as router from "./src/routers/index.js";
import { clerkMiddleware } from "@clerk/express";

const app = express();

app
  .use(
    cors({
      origin: true,
    })
  )
  .use(helmet())
  .use(morgan("dev"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(clerkMiddleware());


//Routers  
app.get("/", (_, res) => {
  res.send("✅ Expenser API is live. Use /api for endpoints.");
});

app.use("/user", router.user);
app.use("/transaction", router.transaction);
app.use("/dashboard", router.dashboard);
app.use("/ai", router.ai);
app.use("/budget", router.budget);

app.listen(process.env.PORT, () => {
  console.log(`Server running at port ${process.env.PORT}`);
});