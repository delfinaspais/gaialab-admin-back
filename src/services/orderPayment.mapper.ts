import type { TiendanubeOrder } from "../types/tiendanube";
import type { TiendanubeTransaction } from "./tiendanube/transaction.service";

function toDecimalString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

function sumChargesByType(
  transactions: TiendanubeTransaction[],
  type: string
): string | null {
  let total = 0;
  let found = false;

  for (const transaction of transactions) {
    for (const charge of transaction.merchant_charges ?? []) {
      if (charge.type === type) {
        total += Math.abs(parseFloat(charge.amount.value));
        found = true;
      }
    }
  }

  return found ? total.toFixed(2) : null;
}

function sumAllMerchantCharges(transactions: TiendanubeTransaction[]): string | null {
  let total = 0;
  let found = false;

  for (const transaction of transactions) {
    for (const charge of transaction.merchant_charges ?? []) {
      total += Math.abs(parseFloat(charge.amount.value));
      found = true;
    }
  }

  return found ? total.toFixed(2) : null;
}

function isInterestFree(interest: string | undefined): boolean | null {
  if (interest === undefined) {
    return null;
  }
  return parseFloat(interest) === 0;
}

function formatPaymentMethod(order: TiendanubeOrder, transaction?: TiendanubeTransaction): string | null {
  const method = order.payment_details?.method;
  const gateway = order.gateway_name;
  const cardType = transaction?.payment_method?.type;

  const parts = [method, gateway, cardType].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

export interface OrderPaymentData {
  subtotal: string | null;
  shippingCost: string | null;
  shippingCostOwner: string | null;
  shippingMethod: string | null;
  discount: string | null;
  totalPaidByCustomer: string | null;
  processingFee: string | null;
  installmentsFee: string | null;
  netTotal: string | null;
  currency: string | null;
  paymentMethod: string | null;
  paymentGateway: string | null;
  cardBrand: string | null;
  cardLastDigits: string | null;
  installments: number | null;
  installmentsInterestFree: boolean | null;
  transactionId: string | null;
}

export function mapOrderPaymentData(
  order: TiendanubeOrder,
  transactions: TiendanubeTransaction[]
): OrderPaymentData {
  const primaryTransaction = transactions[0];
  const processingFee = sumChargesByType(transactions, "payment_processing_fee");
  const installmentsFee = sumChargesByType(transactions, "financing_cost");
  const totalMerchantFees = sumAllMerchantCharges(transactions);

  const totalPaid =
    toDecimalString(order.total_paid_by_customer) ??
    toDecimalString(order.total_paid_by_customer_including_fees) ??
    toDecimalString(order.total);

  let netTotal: string | null = null;
  if (totalPaid && totalMerchantFees) {
    netTotal = (parseFloat(totalPaid) - parseFloat(totalMerchantFees)).toFixed(2);
  }

  const cardBrand =
    primaryTransaction?.info?.card?.brand ??
    order.payment_details?.credit_card_company ??
    null;

  const cardLastDigits = primaryTransaction?.info?.card?.last_digits ?? null;

  const installments =
    primaryTransaction?.info?.installments?.quantity ??
    order.payment_details?.installments ??
    null;

  const installmentsInterestFree = isInterestFree(
    primaryTransaction?.info?.installments?.interest
  );

  const transactionId =
    primaryTransaction?.id ??
    primaryTransaction?.info?.external_id ??
    order.gateway_id ??
    null;

  return {
    subtotal: toDecimalString(order.subtotal),
    shippingCost: toDecimalString(order.shipping_cost_customer),
    shippingCostOwner: toDecimalString(order.shipping_cost_owner),
    shippingMethod: order.shipping_option ?? null,
    discount: toDecimalString(order.discount),
    totalPaidByCustomer: totalPaid,
    processingFee,
    installmentsFee,
    netTotal,
    currency: order.currency ?? primaryTransaction?.captured_amount?.currency ?? null,
    paymentMethod: formatPaymentMethod(order, primaryTransaction),
    paymentGateway: order.gateway_name ?? null,
    cardBrand,
    cardLastDigits,
    installments,
    installmentsInterestFree,
    transactionId: transactionId ? String(transactionId) : null,
  };
}
