export const WITHDRAWAL_METHODS = ["mpesa", "emola", "payoneer"] as const;
export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

export const WITHDRAWAL_FEE_PERCENT = 5;

/** Matches the "Informações sobre Saques" copy: valor líquido = valor
 * solicitado menos a taxa de 5%. Rounded to cents. */
export function computeWithdrawalFee(amount: number) {
  const feeAmount = Math.round(amount * (WITHDRAWAL_FEE_PERCENT / 100) * 100) / 100;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;
  return { feeAmount, netAmount };
}
