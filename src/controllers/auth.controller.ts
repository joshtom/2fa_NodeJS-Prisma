import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../../server";
import { catchAsync } from "../utils/catchAsync";
import { resCall } from "../helpers/resCall";
import { Prisma } from "@prisma/client";

const RegisterUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      await prisma.user.create({
        data: {
          name,
          email,
          password: crypto.createHash("sha256").update(password).digest("hex"),
        },
      });

      resCall(res, "success", "Registered successfully, Please login", 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return resCall(
            res,
            "fail",
            "Email already exist, Please user another email address",
            409
          );
        }

        return resCall(res, "error", error.message, 500);
      }
    }
  }
);

export { RegisterUser };
