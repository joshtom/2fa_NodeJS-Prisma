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

const LoginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return resCall(res, "fail", "No user with that email exists", 404);
      }
      const userRes = {
        id: user.id,
        name: user.name,
        email: user.email,
        otp_enabled: user.otp_enabled,
      };
      resCall(res, "success", userRes, 200);
    } catch (err) {}
  }
);

export { RegisterUser, LoginUser };
