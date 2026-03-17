// Survey System TypeScript Interfaces
import * as yup from 'yup';

// Question Types
export type QuestionType = 
  | 'likert_5' 
  | 'likert_7' 
  | 'open_text' 
  | 'open_text_long'
  | 'single_choice' 
  | 'multiple_choice' 
  | 'dropdown' 
  | 'rating' 
  | 'yes_no' 
  | 'nps' 
  | 'scale';

// Survey Status
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'closed' | 'archived';

// Question Option
export interface QuestionOption {
  id: string;
  label: string;
  label_ar?: string;
  value: string;
  order: number;
}

// Survey Question
export interface SurveyQuestion {
  id: string;
  question_text?: string;
  question_type: QuestionType;
  help_text?: string;
  order_index?: number;
  page_number?: number;
  section?: string;
  is_required?: boolean;
  options?: QuestionOption[];
  validation_rules?: Record<string, any>;
  conditional_logic?: Record<string, any>;
  // Client UI fields (for display/editing)
  title?: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  required?: boolean;
  order?: number;
  // Scale-specific settings
  min_value?: number;
  max_value?: number;
  min_label?: string;
  max_label?: string;
  min_label_ar?: string;
  max_label_ar?: string;
  // Validation
  validation_regex?: string;
  validation_message?: string;
  validation_message_ar?: string;
  max_length?: number;
  // Settings
  settings?: {
    allow_other?: boolean;
    other_label?: string;
    other_label_ar?: string;
    randomize_options?: boolean;
    show_as_grid?: boolean;
    step_size?: number;
  };
}

// Survey
export interface Survey {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  welcome_message?: string;
  welcome_message_ar?: string;
  thank_you_message?: string;
  thank_you_message_ar?: string;
  status: SurveyStatus;
  questions: SurveyQuestion[];
  settings: SurveySettings;
  created_at: string;
  updated_at: string;
  created_by: string;
  expires_at?: string;
  response_count?: number;
  is_anonymous_allowed: boolean;
  is_draft_autosave: boolean;
  theme?: SurveyTheme;
  company_name?: string;
  show_company_name?: boolean;
}

// Survey Settings
export interface SurveySettings {
  // Server schema fields (optional to allow client-side usage)
  welcome_message?: string;
  thank_you_message?: string;
  is_anonymous?: boolean;
  allow_multiple?: boolean;
  show_progress?: boolean;
  shuffle_questions?: boolean;
  require_all_questions?: boolean;
  collect_email?: boolean;
  email_required?: boolean;
  max_responses?: number | null;
  redirect_url?: string | null;
  notify_on_response?: boolean;
  notification_emails?: string[] | null;
  company_name?: string;
  show_company_name?: boolean;
  // Client UI fields (for convenience)
  is_public?: boolean;
  require_auth?: boolean;
  allow_multiple_responses?: boolean;
  show_progress_bar?: boolean;
  show_question_numbers?: boolean;
  one_question_per_page?: boolean;
  collect_name?: boolean;
  name_required?: boolean;
  collect_position?: boolean;
  position_required?: boolean;
  show_results_after_submit?: boolean;
  language?: 'en' | 'ar' | 'both';
}

// Survey Theme
export interface SurveyTheme {
  primary_color?: string;
  background_color?: string;
  font_family?: string;
  logo_url?: string;
  custom_css?: string;
}

// Answer for a question
export interface Answer {
  question_id: string;
  answer_value: string | string[] | number | boolean | null;
  other_value?: string;
  timestamp: string;
}

// Survey Response (submission)
export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id?: string;
  is_anonymous: boolean;
  respondent_email?: string;
  respondent_name?: string;
  answers: Answer[];
  started_at: string;
  submitted_at: string;
  time_spent_seconds: number;
  completion_percentage: number;
  ip_address?: string;
  user_agent?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
}

// Draft Response
export interface DraftResponse {
  survey_id: string;
  answers: Answer[];
  current_step: number;
  saved_at: string;
  is_anonymous: boolean;
  respondent_email?: string;
  respondent_name?: string;
}

// Analytics Data Types
export interface SurveyAnalytics {
  survey_id: string;
  total_responses: number;
  completed_responses: number;
  partial_responses: number;
  average_completion_time_seconds: number;
  completion_rate: number;
  responses_over_time: ResponseTimeData[];
  question_analytics: QuestionAnalytics[];
  device_breakdown: DeviceBreakdown;
  sentiment_analysis?: SentimentAnalysis;
}

export interface ResponseTimeData {
  date: string;
  count: number;
  completed: number;
}

export interface QuestionAnalytics {
  question_id: string;
  question_title: string;
  question_type: QuestionType;
  response_count: number;
  skip_rate: number;
  average_value?: number;
  distribution: AnswerDistribution[];
  sentiment_score?: number;
  word_cloud?: WordFrequency[];
}

export interface AnswerDistribution {
  value: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  average_score: number;
}

export interface WordFrequency {
  word: string;
  count: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Survey List Item (simplified for listing)
export interface SurveyListItem {
  id: string;
  title: string;
  title_ar?: string;
  status: SurveyStatus;
  response_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  created_by: string;
}

// Survey Status Response
export interface SurveyStatusResponse {
  id: string;
  status: SurveyStatus;
  title: string;
  is_active: boolean;
  message?: string;
}

// Yup Validation Schemas

// Question Option Schema
export const QuestionOptionSchema = yup.object({
  id: yup.string().optional(),
  label: yup.string().required('Option label is required'),
  label_ar: yup.string().optional(),
  value: yup.string().required('Option value is required'),
  order: yup.number().integer().min(0).default(0),
});

// Survey Question Schema
export const SurveyQuestionSchema = yup.object({
  id: yup.string().optional(),
  question_text: yup.string().required('Question text is required'),
  question_type: yup.string().oneOf([
    'likert_5', 'likert_7', 'open_text', 'open_text_long', 'single_choice', 
    'multiple_choice', 'dropdown', 'rating', 'yes_no', 'nps', 'scale'
  ]).required(),
  help_text: yup.string().optional(),
  order_index: yup.number().integer().min(0).default(0),
  page_number: yup.number().integer().min(1).default(1),
  section: yup.string().optional(),
  is_required: yup.boolean().default(false),
  options: yup.array().of(QuestionOptionSchema).optional(),
  validation_rules: yup.object().optional(),
  conditional_logic: yup.object().optional(),
});

// Survey Settings Schema
export const SurveySettingsSchema = yup.object({
  welcome_message: yup.string().optional(),
  thank_you_message: yup.string().optional(),
  is_anonymous: yup.boolean().default(true),
  allow_multiple: yup.boolean().default(false),
  show_progress: yup.boolean().default(true),
  shuffle_questions: yup.boolean().default(false),
  require_all_questions: yup.boolean().default(false),
  collect_email: yup.boolean().default(false),
  email_required: yup.boolean().default(false),
  collect_name: yup.boolean().default(false),
  name_required: yup.boolean().default(false),
  collect_position: yup.boolean().default(false),
  position_required: yup.boolean().default(false),
  max_responses: yup.number().integer().min(1).optional().nullable(),
  redirect_url: yup.string().url().optional().nullable(),
  notify_on_response: yup.boolean().default(false),
  notification_emails: yup.array().of(yup.string().email()).optional().nullable(),
  company_name: yup.string().optional(),
  show_company_name: yup.boolean().default(true),
});

// Survey Theme Schema
export const SurveyThemeSchema = yup.object({
  primary_color: yup.string().matches(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  background_color: yup.string().matches(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  font_family: yup.string().optional(),
  logo_url: yup.string().url().optional(),
  custom_css: yup.string().optional(),
});

// Survey Schema (for creation/update)
export const SurveySchema = yup.object({
  title: yup.string().required('Survey title is required').max(255),
  title_ar: yup.string().max(255).optional(),
  description: yup.string().optional(),
  description_ar: yup.string().optional(),
  welcome_message: yup.string().optional(),
  welcome_message_ar: yup.string().optional(),
  thank_you_message: yup.string().optional(),
  thank_you_message_ar: yup.string().optional(),
  status: yup.string().oneOf(['draft', 'active', 'paused', 'closed', 'archived']).default('draft'),
  questions: yup.array().of(SurveyQuestionSchema).min(1, 'At least one question is required'),
  settings: SurveySettingsSchema.default({}),
  expires_at: yup.string().optional().nullable(),
  is_anonymous_allowed: yup.boolean().default(true),
  is_draft_autosave: yup.boolean().default(true),
  theme: SurveyThemeSchema.optional(),
});

// Answer Schema
export const AnswerSchema = yup.object({
  question_id: yup.string().required(),
  answer_value: yup.mixed().nullable(),
  other_value: yup.string().optional(),
  timestamp: yup.string().optional(),
});

// Survey Response Schema
export const SurveyResponseSchema = yup.object({
  survey_id: yup.string().required(),
  is_anonymous: yup.boolean().default(true),
  respondent_email: yup.string().email().optional(),
  respondent_name: yup.string().optional(),
  answers: yup.array().of(AnswerSchema),
});

// Partial schemas for updates
export const SurveyUpdateSchema = SurveySchema;
export const SurveyQuestionUpdateSchema = SurveyQuestionSchema;

// Type guards
export function isTextQuestion(type: QuestionType): boolean {
  return type === 'open_text';
}

export function isChoiceQuestion(type: QuestionType): boolean {
  return ['single_choice', 'multiple_choice', 'dropdown'].includes(type);
}

export function isScaleQuestion(type: QuestionType): boolean {
  return ['likert_5', 'likert_7', 'rating', 'nps', 'scale'].includes(type);
}

export function requiresOptions(type: QuestionType): boolean {
  return ['single_choice', 'multiple_choice', 'dropdown'].includes(type);
}

// Helper function to get default answer value for question type
export function getDefaultAnswerValue(type: QuestionType): string | string[] | number | boolean | null {
  switch (type) {
    case 'open_text':
    case 'open_text_long':
      return '';
    case 'single_choice':
    case 'dropdown':
      return null;
    case 'multiple_choice':
      return [];
    case 'likert_5':
    case 'likert_7':
    case 'rating':
    case 'nps':
    case 'scale':
      return 0;
    case 'yes_no':
      return false;
    default:
      return null;
  }
}

// Likert scale labels
export const LIKERT_5_LABELS = [
  { value: 1, label: 'Strongly Agree', label_ar: 'أوافق بشدة' },
  { value: 2, label: 'Agree', label_ar: 'أوافق' },
  { value: 3, label: 'Neutral', label_ar: 'محايد' },
  { value: 4, label: 'Disagree', label_ar: 'لا أوافق' },
  { value: 5, label: 'Strongly Disagree', label_ar: 'لا أوافق بشدة' },
];

export const LIKERT_7_LABELS = [
  { value: 1, label: 'Strongly Agree', label_ar: 'أوافق بشدة' },
  { value: 2, label: 'Agree', label_ar: 'أوافق' },
  { value: 3, label: 'Somewhat Agree', label_ar: 'أوافق إلى حد ما' },
  { value: 4, label: 'Neutral', label_ar: 'محايد' },
  { value: 5, label: 'Somewhat Disagree', label_ar: 'لا أوافق إلى حد ما' },
  { value: 6, label: 'Disagree', label_ar: 'لا أوافق' },
  { value: 7, label: 'Strongly Disagree', label_ar: 'لا أوافق بشدة' },
];

export const NPS_LABELS = {
  low: { label: 'Not Likely', label_ar: 'غير محتمل' },
  high: { label: 'Very Likely', label_ar: 'محتمل جداً' },
};
