import { Response } from "express";

const resCall = (
  res: Response,
  status: string,
  message: any,
  statusCode: number
) => {
  res.status(statusCode).json({
    status,
    message,
  });
};

export { resCall };
