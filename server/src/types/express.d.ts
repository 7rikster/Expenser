import "@clerk/express";
import type { SignedInAuthObject } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      auth: SignedInAuthObject;
    }
  }
}

export {};
