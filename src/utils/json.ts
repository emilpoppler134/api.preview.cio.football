import getJsonBody from "@body/json";
import { NextFunction, Request } from "express";

export function json(req: Request, _: any, next: NextFunction): void {
  getJsonBody(req).then(
    (body) => {
      req.body = body;
      next();
    },
    (err) => next(err),
  );
}
