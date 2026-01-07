import React, { useMemo } from 'react';
import {
    Box, Typography, Paper, Avatar, TablePagination,
    useTheme, IconButton, Tooltip, Divider
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend, addMonths, subMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ATTENDANCE_COLORS } from './AttendancePage';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Material Dashboard 2 Pro Style Constants
const COLORS = {
    primary: '#5E72E4',
    secondary: '#8392AB',
    info: '#11CDEF',
    success: '#2DCE89',
    warning: '#FB6340',
    error: '#F5365C',
    dark: '#344767',
    light: '#E9ECEF',
    bg: '#F8F9FA',
    white: '#FFFFFF',
    gradientPrimary: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
};

const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
};

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
}

const MonthView: React.FC<MonthViewProps> = React.memo(({
    rows,
    employees,
    filters,
    totalEmployees,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange
}) => {
    const theme = useTheme();
    const mode = theme.palette.mode;
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

    const getStatusColor = (status: string) => {
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

    return (
        <Box sx={{ mt: 2 }}>
            <Paper 
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: COLORS.white,
                    boxShadow: SHADOWS.md,
                    border: 'none'
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 400, maxHeight: 800 }}>
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
                                                        '& fieldset': { borderColor: '#E9ECEF' },
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
                        </Box>
                    </Box>

                    {/* Month Grid */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexGrow: 1, 
                        overflow: 'auto', 
                        position: 'relative',
                        backgroundColor: COLORS.bg,
                        // Custom scrollbar
                        '&::-webkit-scrollbar': { width: '6px', height: '6px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                            background: alpha(COLORS.secondary, 0.2),
                            borderRadius: '10px',
                            '&:hover': { background: alpha(COLORS.secondary, 0.3) },
                        },
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
                        <Box sx={{ display: 'flex', flexGrow: 1, overflowX: 'visible' }}>
                            {days.map((day, dIdx) => {
                                const isDayWeekend = isWeekend(day);
                                const isDayToday = isToday(day);
                                
                                return (
                                    <Box key={dIdx} sx={{
                                        minWidth: 60,
                                        flex: 1,
                                        position: 'relative',
                                        borderInlineEnd: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                        backgroundColor: isDayWeekend ? alpha(COLORS.secondary, 0.03) : 'transparent'
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
                                                <Box key={employee.id} sx={{
                                                    height: 55,
                                                    borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                                    backgroundColor: isEvenRow ? 'transparent' : alpha(COLORS.bg, 0.2),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    px: 0.5,
                                                    position: 'relative',
                                                    '&:hover': {
                                                        backgroundColor: alpha(COLORS.primary, 0.04)
                                                    }
                                                }}>
                                                    {employeeAttendance.length > 0 ? (
                                                        employeeAttendance.map((session, sIdx) => {
                                                            const statusColor = getStatusColor(session.status);
                                                            const isLate = session.late_minutes && session.late_minutes > 0;
                                                            const isEarlyLeave = session.early_leave_minutes && session.early_leave_minutes > 0;

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
                                                                                {isLate && (
                                                                                    <Typography variant="caption" display="block" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
                                                                                        ⚠ {t('Late Arrival')}: {session.late_minutes} {t('min')}
                                                                                    </Typography>
                                                                                )}
                                                                                {isEarlyLeave && (
                                                                                    <Typography variant="caption" display="block" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
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
                                                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1, fontWeight: 900 }}>
                                                                            {session.actual_work > 0 ? `${session.actual_work}h` : format(parseISO(session.check_in), 'HH:mm')}
                                                                        </Typography>
                                                                        
                                                                        {/* Markers for Late/Early Leave */}
                                                                        {(isLate || isEarlyLeave) && (
                                                                            <Box sx={{ 
                                                                                position: 'absolute', 
                                                                                top: -2, 
                                                                                right: -2, 
                                                                                width: 8, 
                                                                                height: 8, 
                                                                                borderRadius: '50%', 
                                                                                bgcolor: isLate ? COLORS.error : COLORS.warning,
                                                                                border: `1.5px solid ${COLORS.white}`
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
                sx={{ 
                    mt: 3,
                    px: 2,
                    backgroundColor: COLORS.white,
                    borderRadius: '12px',
                    boxShadow: SHADOWS.xs,
                    color: COLORS.secondary,
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontWeight: 600,
                        fontSize: '0.8rem'
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
        </Box>
    );
});

export default MonthView;