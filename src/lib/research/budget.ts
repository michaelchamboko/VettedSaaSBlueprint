export function hasBudgetRemaining(spent: number, limit: number) {
  return spent < limit;
}

export function nextBudgetSpend(spent: number, amount: number) {
  return spent + amount;
}

export function budgetExceeded(spent: number, limit: number) {
  return spent > limit;
}

export function withinBudget(spent: number, amount: number, limit: number) {
  return spent + amount <= limit;
}

export function shouldPauseResearchLoop(spent: number, limit: number) {
  return !hasBudgetRemaining(spent, limit);
}
