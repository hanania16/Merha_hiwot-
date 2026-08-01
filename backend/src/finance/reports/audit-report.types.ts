/** Shape returned by FinanceReportsService.monthlyReport/yearlyReport (auditRollup). */
export type AuditReport = {
  kind: 'monthly' | 'yearly';
  period: { from: Date; to: Date };
  summary: { totalIncome: number; totalExpense: number; net: number; incomeCount: number; expenseCount: number };
  incomeBySourceType: Record<string, { total: number; count: number; recordIds: string[] }>;
  expenseByCategory: Record<string, { total: number; count: number; recordIds: string[] }>;
  accountBalances: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    reconciliationId: string | null;
    expectedBalance: number | null;
    actualBalance: number | null;
    discrepancy: number | null;
    status: string | null;
    periodStart: Date | null;
    periodEnd: Date | null;
  }>;
  discrepancies: Array<{
    reconciliationId: string;
    accountId: string;
    accountName: string;
    expectedBalance: number;
    actualBalance: number;
    discrepancy: number;
    status: string;
    resolutionNotes: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }>;
  missingReceipts: {
    total: number;
    records: Array<{ id: string; date: Date; amount: number; sourceType: string; status: string; accountId: string; description: string | null }>;
  };
  pendingApprovals: {
    total: number;
    income: Array<{ id: string; date: Date; amount: number; sourceType: string; createdAt: Date; accountId: string }>;
    expense: Array<{ id: string; date: Date; amount: number; category: string; createdAt: Date; accountId: string }>;
  };
  adjustments: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    reason: string | null;
    changedById: string | null;
    changedByName: string | null;
    createdAt: Date;
    oldValue: unknown;
    newValue: unknown;
  }>;
  requiresReview: { total: number; items: Array<Record<string, unknown>> };
};
