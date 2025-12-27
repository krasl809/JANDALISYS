const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://91.144.22.3:8001';

const DASHBOARD_BASE = `${API_BASE_URL}/api/dashboard`;

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