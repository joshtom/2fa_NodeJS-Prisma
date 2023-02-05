import { Response } from "express";

let res: Response;
const resCall = (data: any, statusCode: number) => {
  res.status(statusCode).json({
    ...data,
  });
};

export { resCall };
