import React, { useMemo, useCallback } from 'react';
import {
    Box, Typography, Paper, Card, CardContent, Grid, Divider,
    Stack, LinearProgress, useTheme
} from '@mui/material';
import { format, parseISO, eachDayOfInterval, isToday, isWeekend, differenceInMinutes, endOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ATTENDANCE_COLORS } from './AttendancePage';

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
    const { t } = useTranslation();

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

    const handleBlockClick = useCallback((session: AttendanceRecord) => {
        console.log('Attendance block clicked:', session);
    }, []);

    return (
        <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={9}>
                <Paper sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: 'background.paper'
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: 600 }}>
                        {/* Grid Header */}
                        <Box sx={{
                            display: 'flex',
                            bgcolor: 'background.default',
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                            <Box sx={{ width: 60, flexShrink: 0 }} />
                            {days.map((day, i) => (
                                <Box key={i} sx={{
                                    flex: 1,
                                    textAlign: 'center',
                                    py: 1.5,
                                    borderLeft: `1px solid ${theme.palette.divider}`
                                }}>
                                    <Typography variant="caption" fontWeight="600" color={isToday(day) ? 'primary.main' : 'text.secondary'}>
                                        {format(day, 'EEE')}
                                    </Typography>
                                    <Typography variant="h6" fontWeight="600" color={isToday(day) ? 'primary.main' : 'text.primary'}>
                                        {format(day, 'd')}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Grid Body */}
                        <Box sx={{ display: 'flex', flexGrow: 1, overflowY: 'auto', position: 'relative' }}>
                            {/* Time Scale */}
                            <Box sx={{
                                width: 60,
                                flexShrink: 0,
                                bgcolor: 'background.default',
                                borderRight: `1px solid ${theme.palette.divider}`
                            }}>
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <Box key={h} sx={{ height: 40, pr: 1, textAlign: 'right' }}>
                                        <Typography variant="caption" sx={{
                                            fontWeight: 500,
                                            color: 'text.secondary',
                                            lineHeight: 1
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
                                        borderLeft: `1px solid ${theme.palette.divider}`,
                                        backgroundColor: isWeekend(day) ? 'action.hover' : 'transparent'
                                    }}>
                                        {/* Hour lines */}
                                        {Array.from({ length: 24 }).map((_, h) => (
                                            <Box key={h} sx={{ height: 40, borderBottom: `1px solid ${theme.palette.divider}` }} />
                                        ))}

                                        {/* Activity Blocks */}
                                        {attendanceByDay[format(day, 'yyyy-MM-dd')]?.map((session: AttendanceRecord, sIdx: number) => {
                                            const start = parseISO(session.check_in);
                                            const end = session.check_out ? parseISO(session.check_out) : (isToday(start) ? new Date() : endOfDay(start));
                                            const startMin = start.getHours() * 60 + start.getMinutes();
                                            const duration = Math.max(15, differenceInMinutes(end, start));
                                            const statusColor = getStatusColor(session.status);

                                            return (
                                                <Box
                                                    key={sIdx}
                                                    onClick={() => handleBlockClick(session)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: `${startMin}px`,
                                                        height: `${duration}px`,
                                                        left: 2,
                                                        right: 2,
                                                        borderRadius: 1,
                                                        backgroundColor: statusColor,
                                                        color: 'white',
                                                        px: 0.5,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            opacity: 0.8,
                                                            transform: 'scale(1.01)'
                                                        }
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{
                                                        fontWeight: 600,
                                                        lineHeight: 1,
                                                        fontSize: '0.65rem'
                                                    }}>
                                                        {format(start, 'HH:mm')}
                                                    </Typography>
                                                    {duration > 30 && (
                                                        <Typography variant="caption" sx={{
                                                            fontWeight: 500,
                                                            fontSize: '0.6rem',
                                                            opacity: 0.9
                                                        }}>
                                                            {session.actual_work}h
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
                <Stack spacing={2}>
                    <Card sx={{
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.divider}`
                    }}>
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" fontWeight="600" gutterBottom>{t('Summary')}</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={1.5}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('Total Work')}</Typography>
                                    <Typography variant="h6" fontWeight="600" color="primary">
                                        {summaryMetrics.totalActualWork}h
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('Target')}</Typography>
                                    <Typography variant="h6" fontWeight="600" color="text.secondary">
                                        {summaryMetrics.targetCapacity}h
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        {t('Efficiency')}: {summaryMetrics.efficiency}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, summaryMetrics.efficiency)}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'action.hover'
                                        }}
                                        color={summaryMetrics.efficiency >= 100 ? 'success' : 'primary'}
                                    />
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card sx={{
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.divider}`
                    }}>
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" fontWeight="600" gutterBottom>{t('Status')}</Typography>
                            <Divider sx={{ mb: 1 }} />
                            <Stack spacing={1}>
                                {[
                                    { color: ATTENDANCE_COLORS.present, label: t('Present') },
                                    { color: ATTENDANCE_COLORS.late, label: t('Late') },
                                    { color: ATTENDANCE_COLORS.earlyLeave, label: t('Early Leave') },
                                    { color: ATTENDANCE_COLORS.ongoing, label: t('Ongoing') },
                                    { color: ATTENDANCE_COLORS.absent, label: t('Absent') }
                                ].map((item, index) => (
                                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                                        <Box sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor: item.color
                                        }} />
                                        <Typography variant="caption" fontWeight="500">{item.label}</Typography>
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