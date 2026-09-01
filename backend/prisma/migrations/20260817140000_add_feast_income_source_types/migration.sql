-- Add three new income source types: Debre Tabor, New Year (Enkutatash),
-- and Meskel feasts.
ALTER TYPE "IncomeSourceType" ADD VALUE IF NOT EXISTS 'DEBRE_TABOR_FEAST';
ALTER TYPE "IncomeSourceType" ADD VALUE IF NOT EXISTS 'NEW_YEAR';
ALTER TYPE "IncomeSourceType" ADD VALUE IF NOT EXISTS 'MESKEL_FEAST';