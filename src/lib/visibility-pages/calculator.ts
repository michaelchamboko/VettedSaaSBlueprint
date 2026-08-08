export type CalculatorInput = {
  monthlyFee: number;
  setupFee: number;
  monthlyContacts: number;
  monthlySends: number;
  monthlyOverage: number;
};

export type CalculatorResult = {
  annualTotal: number;
  monthlyAverage: number;
  costPerContact: number | null;
  costPerThousandSends: number | null;
};

const MAX_INPUT = 1_000_000_000;

function finiteNonnegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MAX_INPUT);
}

export function calculateEmailMarketingCost(input: CalculatorInput): CalculatorResult {
  const monthlyFee = finiteNonnegative(input.monthlyFee);
  const setupFee = finiteNonnegative(input.setupFee);
  const contacts = finiteNonnegative(input.monthlyContacts);
  const sends = finiteNonnegative(input.monthlySends);
  const overage = finiteNonnegative(input.monthlyOverage);
  const annualTotal = (monthlyFee + overage) * 12 + setupFee;

  return {
    annualTotal,
    monthlyAverage: annualTotal / 12,
    costPerContact: contacts === 0 ? null : annualTotal / (contacts * 12),
    costPerThousandSends: sends === 0 ? null : annualTotal / (sends * 12) * 1000,
  };
}
