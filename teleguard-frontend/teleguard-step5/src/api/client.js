const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* response wasn't JSON — fall back to statusText */
    }
    throw new ApiError(detail, res.status);
  }

  return res.json();
}

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// -- Executive KPIs ----------------------------------------------------

export function getOverview() {
  return request("/api/overview");
}

// -- Prioritized Retention Table ----------------------------------------

export function getCustomers({
  riskLevel,
  contractType,
  search,
  sortBy = "retention_opportunity_score",
  sortDir = "desc",
  page = 1,
  pageSize = 25,
} = {}) {
  const qs = toQueryString({
    risk_level: riskLevel,
    contract_type: contractType,
    search,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    page_size: pageSize,
  });
  return request(`/api/customers${qs}`);
}

// -- Customer 360 ---------------------------------------------------------

export function getCustomerDetail(customerId) {
  return request(`/api/customer/${encodeURIComponent(customerId)}`);
}

// -- What-If Simulator ------------------------------------------------------

export function simulateOffer({ customerId, discountPct, addTechSupport }) {
  return request("/api/simulate", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      discount_pct: discountPct,
      add_tech_support: addTechSupport,
    }),
  });
}

// -- Autonomous Retention Agent -------------------------------------------

export function queryAgent({ query, conversationId }) {
  return request("/api/agent/query", {
    method: "POST",
    body: JSON.stringify({ query, conversation_id: conversationId }),
  });
}

export { ApiError };
