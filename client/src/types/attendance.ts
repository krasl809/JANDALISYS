/**
 * Attendance System Type Definitions
 * Shared types for attendance tracking, records, and related data
 */

// ============================================================================
// Core Attendance Types
// ============================================================================

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  check_in_date: string;
  check_in: string;
  check_out?: string;
  break_hours?: number;
  actual_work: number;
  capacity: number;
  overtime: number;
  status: AttendanceStatus;
  shift_name?: string;
  late_minutes?: number;
  early_leave_minutes?: number;
  timestamp?: string;
  type?: string;
  raw_status?: string;
  verification_mode?: string;
  device?: string;
  device_ip?: string;
  employee_pk?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'on_leave'
  | 'holiday'
  | 'weekend'
  | 'half_day'
  | 'remote';

// ============================================================================
// Summary & Statistics Types
// ============================================================================

export interface AttendanceSummary {
  total_employees: number;
  present_today: number;
  late_today: number;
  early_leave_today: number;
  absent_today: number;
  currently_in: number;
}

export interface AttendanceStats {
  total_work_hours: number;
  total_overtime: number;
  average_work_hours: number;
  attendance_rate: number;
  punctuality_rate: number;
}

export interface EmployeeAttendanceStats {
  employee_id: string;
  employee_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  early_leave_days: number;
  total_work_hours: number;
  total_overtime: number;
  average_work_hours: number;
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface AttendanceFilters {
  viewMode: 'table' | 'month' | 'transactions';
  currentMonth: Date;
  startDate: Date | null;
  endDate: Date | null;
  selectedEmployee: string;
  selectedDepartment: string;
  selectedStatus: string;
  selectedShift: string;
  debouncedSearch: string;
  rawView: boolean;
}

export interface AttendanceQueryParams {
  start_date?: string;
  end_date?: string;
  employee_id?: string;
  department?: string;
  status?: AttendanceStatus;
  shift?: string;
  search?: string;
  raw?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface AttendanceTransaction {
  id: string;
  employee_id: string;
  employee_name: string;
  timestamp: string;
  type: 'check_in' | 'check_out';
  device?: string;
  device_ip?: string;
  verification_mode?: string;
  raw_status?: string;
}

export interface TransactionEditPayload {
  id: string;
  new_timestamp: string;
  reason: string;
}

export interface ManualLogPayload {
  employee_id: string;
  timestamp: string;
  type: 'check_in' | 'check_out';
  reason: string;
}

// ============================================================================
// Device Types
// ============================================================================

export interface AttendanceDevice {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  status: 'online' | 'offline' | 'error';
  last_sync?: string;
  device_type: string;
  location?: string;
}

export interface DeviceSyncResult {
  device_id: string;
  device_name: string;
  new_records: number;
  status: 'success' | 'error' | 'partial';
  error_message?: string;
}

// ============================================================================
// Shift Types
// ============================================================================

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  grace_period: number;
  is_active: boolean;
  department_id?: string;
}

export interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
}

// ============================================================================
// Report Types
// ============================================================================

export interface AttendanceReport {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  generated_at: string;
  generated_by: string;
  data: AttendanceReportData;
}

export interface AttendanceReportData {
  summary: AttendanceSummary;
  stats: AttendanceStats;
  employee_stats: EmployeeAttendanceStats[];
  records: AttendanceRecord[];
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  include_summary: boolean;
  include_stats: boolean;
  date_range: {
    start: string;
    end: string;
  };
  filters?: Partial<AttendanceFilters>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AttendanceApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface PaginatedAttendanceResponse {
  records: AttendanceRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (record: AttendanceRecord) => void;
}

export interface AttendanceCalendarProps {
  currentMonth: Date;
  records: AttendanceRecord[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export interface AttendanceFiltersProps {
  filters: AttendanceFilters;
  onFilterChange: (key: keyof AttendanceFilters, value: any) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  employees: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  shifts: Array<{ id: string; name: string }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type AttendanceColorKey =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'on_leave'
  | 'holiday'
  | 'weekend'
  | 'overtime';

export interface AttendanceColors {
  present: string;
  absent: string;
  late: string;
  early_leave: string;
  on_leave: string;
  holiday: string;
  weekend: string;
  overtime: string;
}

export interface AttendanceTheme {
  colors: AttendanceColors;
  shadows: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };
}
