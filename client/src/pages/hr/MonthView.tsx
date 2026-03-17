import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Paper, Avatar, TablePagination,
    useTheme, IconButton, Tooltip, Divider, Theme, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, DialogContentText
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronLeft, ChevronRight, Today, Edit, CalendarToday, DateRange } from '@mui/icons-material';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isFriday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// --- Theme-Aware Utilities ---
const getAttendanceColors = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    return {
        primary: theme.palette.primary.main,
        secondary: theme.palette.text.secondary,
        info: theme.palette.info.main,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        dark: isDark ? theme.palette.text.primary : '#344767',
        light: isDark ? theme.palette.grey[800] : '#E9ECEF',
        bg: theme.palette.background.default,
        white: theme.palette.background.paper,
        pureWhite: '#FFFFFF',
        gradientPrimary: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        gradientSuccess: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
        gradientInfo: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
        gradientWarning: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
        gradientError: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
        gradientDark: `linear-gradient(135deg, ${isDark ? theme.palette.grey[900] : '#344767'} 0%, ${isDark ? theme.palette.common.black : '#192941'} 100%)`,
    };
};

const getAttendanceShadows = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(50, 50, 93, 0.1)';
    return {
        xs: isDark ? '0 1px 5px rgba(0, 0, 0, 0.3)' : '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: isDark ? '0 3px 8px rgba(0, 0, 0, 0.4)' : '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: `0 7px 14px ${shadowColor}`,
        lg: `0 15px 35px ${shadowColor}`,
    };
};

const getAttendanceStatusColors = (colors: any) => ({
    present: colors.success,
    late: colors.error,
    earlyLeave: colors.warning,
    absent: colors.secondary,
    ongoing: colors.primary,
    overtime: alpha(colors.primary, 0.8),
    multiDay: '#9C27B0', // Purple for multi-day attendance (48 hours split across days)
    manualAdjustment: '#FF9800', // Orange for manually adjusted/added records
});

interface AttendanceRecord {
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
    status: string;
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
    // Manual adjustment fields
    has_manual_adjustment?: boolean;
    adjusted_work_hours?: number;
    adjustment_reason?: string;
}

interface MonthViewProps {
    rows: AttendanceRecord[];
    employees: Array<{ id: string; employee_id: string; name?: string; full_name?: string }>;
    filters: { startDate?: Date; endDate?: Date; currentMonth?: Date; setCurrentMonth: (date: Date) => void };
    totalEmployees: number;
    page: number;
    rowsPerPage: number;
    handlePageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onDateRangeChange?: (startDate: Date, endDate: Date) => void;
    onSingleDaySelect?: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = React.memo(({
    rows,
    employees,
    filters,
    totalEmployees,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    onDateRangeChange,
    onSingleDaySelect
}) => {
    const theme = useTheme();
    const COLORS = useMemo(() => getAttendanceColors(theme), [theme]);
    const SHADOWS = useMemo(() => getAttendanceShadows(theme), [theme]);
    const ATTENDANCE_COLORS = useMemo(() => getAttendanceStatusColors(COLORS), [COLORS]);

    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const dateLocale = isRtl ? ar : enUS;

    const currentMonth = filters.currentMonth || new Date();

    // Memoized days calculation
    const days = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const handlePrevMonth = () => {
        filters.setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        filters.setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleToday = () => {
        filters.setCurrentMonth(new Date());
    };

    // Custom date selection state
    const [customDateDialog, setCustomDateDialog] = useState(false);
    const [customDate, setCustomDate] = useState<Date | null>(null);
    
    const [customRangeDialog, setCustomRangeDialog] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

    // Date range selection state
    const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

    // Memoized employee attendance mapping
    const employeeAttendanceMap = useMemo(() => {
        const map: { [employeeId: string]: { [dateKey: string]: AttendanceRecord[] } } = {};

        rows.forEach((record) => {
            const employeeId = record.employee_id;
            const dateKey = record.check_in_date;

            if (!map[employeeId]) {
                map[employeeId] = {};
            }
            if (!map[employeeId][dateKey]) {
                map[employeeId][dateKey] = [];
            }
            map[employeeId][dateKey].push(record);
        });

        return map;
    }, [rows]);

    // Memoized paginated employees
    const paginatedEmployees = useMemo(() => {
        return employees.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    }, [employees, page, rowsPerPage]);

    const getStatusColor = (status: string, session?: AttendanceRecord) => {
        // Check for multi-day attendance (48+ hours distributed across days or work hours > 12)
        if (session) {
            const workHours = session.actual_work || 0;
            const hasCheckOut = session.check_out;
            
            // If work hours exceed 12 hours, it's likely multi-day attendance
            if (workHours > 12 && hasCheckOut) {
                return ATTENDANCE_COLORS.multiDay;
            }
            
            // Check if check-in and check-out span different dates
            if (hasCheckOut && session.check_out) {
                try {
                    const checkInDate = format(parseISO(session.check_in), 'yyyy-MM-dd');
                    const checkOutDate = format(parseISO(session.check_out), 'yyyy-MM-dd');
                    if (checkInDate !== checkOutDate) {
                        return ATTENDANCE_COLORS.multiDay;
                    }
                } catch (e) {
                    // If parsing fails, continue with normal status
                }
            }
        }
        
        if (status.includes('late') && status.includes('early_leave')) return ATTENDANCE_COLORS.late; // Priority to late or a mix
        switch (status) {
            case 'present': return ATTENDANCE_COLORS.present;
            case 'late': return ATTENDANCE_COLORS.late;
            case 'early_leave': return ATTENDANCE_COLORS.earlyLeave;
            case 'ongoing': return ATTENDANCE_COLORS.ongoing;
            case 'overtime': return ATTENDANCE_COLORS.overtime;
            default: return ATTENDANCE_COLORS.absent;
        }
    };

    // Handle day click to select specific day
    const handleDayClick = (day: Date) => {
        onSingleDaySelect?.(day);
    };

    // Handle date range selection (Ctrl+Click or Shift+Click)
    const handleDayRangeClick = (day: Date, event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            // Multi-select mode
            if (!selectedRange.start) {
                setSelectedRange({ start: day, end: day });
            } else if (!selectedRange.end) {
                const newEnd = day > selectedRange.start ? day : selectedRange.start;
                const newStart = day < selectedRange.start ? day : selectedRange.start;
                setSelectedRange({ start: newStart, end: newEnd });
            } else {
                // Reset and start new selection
                setSelectedRange({ start: day, end: day });
            }
        } else if (event.shiftKey && selectedRange.start) {
            // Extend selection
            const newEnd = day;
            const newStart = selectedRange.start;
            setSelectedRange({ 
                start: newStart < newEnd ? newStart : newEnd, 
                end: newStart < newEnd ? newEnd : newStart 
            });
        } else {
            // Single selection
            setSelectedRange({ start: day, end: day });
            onSingleDaySelect?.(day);
        }
    };

    // Apply range selection
    const applyRangeSelection = () => {
        if (selectedRange.start && selectedRange.end) {
            onDateRangeChange?.(selectedRange.start, selectedRange.end);
        }
    };

    // Clear range selection
    const clearRangeSelection = () => {
        setSelectedRange({ start: null, end: null });
    };

    return (
        <Box sx={{ mt: 2, width: '100%', overflowX: 'auto' }}>
            <Paper 
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    overflow: 'visible',
                    backgroundColor: COLORS.white,
                    boxShadow: SHADOWS.md,
                    border: 'none',
                    width: '100%'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 300,
                    height: 'auto',
                    overflow: 'hidden'
                }}>
                    {/* Month Header */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: COLORS.white,
                        borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}`,
                        p: 2.5,
                        gap: 2,
                        flexWrap: 'wrap',
                        zIndex: 20,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
                                    <DatePicker
                                        views={['year', 'month']}
                                        label={t('Select Month')}
                                        value={currentMonth}
                                        onChange={(newValue) => {
                                            if (newValue) filters.setCurrentMonth(newValue);
                                        }}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: { 
                                                    width: 180,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '8px',
                                                        '& fieldset': { borderColor: alpha(COLORS.secondary, 0.1) },
                                                        '&:hover fieldset': { borderColor: COLORS.primary },
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Tooltip title={t('Previous Month')}>
                                    <IconButton 
                                        size="small" 
                                        onClick={handlePrevMonth} 
                                        sx={{ 
                                            bgcolor: COLORS.bg,
                                            borderRadius: '8px',
                                            '&:hover': { bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }
                                        }}
                                    >
                                        {isRtl ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Today')}>
                                    <IconButton 
                                        size="small" 
                                        onClick={handleToday} 
                                        sx={{ 
                                            bgcolor: COLORS.bg,
                                            borderRadius: '8px',
                                            '&:hover': { bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }
                                        }}
                                    >
                                        <Today fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Next Month')}>
                                    <IconButton 
                                        size="small" 
                                        onClick={handleNextMonth} 
                                        sx={{ 
                                            bgcolor: COLORS.bg,
                                            borderRadius: '8px',
                                            '&:hover': { bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }
                                        }}
                                    >
                                        {isRtl ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ATTENDANCE_COLORS.present }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Present')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ATTENDANCE_COLORS.late }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Late')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ATTENDANCE_COLORS.earlyLeave }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Early Leave')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ATTENDANCE_COLORS.absent, opacity: 0.4 }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Absent')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: alpha(COLORS.secondary, 0.2) }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Weekend')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#9C27B0' }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Multi-day')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF9800', border: `2px solid ${COLORS.white}`, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.dark }}>{t('Manual')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CalendarToday />}
                                    onClick={() => {
                                        // Single day selection logic
                                        const today = new Date();
                                        onSingleDaySelect?.(today);
                                    }}
                                    sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: COLORS.secondary,
                                        borderColor: alpha(COLORS.secondary, 0.2),
                                        '&:hover': {
                                            borderColor: COLORS.primary,
                                            color: COLORS.primary,
                                            bgcolor: alpha(COLORS.primary, 0.05)
                                        }
                                    }}
                                >
                                    {t('Today')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DateRange />}
                                    onClick={() => {
                                        // Date range selection logic
                                        const startOfMonthDate = startOfMonth(new Date());
                                        const endOfMonthDate = endOfMonth(new Date());
                                        onDateRangeChange?.(startOfMonthDate, endOfMonthDate);
                                    }}
                                    sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: COLORS.secondary,
                                        borderColor: alpha(COLORS.secondary, 0.2),
                                        '&:hover': {
                                            borderColor: COLORS.primary,
                                            color: COLORS.primary,
                                            bgcolor: alpha(COLORS.primary, 0.05)
                                        }
                                    }}
                                >
                                    {t('This Month')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CalendarToday />}
                                    onClick={() => setCustomDateDialog(true)}
                                    sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: COLORS.secondary,
                                        borderColor: alpha(COLORS.secondary, 0.2),
                                        '&:hover': {
                                            borderColor: COLORS.primary,
                                            color: COLORS.primary,
                                            bgcolor: alpha(COLORS.primary, 0.05)
                                        }
                                    }}
                                >
                                    {t('Select Day')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DateRange />}
                                    onClick={() => setCustomRangeDialog(true)}
                                    sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: COLORS.secondary,
                                        borderColor: alpha(COLORS.secondary, 0.2),
                                        '&:hover': {
                                            borderColor: COLORS.primary,
                                            color: COLORS.primary,
                                            bgcolor: alpha(COLORS.primary, 0.05)
                                        }
                                    }}
                                >
                                    {t('Select Range')}
                                </Button>
                                {/* Range Selection Controls */}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={applyRangeSelection}
                                        disabled={!selectedRange.start || !selectedRange.end}
                                        sx={{
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            bgcolor: COLORS.primary,
                                            color: 'white',
                                            '&:hover': { bgcolor: COLORS.primary },
                                            '&:disabled': { bgcolor: alpha(COLORS.secondary, 0.3), color: COLORS.secondary }
                                        }}
                                    >
                                        {t('Apply Range')}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={clearRangeSelection}
                                        disabled={!selectedRange.start && !selectedRange.end}
                                        sx={{
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            color: COLORS.secondary,
                                            borderColor: alpha(COLORS.secondary, 0.2),
                                            '&:hover': {
                                                borderColor: COLORS.primary,
                                                color: COLORS.primary,
                                                bgcolor: alpha(COLORS.primary, 0.05)
                                            },
                                            '&:disabled': { color: COLORS.secondary, borderColor: alpha(COLORS.secondary, 0.1) }
                                        }}
                                    >
                                        {t('Clear Range')}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Month Grid */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexGrow: 1, 
                        overflowX: 'auto',
                        overflowY: 'auto', 
                        position: 'relative',
                        backgroundColor: COLORS.bg,
                        maxWidth: '100%',
                        // Custom scrollbar
                        '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: alpha(COLORS.secondary, 0.3),
                            borderRadius: '4px',
                            '&:hover': { backgroundColor: alpha(COLORS.secondary, 0.5) }
                        }
                    }}>
                        {/* Employee Names Column */}
                        <Box sx={{
                            width: 260,
                            flexShrink: 0,
                            backgroundColor: COLORS.white,
                            borderInlineEnd: `1px solid ${alpha(COLORS.secondary, 0.1)}`,
                            position: 'sticky',
                            left: isRtl ? 'auto' : 0,
                            right: isRtl ? 0 : 'auto',
                            zIndex: 10,
                            boxShadow: isRtl ? '-4px 0 8px rgba(0,0,0,0.02)' : '4px 0 8px rgba(0,0,0,0.02)'
                        }}>
                            {/* Header alignment */}
                            <Box sx={{ 
                                height: 60, 
                                borderBottom: `2px solid ${alpha(COLORS.secondary, 0.05)}`,
                                display: 'flex',
                                alignItems: 'center',
                                px: 2.5,
                                backgroundColor: alpha(COLORS.bg, 0.5)
                            }}>
                                <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {t('Employee Name')}
                                </Typography>
                            </Box>
                            {paginatedEmployees.map((employee, index) => {
                                const displayName = employee.full_name || employee.name || employee.employee_id;
                                return (
                                    <Box key={employee.id} sx={{
                                        height: 55,
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 2.5,
                                        borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                        backgroundColor: index % 2 === 0 ? COLORS.white : alpha(COLORS.bg, 0.3),
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            backgroundColor: alpha(COLORS.primary, 0.04)
                                        }
                                    }}>
                                        <Avatar sx={{ 
                                            width: 32, 
                                            height: 32, 
                                            marginInlineEnd: 1.5, 
                                            bgcolor: alpha(COLORS.primary, 0.1),
                                            color: COLORS.primary,
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            border: `1px solid ${alpha(COLORS.primary, 0.1)}`
                                        }}>
                                            {displayName[0]}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight="700" noWrap sx={{ color: COLORS.dark }}>
                                                {displayName}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: COLORS.secondary, fontFamily: 'monospace' }}>
                                                {employee.employee_id}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Days Columns */}
                        <Box sx={{ display: 'flex', flexGrow: 1, overflowX: 'auto' }}>
                            {days.map((day, dIdx) => {
                                const isDayWeekend = isFriday(day);
                                const isDayToday = isToday(day);
                                const isInRange = selectedRange.start && selectedRange.end && 
                                    day >= selectedRange.start && day <= selectedRange.end;
                                const isRangeStart = selectedRange.start && day.getTime() === selectedRange.start.getTime();
                                const isRangeEnd = selectedRange.end && day.getTime() === selectedRange.end.getTime();
                                
                                return (
                                    <Box key={dIdx} sx={{
                                        minWidth: 60,
                                        flex: 1,
                                        position: 'relative',
                                        borderInlineEnd: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                        backgroundColor: isDayWeekend ? alpha(COLORS.secondary, 0.03) : 'transparent',
                                        // Visual indicators for date range selection
                                        ...(isInRange && {
                                            backgroundColor: alpha(COLORS.primary, 0.05),
                                            boxShadow: `inset 0 0 0 2px ${alpha(COLORS.primary, 0.3)}`,
                                        }),
                                        ...(isRangeStart && {
                                            borderLeft: `3px solid ${COLORS.primary}`,
                                        }),
                                        ...(isRangeEnd && {
                                            borderRight: `3px solid ${COLORS.primary}`,
                                        }),
                                    }}>
                                        {/* Day Header */}
                                        <Box sx={{
                                            height: 60,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderBottom: `2px solid ${alpha(COLORS.secondary, 0.05)}`,
                                            backgroundColor: isDayToday ? alpha(COLORS.primary, 0.08) : alpha(COLORS.bg, 0.5),
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 5,
                                            // Highlight header if in range
                                            ...(isInRange && {
                                                backgroundColor: alpha(COLORS.primary, 0.12),
                                                boxShadow: `inset 0 0 0 2px ${alpha(COLORS.primary, 0.4)}`,
                                            }),
                                        }}>
                                            <Typography variant="caption" fontWeight="800" sx={{ color: isDayToday ? COLORS.primary : COLORS.secondary, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                {format(day, 'EEE', { locale: dateLocale })}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="900" sx={{ color: isDayToday ? COLORS.primary : COLORS.dark }}>
                                                {format(day, 'd', { locale: dateLocale })}
                                            </Typography>
                                        </Box>

                                        {/* Employee Rows */}
                                        {paginatedEmployees.map((employee, eIdx) => {
                                            const employeeAttendance = employeeAttendanceMap[employee.employee_id]?.[format(day, 'yyyy-MM-dd')] || [];
                                            const isEvenRow = eIdx % 2 === 0;

                                            return (
                                                <Box 
                                                    key={employee.id} 
                                                    sx={{
                                                        height: 55,
                                                        borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                                        backgroundColor: isEvenRow ? 'transparent' : alpha(COLORS.bg, 0.2),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        px: 0.5,
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        '&:hover': {
                                                            backgroundColor: alpha(COLORS.primary, 0.04)
                                                        },
                                                        // Highlight cell if in range
                                                        ...(isInRange && {
                                                            backgroundColor: alpha(COLORS.primary, 0.08),
                                                            boxShadow: `inset 0 0 0 1px ${alpha(COLORS.primary, 0.3)}`,
                                                        }),
                                                    }}
                                                    onClick={(e) => handleDayRangeClick(day, e)}
                                                >
                                                    {employeeAttendance.length > 0 ? (
                                                        employeeAttendance.map((session, sIdx) => {
                                                            const statusColor = getStatusColor(session.status, session);
                                                            const isLate = session.late_minutes && session.late_minutes > 0;
                                                            const isEarlyLeave = session.early_leave_minutes && session.early_leave_minutes > 0;
                                                            const isMultiDay = statusColor === ATTENDANCE_COLORS.multiDay;
                                                            const isManuallyAdjusted = session.has_manual_adjustment;

                                                            return (
                                                                <Tooltip 
                                                                    key={sIdx} 
                                                                    arrow
                                                                    title={
                                                                        <Box sx={{ p: 1 }}>
                                                                            <Typography variant="caption" display="block" fontWeight="700" sx={{ color: COLORS.white, mb: 0.5 }}>
                                                                                {format(parseISO(session.check_in), 'PPP', { locale: dateLocale })}
                                                                            </Typography>
                                                                            <Divider sx={{ my: 0.5, bgcolor: alpha(COLORS.white, 0.2) }} />
                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                <Typography variant="caption" display="block" sx={{ color: COLORS.white, opacity: 0.9 }}>
                                                                                    <strong>{t('Check In')}:</strong> {format(parseISO(session.check_in), 'HH:mm')}
                                                                                </Typography>
                                                                                {session.check_out && (
                                                                                    <Typography variant="caption" display="block" sx={{ color: COLORS.white, opacity: 0.9 }}>
                                                                                        <strong>{t('Check Out')}:</strong> {format(parseISO(session.check_out), 'HH:mm')}
                                                                                    </Typography>
                                                                                )}
                                                                                <Typography variant="caption" display="block" sx={{ color: COLORS.white, opacity: 0.9 }}>
                                                                                    <strong>{t('Work')}:</strong> {session.actual_work}h
                                                                                </Typography>
                                                                                {session.has_manual_adjustment && (
                                                                                    <>
                                                                                        <Typography variant="caption" display="block" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                                                                                            ✏️ {t('Manually Adjusted')}
                                                                                        </Typography>
                                                                                        {session.adjusted_work_hours !== undefined && session.adjusted_work_hours !== null && (
                                                                                            <Typography variant="caption" display="block" sx={{ color: '#FF9800', opacity: 0.9 }}>
                                                                                                {t('Adjusted Hours')}: {session.adjusted_work_hours}h
                                                                                            </Typography>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                                {isLate && (
                                                                                    <Typography variant="caption" display="block" sx={{ color: COLORS.warning, fontWeight: 'bold' }}>
                                                                                        ⚠ {t('Late Arrival')}: {session.late_minutes} {t('min')}
                                                                                    </Typography>
                                                                                )}
                                                                                {isEarlyLeave && (
                                                                                    <Typography variant="caption" display="block" sx={{ color: COLORS.warning, fontWeight: 'bold' }}>
                                                                                        ⚠ {t('Early Leave')}: {session.early_leave_minutes} {t('min')}
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                        </Box>
                                                                    }
                                                                    componentsProps={{
                                                                        tooltip: {
                                                                            sx: {
                                                                                bgcolor: alpha(COLORS.dark, 0.95),
                                                                                borderRadius: '12px',
                                                                                padding: '8px',
                                                                                boxShadow: SHADOWS.lg,
                                                                                '& .MuiTooltip-arrow': {
                                                                                    color: alpha(COLORS.dark, 0.95),
                                                                                }
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            width: '90%',
                                                                            height: '75%',
                                                                            borderRadius: '8px',
                                                                            backgroundColor: statusColor,
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: COLORS.white,
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                            boxShadow: SHADOWS.xs,
                                                                            position: 'relative',
                                                                            '&:hover': {
                                                                                filter: 'brightness(1.1)',
                                                                                transform: 'scale(1.15)',
                                                                                zIndex: 2,
                                                                                boxShadow: SHADOWS.sm
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Typography variant="caption" sx={{ 
                                                                            fontSize: '0.65rem', 
                                                                            lineHeight: 1, 
                                                                            fontWeight: 900,
                                                                            color: COLORS.white
                                                                        }}>
                                                                            {session.actual_work > 0 ? `${session.actual_work}h` : format(parseISO(session.check_in), 'HH:mm')}
                                                                        </Typography>
                                                                        
                                                                        {/* Orange dot marker for manually added/modified/deleted records */}
                                                                        {isManuallyAdjusted && (
                                                                            <Box sx={{ 
                                                                                position: 'absolute', 
                                                                                top: -3, 
                                                                                right: -3, 
                                                                                width: 10, 
                                                                                height: 10, 
                                                                                borderRadius: '50%', 
                                                                                bgcolor: '#FF9800',
                                                                                border: `2px solid ${COLORS.white}`,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                zIndex: 10,
                                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                                            }} />
                                                                        )}
                                                                        {/* Markers for Late/Early Leave/Multi-day (without manual) */}
                                                                        {(!isManuallyAdjusted) && (isLate || isEarlyLeave || isMultiDay) && (
                                                                            <Box sx={{ 
                                                                                position: 'absolute', 
                                                                                top: -3, 
                                                                                right: -3, 
                                                                                width: 10, 
                                                                                height: 10, 
                                                                                borderRadius: '50%', 
                                                                                bgcolor: isMultiDay ? '#9C27B0' : (isLate ? COLORS.error : COLORS.warning),
                                                                                border: `2px solid ${COLORS.white}`,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                zIndex: 10,
                                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                                            }} />
                                                                        )}
                                                                    </Box>
                                                                </Tooltip>
                                                            );
                                                        })
                                                    ) : (
                                                        !isDayWeekend && (
                                                            <Box sx={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: alpha(COLORS.error, 0.03),
                                                                border: `1px solid ${alpha(COLORS.error, 0.1)}`,
                                                                opacity: 0.6
                                                            }}>
                                                                <Typography variant="caption" sx={{ color: COLORS.error, fontSize: '0.65rem', fontWeight: 900 }}>
                                                                    {t('A')}
                                                                </Typography>
                                                            </Box>
                                                        )
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                );
                            })}

                            {/* Total Work Column */}
                            <Box sx={{
                                minWidth: 90,
                                backgroundColor: COLORS.white,
                                borderInlineStart: `2px solid ${alpha(COLORS.secondary, 0.1)}`,
                                position: 'sticky',
                                right: isRtl ? 'auto' : 0,
                                left: isRtl ? 0 : 'auto',
                                zIndex: 10,
                                boxShadow: isRtl ? '4px 0 15px rgba(0,0,0,0.05)' : '-4px 0 15px rgba(0,0,0,0.05)'
                            }}>
                                <Box sx={{ 
                                    height: 60, 
                                    borderBottom: `2px solid ${alpha(COLORS.secondary, 0.05)}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: alpha(COLORS.bg, 0.5)
                                }}>
                                    <Typography variant="caption" fontWeight="900" sx={{ color: COLORS.primary, letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                                        {t('Total')}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7, color: COLORS.secondary }}>
                                        {t('Hours')}
                                    </Typography>
                                </Box>
                                {paginatedEmployees.map((employee, eIdx) => {
                                    const employeeLogs = rows.filter(r => r.employee_id === employee.employee_id);
                                    const totalWork = employeeLogs.reduce((sum, log) => sum + (log.actual_work || 0), 0);
                                    const totalOT = employeeLogs.reduce((sum, log) => sum + (log.overtime || 0), 0);
                                    const isEvenRow = eIdx % 2 === 0;

                                    return (
                                        <Box key={employee.id} sx={{
                                            height: 55,
                                            borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                            backgroundColor: isEvenRow ? COLORS.white : alpha(COLORS.bg, 0.3),
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                backgroundColor: alpha(COLORS.primary, 0.04)
                                            }
                                        }}>
                                            <Typography variant="body2" fontWeight="900" sx={{ color: COLORS.dark }}>
                                                {totalWork.toFixed(1)}
                                            </Typography>
                                            {totalOT > 0 && (
                                                <Typography variant="caption" fontWeight="900" sx={{ 
                                                    color: COLORS.success, 
                                                    fontSize: '0.65rem',
                                                    bgcolor: alpha(COLORS.success, 0.1),
                                                    px: 0.5,
                                                    borderRadius: '4px',
                                                    mt: 0.2
                                                }}>
                                                    +{totalOT.toFixed(1)}
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>
            <TablePagination
                component="div"
                count={totalEmployees}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[10, 25, 50, 100]}
                showFirstButton
                showLastButton
                sx={{ 
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 100,
                    mt: 'auto',
                    mx: 0,
                    p: 1.5,
                    backgroundColor: COLORS.white,
                    borderTop: `1px solid ${alpha(COLORS.secondary, 0.1)}`,
                    borderRadius: '0 0 16px 16px',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                    color: COLORS.secondary,
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontWeight: 600,
                        fontSize: '0.85rem'
                    },
                    '& .MuiTablePagination-select': {
                        fontWeight: 700,
                        color: COLORS.dark,
                        borderRadius: '8px',
                        '&:focus': { borderRadius: '8px' }
                    },
                    '& .MuiTablePagination-actions': {
                        '& .MuiIconButton-root': {
                            borderRadius: '8px',
                            mx: 0.5,
                            '&:hover': { bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }
                        }
                    }
                }}
            />

            {/* Custom Date Dialog */}
            <Dialog 
                open={customDateDialog} 
                onClose={() => setCustomDateDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ 
                    bgcolor: COLORS.primary, 
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                }}>
                    {t('Select Specific Day')}
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <DialogContentText sx={{ mb: 2, color: COLORS.secondary }}>
                        {t('Choose a specific day to view attendance records')}
                    </DialogContentText>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
                        <DatePicker
                            label={t('Select Date')}
                            value={customDate}
                            onChange={(newValue) => setCustomDate(newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'medium',
                                    sx: {
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            '& fieldset': { borderColor: alpha(COLORS.secondary, 0.2) },
                                            '&:hover fieldset': { borderColor: COLORS.primary },
                                        }
                                    }
                                }
                            }}
                        />
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={() => setCustomDateDialog(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            color: COLORS.secondary,
                            borderColor: alpha(COLORS.secondary, 0.2),
                            '&:hover': {
                                borderColor: COLORS.primary,
                                color: COLORS.primary,
                                bgcolor: alpha(COLORS.primary, 0.05)
                            }
                        }}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={() => {
                            if (customDate) {
                                onSingleDaySelect?.(customDate);
                                setCustomDateDialog(false);
                                setCustomDate(null);
                            }
                        }}
                        variant="contained"
                        disabled={!customDate}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            bgcolor: COLORS.primary,
                            '&:hover': { bgcolor: COLORS.primary },
                            '&:disabled': { bgcolor: alpha(COLORS.secondary, 0.3) }
                        }}
                    >
                        {t('View Attendance')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Custom Date Range Dialog */}
            <Dialog 
                open={customRangeDialog} 
                onClose={() => setCustomRangeDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ 
                    bgcolor: COLORS.primary, 
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                }}>
                    {t('Select Date Range')}
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <DialogContentText sx={{ mb: 2, color: COLORS.secondary }}>
                        {t('Choose a date range to view attendance records')}
                    </DialogContentText>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
                            <DatePicker
                                label={t('Start Date')}
                                value={customStartDate}
                                onChange={(newValue) => setCustomStartDate(newValue)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: 'medium',
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                '& fieldset': { borderColor: alpha(COLORS.secondary, 0.2) },
                                                '&:hover fieldset': { borderColor: COLORS.primary },
                                            }
                                        }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
                            <DatePicker
                                label={t('End Date')}
                                value={customEndDate}
                                onChange={(newValue) => setCustomEndDate(newValue)}
                                minDate={customStartDate || undefined}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: 'medium',
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                '& fieldset': { borderColor: alpha(COLORS.secondary, 0.2) },
                                                '&:hover fieldset': { borderColor: COLORS.primary },
                                            }
                                        }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={() => setCustomRangeDialog(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            color: COLORS.secondary,
                            borderColor: alpha(COLORS.secondary, 0.2),
                            '&:hover': {
                                borderColor: COLORS.primary,
                                color: COLORS.primary,
                                bgcolor: alpha(COLORS.primary, 0.05)
                            }
                        }}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={() => {
                            if (customStartDate && customEndDate) {
                                onDateRangeChange?.(customStartDate, customEndDate);
                                setCustomRangeDialog(false);
                                setCustomStartDate(null);
                                setCustomEndDate(null);
                            }
                        }}
                        variant="contained"
                        disabled={!customStartDate || !customEndDate}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            bgcolor: COLORS.primary,
                            '&:hover': { bgcolor: COLORS.primary },
                            '&:disabled': { bgcolor: alpha(COLORS.secondary, 0.3) }
                        }}
                    >
                        {t('View Attendance')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

export default MonthView;