const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return usdFull.format(value);
}

export function formatCurrencyCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return usdCompact.format(value);
}

export function formatPercent(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatTenure(months) {
  if (months === null || months === undefined) return "—";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

/** Sentence-case display label for the API's UPPERCASE risk_level enum. */
export function riskLabel(riskLevel) {
  if (!riskLevel) return "Unknown";
  return riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase();
}

const CATEGORY_COPY = {
  Contract: "Contract terms",
  Billing: "Billing & payment",
  Service: "Service usage",
  Tenure: "Account tenure",
  Demographic: "Demographic",
  Other: "Other factor",
};

export function humanizeCategory(category) {
  return CATEGORY_COPY[category] || category || "Other factor";
}

export function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
