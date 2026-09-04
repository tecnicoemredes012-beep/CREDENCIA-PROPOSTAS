import { ProposalItem } from '../types';

export function roundTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateItemTotal(quantity: number, unitPrice: number, discount: number = 0): number {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const disc = Number(discount) || 0;
  const gross = qty * price;
  const net = gross - disc;
  return Math.max(0, roundTwo(net));
}

export interface ProposalCalculations {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  additionalAmount: number;
  finalAmount: number;
}

export function calculateProposalTotals(
  items: ProposalItem[],
  discountMode: 'percent' | 'fixed',
  discountPercentInput: number,
  discountAmountInput: number,
  additionalAmountInput: number
): ProposalCalculations {
  // 1. Calculate items subtotal
  const subtotal = roundTwo(
    items.reduce((acc, item) => {
      const itemTotal = calculateItemTotal(item.quantity, item.unitPrice, item.discount);
      return acc + itemTotal;
    }, 0)
  );

  let discountPercent = Number(discountPercentInput) || 0;
  let discountAmount = Number(discountAmountInput) || 0;
  const additionalAmount = Math.max(0, roundTwo(Number(additionalAmountInput) || 0));

  // 2. Prevent double discount: enforce one mode as primary
  if (discountMode === 'percent') {
    discountPercent = Math.min(100, Math.max(0, discountPercent));
    discountAmount = roundTwo(subtotal * (discountPercent / 100));
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
    discountPercent = subtotal > 0 ? roundTwo((discountAmount / subtotal) * 100) : 0;
  }

  // 3. Final net amount
  const finalAmount = Math.max(0, roundTwo(subtotal - discountAmount + additionalAmount));

  return {
    subtotal,
    discountPercent,
    discountAmount,
    additionalAmount,
    finalAmount
  };
}
