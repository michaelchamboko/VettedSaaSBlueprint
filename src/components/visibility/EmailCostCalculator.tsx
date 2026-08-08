"use client";

import { useMemo, useState } from "react";

import { calculateEmailMarketingCost, type CalculatorInput } from "@/lib/visibility-pages/calculator";

const initial: CalculatorInput = { monthlyFee: 0, setupFee: 0, monthlyContacts: 0, monthlySends: 0, monthlyOverage: 0 };

export function EmailCostCalculator() {
  const [input, setInput] = useState<CalculatorInput>(initial);
  const result = useMemo(() => calculateEmailMarketingCost(input), [input]);
  const fields: Array<[keyof CalculatorInput, string]> = [
    ["monthlyFee", "Monthly platform fee"],
    ["setupFee", "One-time setup fee"],
    ["monthlyOverage", "Monthly overage"],
    ["monthlyContacts", "Contacts"],
    ["monthlySends", "Monthly sends"],
  ];

  return (
    <section aria-labelledby="email-cost-calculator">
      <h2 id="email-cost-calculator">Estimate your email-marketing cost</h2>
      <p>Enter your own assumptions. This tool does not include vendor pricing or store your inputs.</p>
      {fields.map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            inputMode="decimal"
            min="0"
            type="number"
            value={input[key]}
            onChange={(event) => setInput((current) => ({ ...current, [key]: Number(event.target.value) }))}
          />
        </label>
      ))}
      <output aria-live="polite">
        <p>Estimated annual total: {result.annualTotal.toFixed(2)}</p>
        <p>Average monthly cost: {result.monthlyAverage.toFixed(2)}</p>
        <p>Cost per contact: {result.costPerContact === null ? "Add contacts to calculate." : result.costPerContact.toFixed(4)}</p>
        <p>Cost per 1,000 sends: {result.costPerThousandSends === null ? "Add sends to calculate." : result.costPerThousandSends.toFixed(2)}</p>
      </output>
    </section>
  );
}
