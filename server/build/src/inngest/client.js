import { Inngest } from "inngest";
import "dotenv/config";
export const inngest = new Inngest({
    id: "Expenser",
    name: "Expenser",
    retryFunction: async (attempt) => ({
        delay: Math.pow(2, attempt) * 1000,
        maxAttempts: 2,
    }),
});
