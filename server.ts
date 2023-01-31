import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { resCall } from "./src/helpers/resCall";

export const prisma = new PrismaClient();
const app = express();

dotenv.config({ path: "./config.env" });

async function main() {
  // Middleware
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    })
  );
  app.use(express.json());

  // Health Checker
  app.get("/api/healthchecker", (req: Request, res: Response) => {
    resCall(res, "success", "Two Factor Authentication Health Checker", 200);
  });

  // Register the API Routes

  // Catch All
  app.all("*", (req: Request, res: Response) => {
    return resCall(res, "fail", `Route: ${req.originalUrl} not found`, 404);
  });

  app.listen(process.env.PORT, () => {
    console.log(`Server started on port: ${process.env.PORT}`);
  });
}

main()
  .then(async () => {
    await prisma.$connect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
