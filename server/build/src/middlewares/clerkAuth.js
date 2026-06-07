import { requireAuth } from "@clerk/express";
const ClerkExpressRequireAuth = () => {
    return (req, res, next) => {
        return requireAuth()(req, res, next);
    };
};
export { ClerkExpressRequireAuth };
