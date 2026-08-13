import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "MZN" | "ZAR" = "MZN") {
  return `${amount.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function walletSourceLabel(walletSource: "producer" | "dev" | "cto" | "sponsor") {
  if (walletSource === "dev") return "Programador";
  if (walletSource === "cto") return "CTO";
  if (walletSource === "sponsor") return "Patrocinador";
  return "Produtor";
}

const DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
