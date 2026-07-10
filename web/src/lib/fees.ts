export const WITHDRAWAL_FEE_PERCENT = 5;

export const WITHDRAWAL_METHODS = [
  { value: "mpesa", label: "M-Pesa", destinationLabel: "Número de telefone" },
  { value: "emola", label: "e-Mola", destinationLabel: "Número de telefone" },
  { value: "payoneer", label: "Payoneer", destinationLabel: "Email da conta Payoneer" },
] as const;

export function computeWithdrawalFee(amount: number) {
  const feeAmount = Math.round(amount * (WITHDRAWAL_FEE_PERCENT / 100) * 100) / 100;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;
  return { feeAmount, netAmount };
}
