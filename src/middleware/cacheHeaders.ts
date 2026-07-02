import { Request, Response, NextFunction } from "express";

export function cacheShortPublic(maxAgeSeconds = 60) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Cache-Control", `private, max-age=${maxAgeSeconds}`);
    next();
  };
}

export function noCache(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store");
  next();
}
