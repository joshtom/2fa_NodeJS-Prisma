import { Request, Response, NextFunction } from "express";
import crypto, { verify } from "crypto";
import { prisma } from "../../server";
import { catchAsync } from "../utils/catchAsync";
import { resCall } from "../helpers/resCall";
import { Prisma } from "@prisma/client";
import { totp, generateSecret } from "speakeasy";

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

      resCall(
        { status: "success", message: "Registered successfully, Please login" },
        200
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return resCall(
            {
              status: "fail",
              message: "Email already exist, Please user another email address",
            },
            409
          );
        }

        return resCall({ status: "error", message: error.message }, 500);
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
        return resCall(
          { status: "fail", message: "No user with that email exists" },
          404
        );
      }
      const userRes = {
        id: user.id,
        name: user.name,
        email: user.email,
        otp_enabled: user.otp_enabled,
      };
      resCall({ status: "success", userRes }, 200);
    } catch (err) {}
  }
);

const GenerateOTP = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userid } = req.body;
      const {} = generateSecret({
        issuer: "http://localhost:8000",
        name: "admin@admin.com",
        length: 15,
      });

      await prisma.user.update({
        where: { id: userid },
        data: {
          otp_ascii: ascii,
          otp_auth_url: otpauthurl,
          otp_base32: base32,
          otp_hex: hex,
        },
      });

      resCall(res, { base32, otpauthurl }, 200);
    } catch (err) {}
  }
);

const VerifyOTP = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userid, token } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userid } });
      const message = "Token is invalid or user doesn't exist";
      if (!user) {
        return resCall({ status: "fail", message }, 401);
      }

      const verified = totp.verify({
        secret: user.otp_base32!,
        encoding: "base32",
        token,
      });

      if (!verified) {
        return resCall({ status: "fail", message }, 401);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userid },
        data: {
          otp_enabled: true,
          otp_verified: true,
        },
      });

      resCall(
        {
          otp_verified: true,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            otp_enabled: updatedUser.otp_enabled,
          },
        },
        200
      );
    } catch (err) {
      resCall({ status: "error", message: err.message }, 500);
    }
  }
);

const ValidateOTP = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userid, token } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userid } });

      const message = "Token is invalid or user doesn't exist";
      if (!user) {
        return resCall({ status: "fail", message }, 401);
      }

      const validToken = totp.verify({
        secret: user?.otp_base32 as string,
        token,
        window: 1,
      });

      if (!validToken) {
        return resCall({ status: "fail", message }, 401);
      }

      return resCall({ otp_valid: true }, 200);
    } catch (err) {
      resCall({ status: "error", message: err.message }, 500);
    }
  }
);

export { RegisterUser, LoginUser, GenerateOTP, VerifyOTP };
