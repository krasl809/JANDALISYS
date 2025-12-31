const API_BASE_URL = '';

const DASHBOARD_BASE = `/dashboard`;

export const API_ENDPOINTS = {
  DASHBOARD: {
    PROFIT_CHART: `${DASHBOARD_BASE}/profit-chart`,
    OPERATIONAL_DATA: `${DASHBOARD_BASE}/operational-data`,
    PIPELINE: `${DASHBOARD_BASE}/pipeline`,
    RISKS: `${DASHBOARD_BASE}/risks`,
    STATS: `${DASHBOARD_BASE}/stats`,
  },
} as const;

export default API_BASE_URL;