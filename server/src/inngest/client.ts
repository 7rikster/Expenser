import { Inngest } from "inngest";
import "dotenv/config";

export const inngest = new Inngest({
  id: "Expenser",
  name: "Expenser",
  retryFunction: async (attempt: number) => ({
    delay: Math.pow(2, attempt) * 1000,
    maxAttempts: 2,
  }),
});

export type Events = {
  "insights/generate": {
    data: {
      userId: string;
      date: string;
    };
  };

  "review/monthly-no-ai": {
    data: {
      userId: string;
      date: string;
    };
  };

  "review/monthly-ai": {
    data: {
      userId: string;
      date: string;
    };
  };
};