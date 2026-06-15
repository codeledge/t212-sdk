import { T212_FX_FEE_RATE } from "../consts";

export function calcSellPrice({
  basePrice,
  quantity,
  exchangeRate,
  accountCurrencyMinProfit,
}: {
  basePrice: number;
  quantity: number;
  exchangeRate?: number; // instrument currency → account currency (e.g. USD→GBP)
  accountCurrencyMinProfit: number;
}): number {
  const buyFee = basePrice * quantity * T212_FX_FEE_RATE;

  let instrumentCurrencyIncrease;
  if (exchangeRate) {
    instrumentCurrencyIncrease = accountCurrencyMinProfit / exchangeRate;
  } else {
    instrumentCurrencyIncrease = accountCurrencyMinProfit;
  }

  const sellPrice =
    (basePrice + buyFee + instrumentCurrencyIncrease) / (1 - T212_FX_FEE_RATE); // This will subtract the sell fee

  return Number(sellPrice.toFixed(2));
}
