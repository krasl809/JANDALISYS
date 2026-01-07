import React, { useMemo, useCallback } from 'react';
import {
    Box, Typography, Paper, Card, CardContent, Grid, Divider,
    Stack, LinearProgress, useTheme, alpha
} from '@mui/material';
import { format, parseISO, eachDayOfInterval, isToday, isWeekend, differenceInMinutes, endOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ATTENDANCE_COLORS } from './AttendancePage';

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
    gradientSuccess: 'linear-gradient(135deg, #2DCE89 0%, #2DCECC 100%)',
    gradientInfo: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
    gradientWarning: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)',
    gradientError: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
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

interface CalendarViewProps {
    rows: AttendanceRecord[];
    filters: any;
}

const round = (val: number, precision: number) => Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);

const CalendarView: React.FC<CalendarViewProps> = React.memo(({
    rows,
    filters
}) => {
    const theme = useTheme();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const dateLocale = isRtl ? ar : enUS;

    // Memoized days calculation
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: filters.startDate || new Date(),
            end: filters.endDate || new Date()
        });
    }, [filters.startDate, filters.endDate]);

    // Memoized attendance data grouped by day
    const attendanceByDay = useMemo(() => {
        const map: { [dateKey: string]: AttendanceRecord[] } = {};

        rows.forEach((record) => {
            const dateKey = record.check_in_date;
            if (!map[dateKey]) {
                map[dateKey] = [];
            }
            map[dateKey].push(record);
        });

        return map;
    }, [rows]);

    // Memoized summary metrics
    const summaryMetrics = useMemo(() => {
        const totalActualWork = rows.reduce((acc: number, r: AttendanceRecord) => acc + (r.actual_work || 0), 0);
        const targetCapacity = days.length * (rows[0]?.capacity || 8);
        const efficiency = targetCapacity > 0 ? (totalActualWork / targetCapacity) * 100 : 0;

        return {
            totalActualWork: round(totalActualWork, 1),
            targetCapacity: round(targetCapacity, 1),
            efficiency: round(efficiency, 1)
        };
    }, [rows, days]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return ATTENDANCE_COLORS.present;
            case 'late': return ATTENDANCE_COLORS.late;
            case 'early_leave': return ATTENDANCE_COLORS.earlyLeave;
            case 'ongoing': return ATTENDANCE_COLORS.ongoing;
            default: return ATTENDANCE_COLORS.absent;
        }
    };

    const getStatusGradient = (status: string) => {
        switch (status) {
            case 'present': return COLORS.gradientSuccess;
            case 'late': return COLORS.gradientError;
            case 'early_leave': return COLORS.gradientWarning;
            case 'ongoing': return COLORS.gradientInfo;
            default: return `linear-gradient(135deg, ${COLORS.secondary} 0%, ${alpha(COLORS.secondary, 0.8)} 100%)`;
        }
    };

    const handleBlockClick = useCallback((session: AttendanceRecord) => {
        console.log('Attendance block clicked:', session);
    }, []);

    return (
        <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={9}>
                <Paper sx={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: COLORS.white,
                    boxShadow: SHADOWS.md,
                    border: 'none'
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: 600 }}>
                        {/* Grid Header */}
                        <Box sx={{
                            display: 'flex',
                            bgcolor: alpha(COLORS.bg, 0.5),
                            borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}`
                        }}>
                            <Box sx={{ width: 60, flexShrink: 0 }} />
                            {days.map((day, i) => (
                                <Box key={i} sx={{
                                    flex: 1,
                                    textAlign: 'center',
                                    py: 2,
                                    borderInlineStart: `1px solid ${alpha(COLORS.secondary, 0.05)}`
                                }}>
                                    <Typography variant="caption" fontWeight="800" sx={{ color: isToday(day) ? COLORS.primary : COLORS.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {format(day, 'EEE', { locale: dateLocale })}
                                    </Typography>
                                    <Typography variant="h6" fontWeight="900" sx={{ color: isToday(day) ? COLORS.primary : COLORS.dark, lineHeight: 1, mt: 0.5 }}>
                                        {format(day, 'd', { locale: dateLocale })}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Grid Body */}
                        <Box sx={{ display: 'flex', flexGrow: 1, overflowY: 'auto', position: 'relative', backgroundColor: COLORS.bg }}>
                            {/* Time Scale */}
                            <Box sx={{
                                width: 60,
                                flexShrink: 0,
                                bgcolor: alpha(COLORS.bg, 0.8),
                                borderInlineEnd: `1px solid ${alpha(COLORS.secondary, 0.1)}`,
                                zIndex: 2
                            }}>
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <Box key={h} sx={{ height: 40, paddingInlineEnd: 1, textAlign: isRtl ? 'left' : 'right', borderBottom: `1px solid ${alpha(COLORS.secondary, 0.03)}` }}>
                                        <Typography variant="caption" sx={{
                                            fontWeight: 700,
                                            color: COLORS.secondary,
                                            lineHeight: 1,
                                            fontSize: '0.7rem'
                                        }}>
                                            {`${h.toString().padStart(2, '0')}:00`}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* Columns */}
                            <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
                                {days.map((day, dIdx) => (
                                    <Box key={dIdx} sx={{
                                        flex: 1,
                                        position: 'relative',
                                        borderInlineStart: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                        backgroundColor: isWeekend(day) ? alpha(COLORS.secondary, 0.03) : 'transparent'
                                    }}>
                                        {/* Hour lines */}
                                        {Array.from({ length: 24 }).map((_, h) => (
                                            <Box key={h} sx={{ height: 40, borderBottom: `1px solid ${alpha(COLORS.secondary, 0.03)}` }} />
                                        ))}

                                        {/* Activity Blocks */}
                                        {attendanceByDay[format(day, 'yyyy-MM-dd')]?.map((session: AttendanceRecord, sIdx: number) => {
                                            const start = parseISO(session.check_in);
                                            const end = session.check_out ? parseISO(session.check_out) : (isToday(start) ? new Date() : endOfDay(start));
                                            const startMin = start.getHours() * 60 + start.getMinutes();
                                            const duration = Math.max(15, differenceInMinutes(end, start));
                                            const statusGradient = getStatusGradient(session.status);

                                            return (
                                                <Box
                                                    key={sIdx}
                                                    onClick={() => handleBlockClick(session)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: `${startMin * (40/60)}px`,
                                                        height: `${duration * (40/60)}px`,
                                                        insetInlineStart: 4,
                                                        insetInlineEnd: 4,
                                                        borderRadius: '8px',
                                                        background: statusGradient,
                                                        color: COLORS.white,
                                                        px: 1,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        boxShadow: SHADOWS.sm,
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        zIndex: 3,
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        '&:hover': {
                                                            transform: 'scale(1.03)',
                                                            boxShadow: SHADOWS.md,
                                                            zIndex: 4,
                                                            '& .duration-label': {
                                                                opacity: 1
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{
                                                        fontWeight: 900,
                                                        lineHeight: 1,
                                                        fontSize: '0.65rem',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}>
                                                        {format(start, 'HH:mm')}
                                                    </Typography>
                                                    {duration > 30 && (
                                                        <Typography 
                                                            className="duration-label"
                                                            variant="caption" 
                                                            sx={{
                                                                fontWeight: 700,
                                                                fontSize: '0.6rem',
                                                                opacity: 0.85,
                                                                mt: 0.2,
                                                                transition: 'opacity 0.2s ease'
                                                            }}
                                                        >
                                                            {session.actual_work}{t('h')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
                <Stack spacing={3}>
                    <Card sx={{
                        borderRadius: '16px',
                        background: COLORS.gradientPrimary,
                        color: COLORS.white,
                        boxShadow: SHADOWS.lg,
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                        }
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 2, opacity: 0.9 }}>{t('Summary')}</Typography>
                            <Stack spacing={2.5}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>{t('Total Work')}</Typography>
                                    <Typography variant="h5" fontWeight="800">
                                        {summaryMetrics.totalActualWork}{t('h')}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>{t('Target')}</Typography>
                                    <Typography variant="h6" fontWeight="700">
                                        {summaryMetrics.targetCapacity}{t('h')}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.9 }}>
                                            {t('Efficiency')}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 900 }}>
                                            {summaryMetrics.efficiency}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, summaryMetrics.efficiency)}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: COLORS.white,
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card sx={{
                        borderRadius: '16px',
                        backgroundColor: COLORS.white,
                        boxShadow: SHADOWS.md,
                        border: 'none'
                    }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="subtitle2" fontWeight="700" sx={{ color: COLORS.dark, mb: 2 }}>{t('Status Legend')}</Typography>
                            <Divider sx={{ mb: 2, opacity: 0.1 }} />
                            <Stack spacing={1.5}>
                                {[
                                    { color: COLORS.success, label: t('Present') },
                                    { color: COLORS.error, label: t('Late') },
                                    { color: COLORS.warning, label: t('Early Leave') },
                                    { color: COLORS.info, label: t('Ongoing') },
                                    { color: COLORS.secondary, label: t('Absent') }
                                ].map((item, index) => (
                                    <Stack key={index} direction="row" spacing={2} alignItems="center">
                                        <Box sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            backgroundColor: item.color,
                                            boxShadow: SHADOWS.xs
                                        }} />
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.secondary }}>{item.label}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Grid>
        </Grid>
    );
});

export default CalendarView;