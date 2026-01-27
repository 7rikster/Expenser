import { requireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";


const ClerkExpressRequireAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    return requireAuth()(req, res, next);
  };
};

export { ClerkExpressRequireAuth };