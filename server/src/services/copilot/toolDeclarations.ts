import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const copilotToolDeclarations: FunctionDeclaration[] = [
  // ── Financial Analysis Tools ──────────────────────────────
  {
    name: "get_spending_summary",
    description:
      "Get the user's income, expenses, savings, and daily average for a given month. Use this to answer questions like 'How much did I spend?', 'What's my savings rate?', 'How much did I earn?'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: {
          type: SchemaType.STRING,
          description:
            "Month in YYYY-MM format (e.g., '2026-07'). Defaults to current month if omitted.",
        },
      },
    },
  },
  {
    name: "get_budget_status",
    description:
      "Get the user's budget vs actual spending with per-category breakdown. Use for 'Will I exceed my budget?', 'How much budget is left?', 'Which categories are over budget?'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: {
          type: SchemaType.STRING,
          description: "Month in YYYY-MM format. Defaults to current month.",
        },
      },
    },
  },
  {
    name: "compare_months",
    description:
      "Compare income, expenses, and category spending between two months. Use for 'Compare this month and last month', 'Am I spending more than before?'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month1: {
          type: SchemaType.STRING,
          description:
            "First month in YYYY-MM format. Defaults to current month.",
        },
        month2: {
          type: SchemaType.STRING,
          description:
            "Second month in YYYY-MM format. Defaults to previous month.",
        },
      },
    },
  },
  {
    name: "get_category_breakdown",
    description:
      "Get detailed category-wise spending breakdown with percentages. Optionally drill into a specific category to see merchant-level breakdown. Use for 'Where do I spend most?', 'How much on food?', 'Break down my spending'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: {
          type: SchemaType.STRING,
          description: "Month in YYYY-MM format. Defaults to current month.",
        },
        category: {
          type: SchemaType.STRING,
          description:
            "Optional specific category to drill into for merchant breakdown (e.g., 'food', 'transportation').",
        },
      },
    },
  },
  {
    name: "predict_end_of_month",
    description:
      "Project the user's end-of-month spending based on current pace, and check against budget. Use for 'Will I exceed my budget?', 'How much will I spend this month?'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month: {
          type: SchemaType.STRING,
          description: "Month in YYYY-MM format. Defaults to current month.",
        },
      },
    },
  },
  {
    name: "calculate_savings_plan",
    description:
      "Create a savings plan for a financial goal. Analyzes current spending patterns and suggests areas to cut. Use for 'How long to save ₹100,000?', 'Create a savings plan', 'I want to save ₹50,000 in 6 months'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        targetAmount: {
          type: SchemaType.NUMBER,
          description:
            "The total amount the user wants to save (in Rupees).",
        },
        targetMonths: {
          type: SchemaType.NUMBER,
          description:
            "Optional number of months to achieve the goal. If omitted, calculates how long it would take at current rate.",
        },
      },
      required: ["targetAmount"],
    },
  },
  {
    name: "get_recurring_expenses",
    description:
      "List all recurring/subscription expenses with their monthly and annual costs. Use for 'What subscriptions do I have?', 'What are my fixed expenses?', 'How much do I spend on subscriptions?'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "search_transactions",
    description:
      "Search and filter the user's transaction history. Use for 'Show my last 5 food expenses', 'What did I spend on Uber?', 'List my income this month'",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Maximum number of transactions to return. Default: 10.",
        },
        category: {
          type: SchemaType.STRING,
          description: "Filter by category (e.g., 'food', 'transportation').",
        },
        type: {
          type: SchemaType.STRING,
          format: "enum",
          description: "Filter by type: 'INCOME' or 'EXPENSE'.",
          enum: ["INCOME", "EXPENSE"],
        },
        merchantName: {
          type: SchemaType.STRING,
          description:
            "Filter by merchant/description name (case-insensitive contains match).",
        },
        startDate: {
          type: SchemaType.STRING,
          description: "Start date filter in ISO 8601 (YYYY-MM-DD).",
        },
        endDate: {
          type: SchemaType.STRING,
          description: "End date filter in ISO 8601 (YYYY-MM-DD).",
        },
      },
    },
  },

  // ── Transaction CRUD Tools ────────────────────────────────
  {
    name: "create_draft_transactions",
    description:
      "Extract and stage new transactions from the user's text or image input. Use when the user mentions spending, earning, or buying something. Generate UUIDs for each transaction's id field.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        transactions: {
          type: SchemaType.ARRAY,
          description: "Array of extracted transaction objects.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: "A unique UUID v4." },
              amount: { type: SchemaType.NUMBER, description: "Transaction amount." },
              date: { type: SchemaType.STRING, description: "ISO 8601 date (YYYY-MM-DD)." },
              description: { type: SchemaType.STRING, description: "What was bought or the purpose." },
              merchantName: { type: SchemaType.STRING, description: "Vendor/store name." },
              category: {
                type: SchemaType.STRING,
                format: "enum",
                description: "Transaction category.",
                enum: [
                  "housing", "transportation", "groceries", "utilities",
                  "entertainment", "food", "shopping", "healthcare",
                  "education", "personal", "travel", "insurance",
                  "gifts", "bills", "other-expense", "salary",
                  "freelance", "investments", "business-income",
                  "rental-income", "other-income",
                ],
              },
              type: {
                type: SchemaType.STRING,
                format: "enum",
                description: "EXPENSE if user paid out, INCOME if user received money.",
                enum: ["INCOME", "EXPENSE"],
              },
            },
            required: ["id", "amount", "date", "description", "merchantName", "category", "type"],
          },
        },
      },
      required: ["transactions"],
    },
  },
  {
    name: "manage_drafts",
    description:
      "Update or remove items from the pending draft transaction list. Use when the user asks to change a draft's category, amount, or remove a specific draft item.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
          format: "enum",
          description: "The draft management action.",
          enum: ["UPDATE_DRAFT", "DELETE_DRAFT"],
        },
        updatedDrafts: {
          type: SchemaType.ARRAY,
          description:
            "The complete updated draft list after modifications. For DELETE_DRAFT, remove the item from the list. For UPDATE_DRAFT, include the modified item with the same id.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              amount: { type: SchemaType.NUMBER },
              date: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              merchantName: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING, format: "enum", enum: ["INCOME", "EXPENSE"] },
            },
            required: ["id", "amount", "date", "description", "merchantName", "category", "type"],
          },
        },
      },
      required: ["action", "updatedDrafts"],
    },
  },
  {
    name: "approve_drafts",
    description:
      "Confirm and save all pending draft transactions to the database. Use when the user says 'yes', 'approve', 'confirm', 'add them', 'looks good'. Do NOT use if there are no pending drafts.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "confirm_delete_transaction",
    description:
      "Find transactions in the database that match the user's deletion request and present them for confirmation. Use when the user wants to delete a logged transaction (not a draft).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Number of matches to find. Default: 1." },
        category: { type: SchemaType.STRING },
        type: { type: SchemaType.STRING, format: "enum", enum: ["INCOME", "EXPENSE"] },
        merchantName: { type: SchemaType.STRING },
        startDate: { type: SchemaType.STRING },
        endDate: { type: SchemaType.STRING },
      },
    },
  },
  {
    name: "execute_delete_transaction",
    description:
      "Execute the deletion of previously confirmed transactions from the database. Only use after confirm_delete_transaction has been called AND the user has explicitly confirmed they want to delete.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];
