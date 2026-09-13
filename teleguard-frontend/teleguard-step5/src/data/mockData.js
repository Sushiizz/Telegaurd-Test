/**
 * Sample data matching the exact shape of /api/overview and /api/customers.
 * Used only as a fallback when the real API isn't reachable, so the UI is
 * never a blank screen during frontend development — never used once the
 * backend responds successfully. See hooks/useOverview.js and useCustomers.js.
 */

export const mockOverview = {
  total_customers: 7043,
  total_at_risk_revenue: 138902.45,
  fleet_churn_rate: 0.2654,
  average_ros: 34.2,
  potential_value_saved: 96210.88,
  risk_distribution: { CRITICAL: 412, HIGH: 890, MEDIUM: 1560, LOW: 4181 },
};

export const mockCustomers = [
  { customer_id: "9305-CKSKC", tenure_months: 2, monthly_charges: 89.1, contract_type: "Month-to-month", churn_probability: 0.91, risk_level: "CRITICAL", cltv: 187.4, retention_opportunity_score: 88 },
  { customer_id: "7590-VHVEG", tenure_months: 1, monthly_charges: 29.85, contract_type: "Month-to-month", churn_probability: 0.88, risk_level: "CRITICAL", cltv: 110.58, retention_opportunity_score: 46 },
  { customer_id: "3668-QPYBK", tenure_months: 2, monthly_charges: 83.85, contract_type: "Month-to-month", churn_probability: 0.82, risk_level: "CRITICAL", cltv: 620.31, retention_opportunity_score: 79 },
  { customer_id: "1452-KIOVK", tenure_months: 5, monthly_charges: 95.7, contract_type: "Month-to-month", churn_probability: 0.76, risk_level: "CRITICAL", cltv: 902.14, retention_opportunity_score: 91 },
  { customer_id: "6388-TABGU", tenure_months: 9, monthly_charges: 61.9, contract_type: "One year", churn_probability: 0.68, risk_level: "HIGH", cltv: 1310.5, retention_opportunity_score: 74 },
  { customer_id: "9763-GRSKD", tenure_months: 13, monthly_charges: 49.95, contract_type: "Month-to-month", churn_probability: 0.61, risk_level: "HIGH", cltv: 705.22, retention_opportunity_score: 58 },
  { customer_id: "8091-TTVAX", tenure_months: 22, monthly_charges: 73.3, contract_type: "Month-to-month", churn_probability: 0.57, risk_level: "HIGH", cltv: 1189.44, retention_opportunity_score: 63 },
  { customer_id: "0280-XJGEX", tenure_months: 45, monthly_charges: 105.2, contract_type: "One year", churn_probability: 0.34, risk_level: "MEDIUM", cltv: 2450.1, retention_opportunity_score: 41 },
  { customer_id: "4190-MFLUW", tenure_months: 31, monthly_charges: 55.0, contract_type: "One year", churn_probability: 0.29, risk_level: "MEDIUM", cltv: 1590.6, retention_opportunity_score: 28 },
  { customer_id: "5575-GNVDE", tenure_months: 34, monthly_charges: 56.95, contract_type: "Two year", churn_probability: 0.05, risk_level: "LOW", cltv: 2050.2, retention_opportunity_score: 3 },
  { customer_id: "7795-CFOCW", tenure_months: 45, monthly_charges: 42.3, contract_type: "One year", churn_probability: 0.08, risk_level: "LOW", cltv: 1780.0, retention_opportunity_score: 5 },
  { customer_id: "9237-HQITU", tenure_months: 58, monthly_charges: 39.65, contract_type: "Two year", churn_probability: 0.03, risk_level: "LOW", cltv: 1980.9, retention_opportunity_score: 2 },
];

export function paginateMock({ page = 1, pageSize = 25, riskLevel, contractType, search, sortBy = "retention_opportunity_score", sortDir = "desc" } = {}) {
  let rows = [...mockCustomers];
  if (riskLevel) rows = rows.filter((r) => r.risk_level === riskLevel);
  if (contractType) rows = rows.filter((r) => r.contract_type === contractType);
  if (search) rows = rows.filter((r) => r.customer_id.toLowerCase().includes(search.toLowerCase()));
  rows.sort((a, b) => (sortDir === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]));

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total_items: totalItems,
    total_pages: totalPages,
  };
}
