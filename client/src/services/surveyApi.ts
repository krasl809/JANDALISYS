// Survey API Service
import api from './api';
import {
  Survey,
  SurveyListItem,
  SurveyResponse,
  SurveyAnalytics,
  SurveyStatusResponse,
  DraftResponse,
  PaginatedResponse,
  Answer,
} from '../types/surveys';

// ============================================
// Admin API Endpoints (require authentication)
// ============================================

/**
 * Create a new survey
 */
export const createSurvey = async (surveyData: Partial<Survey>): Promise<Survey> => {
  const response = await api.post<Survey>('surveys', surveyData);
  return response.data;
};

/**
 * List surveys with pagination
 */
export const listSurveys = async (
  page: number = 1,
  pageSize: number = 10,
  status?: string,
  search?: string
): Promise<PaginatedResponse<SurveyListItem>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
  });
  
  if (status) {
    params.append('status', status);
  }
  if (search) {
    params.append('search', search);
  }
  
  const response = await api.get<PaginatedResponse<SurveyListItem>>(`surveys?${params.toString()}`);
  return response.data;
};

/**
 * Get survey details by ID
 */
export const getSurvey = async (surveyId: string): Promise<Survey> => {
  const response = await api.get<Survey>(`surveys/${surveyId}`);
  return response.data;
};

/**
 * Update survey
 */
export const updateSurvey = async (surveyId: string, surveyData: Partial<Survey>): Promise<Survey> => {
  const response = await api.put<Survey>(`surveys/${surveyId}`, surveyData);
  return response.data;
};

/**
 * Delete/Archive survey
 */
export const deleteSurvey = async (surveyId: string): Promise<void> => {
  await api.delete(`surveys/${surveyId}`);
};

/**
 * Duplicate survey
 */
export const duplicateSurvey = async (surveyId: string): Promise<Survey> => {
  const response = await api.post<Survey>(`surveys/${surveyId}/duplicate`);
  return response.data;
};

/**
 * Get survey analytics
 */
export const getSurveyAnalytics = async (surveyId: string): Promise<SurveyAnalytics> => {
  const response = await api.get<SurveyAnalytics>(`surveys/${surveyId}/analytics`);
  return response.data;
};

/**
 * Get survey responses
 */
export const getSurveyResponses = async (
  surveyId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<SurveyResponse>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
  });
  
  const response = await api.get<PaginatedResponse<SurveyResponse>>(
    `surveys/${surveyId}/responses?${params.toString()}`
  );
  return response.data;
};

/**
 * Get single response details
 */
export const getSurveyResponse = async (surveyId: string, responseId: string): Promise<SurveyResponse> => {
  const response = await api.get<SurveyResponse>(`surveys/${surveyId}/responses/${responseId}`);
  return response.data;
};

/**
 * Export survey to CSV
 */
export const exportSurveyCSV = async (surveyId: string): Promise<Blob> => {
  const response = await api.get(`surveys/${surveyId}/export/csv`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Export survey to JSON
 */
export const exportSurveyJSON = async (surveyId: string): Promise<Blob> => {
  const response = await api.get(`surveys/${surveyId}/export/json`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download exported file
 */
export const downloadExportedFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================
// Public API Endpoints (no authentication)
// ============================================

/**
 * Get public survey for filling
 */
export const getPublicSurvey = async (surveyId: string): Promise<Survey> => {
  const response = await api.get<Survey>(`public/surveys/${surveyId}`);
  return response.data;
};

/**
 * Submit survey response
 */
export const submitSurveyResponse = async (
  surveyId: string,
  data: {
    is_anonymous: boolean;
    respondent_email?: string;
    respondent_name?: string;
    respondent_position?: string;
    answers: Answer[];
  }
): Promise<{ message: string; response_id: string }> => {
  const response = await api.post(`public/surveys/${surveyId}/submit`, data);
  return response.data;
};

/**
 * Save draft response
 */
export const saveDraftResponse = async (
  surveyId: string,
  data: {
    is_anonymous: boolean;
    respondent_email?: string;
    respondent_name?: string;
    respondent_position?: string;
    answers: Answer[];
    current_step: number;
  }
): Promise<{ message: string; draft_id: string }> => {
  const response = await api.post(`public/surveys/${surveyId}/draft`, data);
  return response.data;
};

/**
 * Get draft response
 */
export const getDraftResponse = async (surveyId: string, draftId: string): Promise<DraftResponse> => {
  const response = await api.get<DraftResponse>(`public/surveys/${surveyId}/draft/${draftId}`);
  return response.data;
};

/**
 * Check survey status
 */
export const checkSurveyStatus = async (surveyId: string): Promise<SurveyStatusResponse> => {
  const response = await api.get<SurveyStatusResponse>(`public/surveys/${surveyId}/status`);
  return response.data;
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate survey URL
 */
export const getSurveyUrl = (surveyId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/survey/${surveyId}`;
};

/**
 * Generate QR code URL (using external service)
 */
export const getQRCodeUrl = (surveyId: string, size: number = 200): string => {
  const surveyUrl = getSurveyUrl(surveyId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(surveyUrl)}`;
};

/**
 * Copy survey link to clipboard
 */
export const copySurveyLink = async (surveyId: string): Promise<boolean> => {
  try {
    const url = getSurveyUrl(surveyId);
    // Clipboard API requires a secure context (HTTPS) except localhost.
    // Our app may run on a LAN IP over HTTP during development.
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) {
      throw new Error('execCommand(copy) returned false');
    }
    return true;
  } catch (error) {
    console.error('Failed to copy survey link:', error);
    return false;
  }
};

/**
 * Local storage helpers for draft autosave
 */
const DRAFT_STORAGE_KEY = 'survey_drafts';

export const saveDraftToLocalStorage = (surveyId: string, draft: DraftResponse): void => {
  try {
    const drafts = getDraftsFromLocalStorage();
    drafts[surveyId] = {
      ...draft,
      saved_at: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save draft to localStorage:', error);
  }
};

export const getDraftFromLocalStorage = (surveyId: string): DraftResponse | null => {
  try {
    const drafts = getDraftsFromLocalStorage();
    return drafts[surveyId] || null;
  } catch (error) {
    console.error('Failed to get draft from localStorage:', error);
    return null;
  }
};

export const removeDraftFromLocalStorage = (surveyId: string): void => {
  try {
    const drafts = getDraftsFromLocalStorage();
    delete drafts[surveyId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to remove draft from localStorage:', error);
  }
};

const getDraftsFromLocalStorage = (): Record<string, DraftResponse> => {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Export all functions as default object
export default {
  // Admin
  createSurvey,
  listSurveys,
  getSurvey,
  updateSurvey,
  deleteSurvey,
  duplicateSurvey,
  getSurveyAnalytics,
  getSurveyResponses,
  getSurveyResponse,
  exportSurveyCSV,
  exportSurveyJSON,
  downloadExportedFile,
  // Public
  getPublicSurvey,
  submitSurveyResponse,
  saveDraftResponse,
  getDraftResponse,
  checkSurveyStatus,
  // Helpers
  getSurveyUrl,
  getQRCodeUrl,
  copySurveyLink,
  saveDraftToLocalStorage,
  getDraftFromLocalStorage,
  removeDraftFromLocalStorage,
};
