import { Response } from "express";

const resCall = (res: Response, data: any, statusCode: number) => {
  res?.status(statusCode).json({
    ...data,
  });
};

export { resCall };
