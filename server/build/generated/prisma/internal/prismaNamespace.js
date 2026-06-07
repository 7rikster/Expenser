import * as runtime from "@prisma/client/runtime/client";
export const PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
export const PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
export const PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
export const PrismaClientInitializationError = runtime.PrismaClientInitializationError;
export const PrismaClientValidationError = runtime.PrismaClientValidationError;
export const sql = runtime.sqltag;
export const empty = runtime.empty;
export const join = runtime.join;
export const raw = runtime.raw;
export const Sql = runtime.Sql;
export const Decimal = runtime.Decimal;
export const getExtensionContext = runtime.Extensions.getExtensionContext;
export const prismaVersion = {
    client: "7.3.0",
    engine: "9d6ad21cbbceab97458517b147a6a09ff43aa735"
};
export const NullTypes = {
    DbNull: runtime.NullTypes.DbNull,
    JsonNull: runtime.NullTypes.JsonNull,
    AnyNull: runtime.NullTypes.AnyNull,
};
export const DbNull = runtime.DbNull;
export const JsonNull = runtime.JsonNull;
export const AnyNull = runtime.AnyNull;
export const ModelName = {
    User: 'User',
    DailyExpense: 'DailyExpense',
    DailyExpenseItem: 'DailyExpenseItem',
    MonthlyExpense: 'MonthlyExpense',
    MonthlyExpenseItem: 'MonthlyExpenseItem',
    MonthlyIncome: 'MonthlyIncome',
    MonthlyIncomeItem: 'MonthlyIncomeItem',
    Transaction: 'Transaction'
};
export const TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
export const UserScalarFieldEnum = {
    id: 'id',
    clerkUserId: 'clerkUserId',
    email: 'email',
    name: 'name',
    imageUrl: 'imageUrl',
    dailyBudget: 'dailyBudget',
    monthlyBudget: 'monthlyBudget',
    balance: 'balance',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const DailyExpenseScalarFieldEnum = {
    id: 'id',
    date: 'date',
    total: 'total',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const DailyExpenseItemScalarFieldEnum = {
    id: 'id',
    category: 'category',
    amount: 'amount',
    dailyId: 'dailyId'
};
export const MonthlyExpenseScalarFieldEnum = {
    id: 'id',
    month: 'month',
    total: 'total',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const MonthlyExpenseItemScalarFieldEnum = {
    id: 'id',
    category: 'category',
    amount: 'amount',
    monthId: 'monthId'
};
export const MonthlyIncomeScalarFieldEnum = {
    id: 'id',
    month: 'month',
    total: 'total',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const MonthlyIncomeItemScalarFieldEnum = {
    id: 'id',
    category: 'category',
    amount: 'amount',
    monthId: 'monthId'
};
export const TransactionScalarFieldEnum = {
    id: 'id',
    type: 'type',
    amount: 'amount',
    description: 'description',
    date: 'date',
    category: 'category',
    receiptUrl: 'receiptUrl',
    isRecurring: 'isRecurring',
    recurringInterval: 'recurringInterval',
    nextRecurringDate: 'nextRecurringDate',
    lastProcessed: 'lastProcessed',
    status: 'status',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
};
export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
};
export const NullsOrder = {
    first: 'first',
    last: 'last'
};
export const defineExtension = runtime.Extensions.defineExtension;
