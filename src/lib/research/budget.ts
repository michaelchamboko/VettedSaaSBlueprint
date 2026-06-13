export function hasBudgetRemaining(spent: number, limit: number) {
  return spent < limit;
}

export function nextBudgetSpend(spent: number, amount: number) {
  return spent + amount;
}

export function budgetExceeded(spent: number, limit: number) {
  return spent > limit;
}
