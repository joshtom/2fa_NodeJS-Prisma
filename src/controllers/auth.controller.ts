import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../../server";
import { catchAsync } from "../utils/catchAsync";
import { resCall } from "../helpers/resCall";
import { Prisma } from "@prisma/client";
import speakeasy from "speakeasy";

const RegisterUser = catchAsync(async (req: Request, res: Response) => {
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
      res,
      { status: "success", message: "Registered successfully, Please login" },
      200
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return resCall(
          res,
          {
            status: "fail",
            message: "Email already exist, Please user another email address",
          },
          409
        );
      }

      return resCall(res, { status: "error", message: error.message }, 500);
    }
  }
});

const LoginUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return resCall(
        res,
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
    resCall(res, { status: "success", user: userRes }, 200);
  } catch (err) {}
});

const GenerateOTP = catchAsync(async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const { ascii, hex, base32, otpauth_url } = speakeasy.generateSecret({
      issuer: "codevoweb.com",
      name: "admin@admin.com",
      length: 15,
    });

    await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_ascii: ascii,
        otp_auth_url: otpauth_url,
        otp_base32: base32,
        otp_hex: hex,
      },
    });

    // resCall(res, { base32, otpauth_url }, 200);
    res.status(200).json({
      base32,
      otpauth_url,
    });
  } catch (err) {
    console.log("THe error", err);
    resCall(res, { status: "error", message: err.message }, 500);
  }
});

const VerifyOTP = catchAsync(async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    const message = "Token is invalid or user doesn't exist";
    if (!user) {
      return resCall(res, { status: "fail", message }, 401);
    }

    const verified = speakeasy.totp.verify({
      secret: user.otp_base32!,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return resCall(res, { status: "fail", message }, 401);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: true,
        otp_verified: true,
      },
    });

    resCall(
      res,
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
    resCall(res, { status: "error", message: err.message }, 500);
  }
});

const ValidateOTP = catchAsync(async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    const message = "Token is invalid or user doesn't exist";
    if (!user) {
      return resCall(res, { status: "fail", message }, 401);
    }

    console.log("User otp", token);
    const validToken = speakeasy.totp.verify({
      secret: user?.otp_base32!,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!validToken) {
      return resCall(
        res,
        { status: "fail", message },
        401
      );
    }

    return resCall(res, { otp_valid: true }, 200);
  } catch (err) {
    resCall(res, { status: "error", message: err.message }, 500);
  }
});

const DisableOTP = catchAsync(async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return resCall(
        res,
        { status: "fail", message: "User doesn't exist" },
        401
      );
    }

    const updateUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: false,
      },
    });

    resCall(
      res,
      {
        otp_disabled: true,
        user: {
          id: updateUser.id,
          name: updateUser.name,
          email: updateUser.email,
          otp_enabled: updateUser.otp_enabled,
        },
      },
      200
    );
  } catch (err) {
    resCall(res, { status: "error", message: err.message }, 500);
  }
});

export default {
  RegisterUser,
  LoginUser,
  GenerateOTP,
  VerifyOTP,
  ValidateOTP,
  DisableOTP,
};
