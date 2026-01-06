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
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: 'background.paper',
                    boxShadow: theme.palette.mode === 'light' 
                        ? '0 1px 3px rgba(0,0,0,0.02)' 
                        : 'none'
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 400, maxHeight: 800 }}>
                    {/* Month Header */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: mode === 'light' ? '#FFFFFF' : '#0F172A',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        p: 1.5,
                        px: 2,
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
                                                sx: { width: 180 }
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Tooltip title={t('Previous Month')}>
                                    <IconButton size="small" onClick={handlePrevMonth} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                                        {isRtl ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Today')}>
                                    <IconButton size="small" onClick={handleToday} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                                        <Today fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Next Month')}>
                                    <IconButton size="small" onClick={handleNextMonth} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                                        {isRtl ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: ATTENDANCE_COLORS.present }} />
                                <Typography variant="caption" fontWeight="600">{t('Present')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: ATTENDANCE_COLORS.late }} />
                                <Typography variant="caption" fontWeight="600">{t('Late')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: ATTENDANCE_COLORS.earlyLeave }} />
                                <Typography variant="caption" fontWeight="600">{t('Early Leave')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: ATTENDANCE_COLORS.absent, opacity: 0.3 }} />
                                <Typography variant="caption" fontWeight="600">{t('Absent')}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.action.hover, 0.5) }} />
                                <Typography variant="caption" fontWeight="600">{t('Weekend')}</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Month Grid */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexGrow: 1, 
                        overflow: 'auto', 
                        position: 'relative',
                        // Custom scrollbar for better appearance
                        '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                            background: theme.palette.mode === 'light' ? '#E2E8F0' : '#334155',
                            borderRadius: '10px',
                            '&:hover': { background: theme.palette.mode === 'light' ? '#CBD5E1' : '#475569' },
                        },
                    }}>
                        {/* Employee Names Column */}
                        <Box sx={{
                            width: 240,
                            flexShrink: 0,
                            backgroundColor: mode === 'light' ? '#F8FAFC' : '#111827',
                            borderInlineEnd: `2px solid ${theme.palette.divider}`,
                            position: 'sticky',
                            left: isRtl ? 'auto' : 0,
                            right: isRtl ? 0 : 'auto',
                            zIndex: 10,
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                right: isRtl ? 'auto' : -10,
                                left: isRtl ? -10 : 'auto',
                                width: 10,
                                background: mode === 'light'
                                    ? `linear-gradient(${isRtl ? '270deg' : '90deg'}, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 100%)`
                                    : `linear-gradient(${isRtl ? '270deg' : '90deg'}, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)`,
                                pointerEvents: 'none',
                                opacity: 1
                            }
                        }}>
                            {/* Empty corner space for header alignment */}
                            <Box sx={{ 
                                height: 60, 
                                borderBottom: `2px solid ${theme.palette.divider}`,
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                backgroundColor: mode === 'light' ? '#F1F5F9' : '#1F2937'
                            }}>
                                <Typography variant="caption" fontWeight="800" color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                                        px: 2,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        backgroundColor: index % 2 === 0 ? 'background.paper' : alpha(theme.palette.action.hover, 0.3),
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}>
                                        <Avatar sx={{ 
                                            width: 34, 
                                            height: 34, 
                                            marginInlineEnd: 1.5, 
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                            fontSize: '0.9rem',
                                            fontWeight: '700',
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                        }}>
                                            {displayName[0]}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight="700" noWrap color="text.primary">
                                                {displayName}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
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
                                        borderInlineEnd: `1px solid ${theme.palette.divider}`,
                                        backgroundColor: isDayWeekend ? alpha(theme.palette.action.hover, 0.5) : 'transparent'
                                    }}>
                                        {/* Day Header */}
                                        <Box sx={{
                                            height: 60,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderBottom: `2px solid ${theme.palette.divider}`,
                                            backgroundColor: isDayToday ? alpha(theme.palette.primary.main, 0.1) : (mode === 'light' ? '#F1F5F9' : '#1F2937'),
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 5,
                                            transition: 'background-color 0.2s'
                                        }}>
                                            <Typography variant="caption" fontWeight="800" color={isDayToday ? 'primary' : 'text.secondary'} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                                                {format(day, 'EEE', { locale: dateLocale })}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="900" color={isDayToday ? 'primary.main' : 'text.primary'}>
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
                                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                                    backgroundColor: isEvenRow ? 'transparent' : alpha(theme.palette.action.hover, 0.2),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    px: 0.5,
                                                    position: 'relative',
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.08)
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
                                                                        <Box sx={{ p: 0.5 }}>
                                                                            <Typography variant="caption" display="block" fontWeight="700">
                                                                                {format(parseISO(session.check_in), 'PPP', { locale: dateLocale })}
                                                                            </Typography>
                                                                            <Divider sx={{ my: 0.5, bgcolor: 'rgba(255,255,255,0.2)' }} />
                                                                            <Typography variant="caption" display="block">
                                                                                {t('Check In')}: {format(parseISO(session.check_in), 'HH:mm')}
                                                                            </Typography>
                                                                            {session.check_out && (
                                                                                <Typography variant="caption" display="block">
                                                                                    {t('Check Out')}: {format(parseISO(session.check_out), 'HH:mm')}
                                                                                </Typography>
                                                                            )}
                                                                            <Typography variant="caption" display="block">
                                                                                {t('Work')}: {session.actual_work}h
                                                                            </Typography>
                                                                            {isLate && (
                                                                                <Typography variant="caption" display="block" color="error.light">
                                                                                    {t('Late Arrival')}: {session.late_minutes} {t('min')}
                                                                                </Typography>
                                                                            )}
                                                                            {isEarlyLeave && (
                                                                                <Typography variant="caption" display="block" color="warning.light">
                                                                                    {t('Early Leave')}: {session.early_leave_minutes} {t('min')}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    }
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            width: '90%',
                                                                            height: '75%',
                                                                            borderRadius: 1,
                                                                            backgroundColor: statusColor,
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: 'white',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                                                            position: 'relative',
                                                                            '&:hover': {
                                                                                filter: 'brightness(1.1)',
                                                                                transform: 'scale(1.1)',
                                                                                zIndex: 2,
                                                                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
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
                                                                                bgcolor: isLate ? 'error.main' : 'warning.main',
                                                                                border: '1.5px solid white'
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
                                                                borderRadius: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: alpha(theme.palette.error.main, 0.03),
                                                                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                                                                opacity: 0.6
                                                            }}>
                                                                <Typography variant="caption" sx={{ color: theme.palette.error.main, fontSize: '0.65rem', fontWeight: 900 }}>
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
                                minWidth: 80,
                                backgroundColor: mode === 'light' ? '#F8FAFC' : '#111827',
                                borderInlineStart: `2px solid ${theme.palette.divider}`,
                                position: 'sticky',
                                right: isRtl ? 'auto' : 0,
                                left: isRtl ? 0 : 'auto',
                                zIndex: 5,
                                boxShadow: isRtl ? '2px 0 8px rgba(0,0,0,0.05)' : '-2px 0 8px rgba(0,0,0,0.05)'
                            }}>
                                <Box sx={{ 
                                    height: 60, 
                                    borderBottom: `2px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1F2937'
                                }}>
                                    <Typography variant="caption" fontWeight="900" color="primary.main" sx={{ letterSpacing: '0.05em' }}>
                                        {t('Total')}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7 }}>
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
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            backgroundColor: isEvenRow ? 'transparent' : alpha(theme.palette.action.hover, 0.2),
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1
                                        }}>
                                            <Typography variant="body2" fontWeight="800" color="primary.main">
                                                {totalWork.toFixed(1)}
                                            </Typography>
                                            {totalOT > 0 && (
                                                <Typography variant="caption" fontWeight="700" color="secondary.main" sx={{ fontSize: '0.65rem' }}>
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
                sx={{ mt: 2 }}
            />
        </Box>
    );
});

export default MonthView;