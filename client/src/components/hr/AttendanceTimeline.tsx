import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Box, Typography, Paper, Tooltip, IconButton,
    Popover, ToggleButtonGroup, ToggleButton, Stack, useTheme,
    CircularProgress, Avatar, Divider, List, ListItem, ListItemIcon, ListItemText, Button,
    Card, CardContent
} from '@mui/material';
import {
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    Today, AccessTime, PersonalVideo as DeviceIcon,
    Check, Warning, Info, Schedule, TrendingUp
} from '@mui/icons-material';
import { format, addDays, subDays, startOfDay, endOfDay, eachHourOfInterval, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, startOfMonth, endOfMonth, differenceInMinutes, parseISO, isToday, isAfter, isSameHour, differenceInHours, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { alpha } from '@mui/material/styles';

// Material Dashboard 2 Pro Constants
const COLORS = {
    primary: '#5E72E4',
    secondary: '#8392AB',
    info: '#11CDEF',
    success: '#2DCE89',
    warning: '#FB6340',
    error: '#F5365C',
    dark: '#344767',
    light: '#E9ECEF',
    white: '#FFFFFF',
    bg: '#F8F9FA'
};

const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)'
};

const TIMELINE_COLORS = {
    present: COLORS.success,
    late: COLORS.error,
    earlyLeave: COLORS.warning,
    absent: COLORS.secondary,
    ongoing: COLORS.info,
    overtime: '#825EE4', // Gradient primary end
    partial: '#FBB140'   // Gradient warning end
};

interface AttendanceTimelineProps {
    data: any[];
    employees: any[];
    loading: boolean;
    viewDate: Date;
    endDate?: Date;
    onDateChange: (date: Date) => void;
    zoomLevel: 'day' | 'week' | 'month' | 'range';
    onZoomChange: (zoom: 'day' | 'week' | 'month' | 'range') => void;
}

const AttendanceTimeline: React.FC<AttendanceTimelineProps> = ({
    data, employees, loading, viewDate, endDate, onDateChange, zoomLevel, onZoomChange
}) => {
    const theme = useTheme();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [selectedDetailLog, setSelectedDetailLog] = useState<any>(null);

    const handlePopoverOpen = useCallback((event: React.MouseEvent<HTMLElement>, log: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedDetailLog(log);
    }, []);

    const handlePopoverClose = useCallback(() => {
        setAnchorEl(null);
        setSelectedDetailLog(null);
    }, []);

    const open = Boolean(anchorEl);

    // --- Time Range Calculation with Memoization ---
    const timeRange = useMemo(() => {
        if (zoomLevel === 'day') {
            return {
                start: startOfDay(viewDate),
                end: endOfDay(viewDate),
                interval: eachHourOfInterval({
                    start: startOfDay(viewDate),
                    end: endOfDay(viewDate)
                }),
                labelFormat: 'HH:mm'
            };
        } else if (zoomLevel === 'week') {
            const start = startOfWeek(viewDate, { weekStartsOn: 0 });
            const end = endOfWeek(viewDate, { weekStartsOn: 0 });
            return {
                start,
                end,
                interval: eachDayOfInterval({ start, end }),
                labelFormat: 'EEE, MMM d'
            };
        } else if (zoomLevel === 'month') {
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            return {
                start,
                end,
                interval: eachDayOfInterval({ start, end }),
                labelFormat: 'MMM d'
            };
        } else {
            // Range view
            const start = startOfDay(viewDate);
            const end = endDate ? endOfDay(endDate) : endOfDay(viewDate);
            
            return {
                start,
                end,
                interval: eachDayOfInterval({ start, end }),
                labelFormat: 'MMM d'
            };
        }
    }, [zoomLevel, viewDate, endDate]);

    // --- Navigation Helpers with Callbacks ---
    const handleNext = useCallback(() => {
        if (zoomLevel === 'day') onDateChange(addDays(viewDate, 1));
        else if (zoomLevel === 'week') onDateChange(addDays(viewDate, 7));
        else if (zoomLevel === 'month') onDateChange(addMonths(viewDate, 1));
    }, [zoomLevel, viewDate, onDateChange]);

    const handlePrev = useCallback(() => {
        if (zoomLevel === 'day') onDateChange(subDays(viewDate, 1));
        else if (zoomLevel === 'week') onDateChange(subDays(viewDate, 7));
        else if (zoomLevel === 'month') onDateChange(subMonths(viewDate, 1));
    }, [zoomLevel, viewDate, onDateChange]);

    const handleZoomIn = useCallback(() => {
        if (zoomLevel === 'month') onZoomChange('week');
        else if (zoomLevel === 'week') onZoomChange('day');
    }, [zoomLevel, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        if (zoomLevel === 'day') onZoomChange('week');
        else if (zoomLevel === 'week') onZoomChange('month');
    }, [zoomLevel, onZoomChange]);

    // --- Render Log Segments with Flat Design ---
    const renderSegments = useCallback((employeeId: string) => {
        const employeeLogs = data.filter(log => log.employee_id === employeeId || log.employee_pk === employeeId);
        
        if (employeeLogs.length === 0) return null;

        const totalMinutesInRange = differenceInMinutes(timeRange.end, timeRange.start);

        return (
            <Box sx={{ 
                position: 'relative', 
                height: 36, 
                width: '100%', 
                backgroundColor: alpha(COLORS.bg, 0.5), 
                borderRadius: '8px',
                border: `1px solid ${COLORS.light}`
            }}>
                {employeeLogs.map((log, idx) => {
                    // Handle both Raw Logs and Processed Periods
                    const isRaw = !!log.timestamp;
                    const startTime = isRaw ? parseISO(log.timestamp) : (log.check_in ? parseISO(log.check_in) : null);
                    const endTime = isRaw ? null : (log.check_out ? parseISO(log.check_out) : null);

                    if (!startTime) return null;
                    if (startTime > timeRange.end) return null;
                    if (endTime && endTime < timeRange.start) return null;
                    if (!endTime && isRaw && startTime < timeRange.start) return null;

                    const startOffset = Math.max(0, differenceInMinutes(startTime, timeRange.start));
                    const startPercent = (startOffset / totalMinutesInRange) * 100;

                    if (isRaw) {
                        const getRawColor = () => {
                            switch (log.type) {
                                case 'check_in': return TIMELINE_COLORS.present;
                                case 'check_out': return TIMELINE_COLORS.ongoing;
                                default: return TIMELINE_COLORS.absent;
                            }
                        };

                        return (
                            <Tooltip
                                key={idx}
                                title={t('Raw Log event')}
                                arrow
                            >
                                <Box
                                    onClick={(e: any) => handlePopoverOpen(e, log)}
                                    sx={{
                                        position: 'absolute',
                                        insetInlineStart: `${startPercent}%`,
                                        top: '50%',
                                        transform: `translate(${isRtl ? '50%' : '-50%'}, -50%)`,
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        backgroundColor: getRawColor(),
                                        border: '2px solid white',
                                        boxShadow: SHADOWS.xs,
                                        zIndex: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: `translate(${isRtl ? '50%' : '-50%'}, -50%) scale(1.2)`,
                                            boxShadow: SHADOWS.sm,
                                            zIndex: 3
                                        }
                                    }}
                                />
                            </Tooltip>
                        );
                    } else {
                        // Processed Period (Flat Bar)
                        const periodEndTime = endTime || (isToday(startTime) ? new Date() : endOfDay(startTime));
                        const endOffset = Math.min(totalMinutesInRange, differenceInMinutes(periodEndTime, timeRange.start));
                        const endPercent = (endOffset / totalMinutesInRange) * 100;
                        const widthPercent = Math.max(0.5, endPercent - startPercent);

                        // Show time labels if the bar is wide enough
                        const showLabels = widthPercent > 12;

                        const getStatusColor = () => {
                            switch (log.status) {
                                case 'present': return TIMELINE_COLORS.present;
                                case 'late': return TIMELINE_COLORS.late;
                                case 'early_leave': return TIMELINE_COLORS.earlyLeave;
                                case 'ongoing': return TIMELINE_COLORS.ongoing;
                                case 'overtime': return TIMELINE_COLORS.overtime;
                                default: return TIMELINE_COLORS.absent;
                            }
                        };

                        return (
                            <Box
                                key={idx}
                                onClick={(e: any) => handlePopoverOpen(e, log)}
                                sx={{
                                    position: 'absolute',
                                    insetInlineStart: `${startPercent}% `,
                                    width: `${widthPercent}% `,
                                    height: 28,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    borderRadius: '6px',
                                    backgroundColor: getStatusColor(),
                                    border: 'none',
                                    boxShadow: SHADOWS.xs,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingInline: 1,
                                    zIndex: 1,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-50%) scaleY(1.05)',
                                        boxShadow: SHADOWS.sm,
                                        zIndex: 2
                                    }
                                }}
                            >
                                {showLabels && (
                                    <Typography variant="caption" sx={{ 
                                        color: COLORS.white, 
                                        fontWeight: 700, 
                                        whiteSpace: 'nowrap', 
                                        fontSize: '0.65rem'
                                    }}>
                                        {format(startTime, 'HH:mm')} - {endTime ? format(endTime, 'HH:mm') : '--:--'}
                                    </Typography>
                                )}
                            </Box>
                        );
                    }
                })}
            </Box>
        );
    }, [data, timeRange, handlePopoverOpen, t, isRtl]);

    // Loading state
    if (loading) {
        return (
            <Paper sx={{
                p: 4,
                borderRadius: '12px',
                border: 'none',
                boxShadow: SHADOWS.md,
                textAlign: 'center',
                backgroundColor: COLORS.white
            }}>
                <CircularProgress size={40} sx={{ color: COLORS.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ color: COLORS.secondary, fontWeight: 600 }}>
                    {t('Loading attendance data...')}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{
            p: 3,
            borderRadius: '12px',
            border: 'none',
            boxShadow: SHADOWS.md,
            backgroundColor: COLORS.white,
            overflow: 'hidden'
        }}>
            {/* --- Simple Controls Header --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ 
                        display: 'flex', 
                        backgroundColor: COLORS.bg, 
                        borderRadius: '10px', 
                        p: 0.5, 
                        border: 'none'
                    }}>
                        <IconButton size="small" onClick={handlePrev} disabled={zoomLevel === 'range'} sx={{ color: COLORS.primary }}>
                            {isRtl ? <ChevronRight /> : <ChevronLeft />}
                        </IconButton>
                        <IconButton size="small" onClick={() => onDateChange(new Date())} sx={{ 
                            color: COLORS.white, 
                            background: `linear-gradient(135deg, ${COLORS.primary} 0%, #825EE4 100%)`,
                            marginInline: 0.5,
                            boxShadow: SHADOWS.xs,
                            '&:hover': { background: `linear-gradient(135deg, ${COLORS.primary} 0%, #825EE4 100%)`, opacity: 0.9 }
                        }}>
                            <Today />
                        </IconButton>
                        <IconButton size="small" onClick={handleNext} disabled={zoomLevel === 'range'} sx={{ color: COLORS.primary }}>
                            {isRtl ? <ChevronLeft /> : <ChevronRight />}
                        </IconButton>
                    </Box>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            value={viewDate}
                            onChange={(date) => date && onDateChange(date)}
                            slotProps={{
                                textField: {
                                    variant: 'outlined',
                                    size: 'small',
                                    sx: {
                                        width: 180,
                                        '& .MuiOutlinedInput-root': { 
                                            fontWeight: 600,
                                            borderRadius: '8px',
                                            backgroundColor: COLORS.bg,
                                            '& fieldset': { border: 'none' },
                                            '&:hover fieldset': { border: 'none' },
                                            '&.Mui-focused fieldset': { border: `1px solid ${COLORS.primary}` }
                                        }
                                    }
                                }
                            }}
                        />
                    </LocalizationProvider>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <ToggleButtonGroup
                        value={zoomLevel}
                        exclusive
                        onChange={(_, v) => v && onZoomChange(v)}
                        size="small"
                        sx={{
                            backgroundColor: COLORS.bg,
                            borderRadius: '8px',
                            p: 0.5,
                            border: 'none',
                            '& .MuiToggleButton-root': {
                                px: 2,
                                py: 0.75,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                border: 'none',
                                borderRadius: '6px !important',
                                color: COLORS.secondary,
                                '&.Mui-selected': {
                                    backgroundColor: COLORS.white,
                                    color: COLORS.primary,
                                    boxShadow: SHADOWS.xs,
                                    '&:hover': {
                                        backgroundColor: COLORS.white,
                                    }
                                }
                            }
                        }}
                    >
                        {endDate && isAfter(endDate, viewDate) && <ToggleButton value="range">{t('Range')}</ToggleButton>}
                        <ToggleButton value="month">{t('Month')}</ToggleButton>
                        <ToggleButton value="week">{t('Week')}</ToggleButton>
                        <ToggleButton value="day">{t('Day')}</ToggleButton>
                    </ToggleButtonGroup>

                    <Stack direction="row" spacing={0.5}>
                        <IconButton 
                            size="small" 
                            onClick={handleZoomOut} 
                            disabled={zoomLevel === 'month' || zoomLevel === 'range'}
                            sx={{
                                backgroundColor: COLORS.bg,
                                color: COLORS.primary,
                                borderRadius: '8px',
                                '&:hover': {
                                    backgroundColor: alpha(COLORS.primary, 0.1)
                                },
                                '&:disabled': {
                                    opacity: 0.3
                                }
                            }}
                        >
                            <ZoomOut />
                        </IconButton>
                        <IconButton 
                            size="small" 
                            onClick={handleZoomIn} 
                            disabled={zoomLevel === 'day' || zoomLevel === 'range'}
                            sx={{
                                backgroundColor: COLORS.bg,
                                color: COLORS.primary,
                                borderRadius: '8px',
                                '&:hover': {
                                    backgroundColor: alpha(COLORS.primary, 0.1)
                                },
                                '&:disabled': {
                                    opacity: 0.3
                                }
                            }}
                        >
                            <ZoomIn />
                        </IconButton>
                    </Stack>
                </Stack>
            </Stack>

            {/* --- Timeline Matrix --- */}
            <Box sx={{ 
                position: 'relative', 
                overflowX: 'auto', 
                pb: 2,
                '&::-webkit-scrollbar': {
                    height: '6px'
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: COLORS.bg
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: alpha(COLORS.primary, 0.3),
                    borderRadius: '10px',
                    '&:hover': {
                        backgroundColor: alpha(COLORS.primary, 0.5)
                    }
                }
            }} ref={scrollContainerRef}>
                {/* Grid Lines */}
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    insetInlineStart: 240, 
                    insetInlineEnd: 0, 
                    bottom: 0, 
                    pointerEvents: 'none', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    zIndex: 0 
                }}>
                    {timeRange.interval.map((_, i) => (
                        <Box key={i} sx={{ 
                            borderInlineStart: `1px solid ${COLORS.light}`, 
                            width: 1, 
                            height: '100%' 
                        }} />
                    ))}
                </Box>

                {/* Time Scale Header */}
                <Box sx={{ 
                    display: 'flex', 
                    mb: 2, 
                    borderBottom: `1px solid ${COLORS.light}`, 
                    pb: 1, 
                    position: 'sticky', 
                    top: 0, 
                    backgroundColor: COLORS.white, 
                    zIndex: 10,
                    paddingInline: 1
                }}>
                    <Box sx={{ 
                        minWidth: 240, 
                        flexShrink: 0, 
                        display: 'flex',
                        alignItems: 'center',
                        paddingInline: 1
                    }}>
                        <Schedule sx={{ marginInlineEnd: 1, color: COLORS.primary }} />
                        <Typography variant="subtitle2" fontWeight="700" sx={{ color: COLORS.dark }}>
                            {t('Employees')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'space-between', paddingInlineEnd: 2 }}>
                        {timeRange.interval.map((t, i) => (
                            <Typography key={i} variant="caption" sx={{ 
                                minWidth: 60, 
                                textAlign: 'center', 
                                fontWeight: 600,
                                color: COLORS.secondary,
                                paddingInline: 1
                            }}>
                                {format(t, timeRange.labelFormat)}
                            </Typography>
                        ))}
                    </Box>
                </Box>

                {/* Employee Rows */}
                <Stack spacing={1.5}>
                    {employees.map((emp, index) => {
                        // Calculate employee work progress
                        const empLogs = data.filter(d => d.employee_id === emp.employee_id || d.employee_pk === emp.id);
                        const work = empLogs.reduce((acc, curr) => acc + (curr.actual_work || 0), 0);
                        const capacity = empLogs[0]?.capacity || 8.0;
                        const progress = Math.min(100, (work / capacity) * 100);

                        return (
                            <Box key={emp.id} sx={{
                                display: 'flex',
                                alignItems: 'center',
                                py: 1,
                                borderRadius: '12px',
                                border: `1px solid ${alpha(COLORS.light, 0.5)}`,
                                backgroundColor: index % 2 === 0 ? 'transparent' : alpha(COLORS.bg, 0.5),
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: alpha(COLORS.bg, 0.8),
                                    boxShadow: SHADOWS.xs
                                }
                            }}>
                                {/* Employee Info - Sticky */}
                                <Box sx={{
                                    minWidth: 240,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    position: 'sticky',
                                    insetInlineStart: 0,
                                    backgroundColor: 'inherit',
                                    zIndex: 2,
                                    borderInlineEnd: `1px solid ${COLORS.light}`,
                                    py: 0.5,
                                    paddingInline: 1,
                                    borderRadius: isRtl ? '12px 0 0 12px' : '0 12px 12px 0'
                                }}>
                                    <Avatar sx={{ 
                                        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #825EE4 100%)`,
                                        width: 36, 
                                        height: 36, 
                                        fontSize: '0.85rem', 
                                        fontWeight: 700,
                                        boxShadow: SHADOWS.xs
                                    }}>
                                        {emp.name[0]}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 700,
                                            color: COLORS.dark,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {emp.name}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                            <Typography variant="caption" sx={{ 
                                                color: COLORS.secondary,
                                                fontWeight: 500,
                                                fontSize: '0.7rem'
                                            }}>
                                                {emp.employee_id}
                                            </Typography>
                                            <Box sx={{
                                                paddingInline: 0.75,
                                                py: 0.2,
                                                borderRadius: '6px',
                                                backgroundColor: progress >= 100 ? alpha(COLORS.success, 0.1) : 
                                                         progress >= 75 ? alpha(COLORS.info, 0.1) : 
                                                         alpha(COLORS.warning, 0.1),
                                                color: progress >= 100 ? COLORS.success : 
                                                         progress >= 75 ? COLORS.info : 
                                                         COLORS.warning,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5
                                            }}>
                                                <Typography sx={{ 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 700 
                                                }}>
                                                    {Math.round(work * 10) / 10}/{capacity}h
                                                </Typography>
                                                {progress < 100 && <Warning sx={{ fontSize: 10 }} />}
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Box>

                                {/* Timeline Segments */}
                                <Box sx={{ 
                                    flexGrow: 1, 
                                    position: 'relative', 
                                    height: 40, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    zIndex: 1,
                                    paddingInline: 1
                                }}>
                                    {renderSegments(emp.employee_id)}
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>

            {/* --- Detail Popover --- */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        p: 0,
                        width: 300,
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: SHADOWS.lg,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedDetailLog && (
                    <Box sx={{ backgroundColor: COLORS.white }}>
                        <Box sx={{ 
                            p: 2, 
                            background: `linear-gradient(135deg, ${COLORS.dark} 0%, #1e293b 100%)`,
                            color: COLORS.white
                        }}>
                            <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 0.5 }}>
                                {selectedDetailLog.status === 'present' ? t('Present') :
                                    selectedDetailLog.status === 'late' ? t('Late') :
                                    selectedDetailLog.status === 'early_leave' ? t('Early Leave') : 
                                    selectedDetailLog.status === 'ongoing' ? t('Ongoing Work') : 
                                    t('Working Period')}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {format(selectedDetailLog.timestamp ? parseISO(selectedDetailLog.timestamp) : parseISO(selectedDetailLog.check_in), 'EEEE, MMMM d, yyyy')}
                            </Typography>
                        </Box>
                        <List dense sx={{ p: 1.5 }}>
                            {/* If it's a period, show all raw logs for that day */}
                            {selectedDetailLog.check_in ? (
                                data.filter(log => !!log.timestamp && isSameDay(parseISO(log.timestamp), parseISO(selectedDetailLog.check_in)) && (log.employee_id === selectedDetailLog.employee_id || log.employee_pk === selectedDetailLog.employee_pk))
                                    .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime())
                                    .map((raw, rIdx) => (
                                        <ListItem key={rIdx} sx={{ px: 1, py: 0.5, borderRadius: '8px', mb: 0.5, '&:hover': { bgcolor: COLORS.bg } }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                {raw.type === 'check_in' ? 
                                                    <Check fontSize="small" sx={{ color: COLORS.success }} /> : 
                                                    <AccessTime fontSize="small" sx={{ color: COLORS.info }} />
                                                }
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={format(parseISO(raw.timestamp), 'HH:mm:ss')}
                                                secondary={t(raw.type)}
                                                primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: COLORS.dark }}
                                                secondaryTypographyProps={{ fontSize: '0.75rem', color: COLORS.secondary, fontWeight: 500 }}
                                            />
                                        </ListItem>
                                    ))
                            ) : (
                                <ListItem sx={{ px: 1, py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <AccessTime fontSize="small" sx={{ color: COLORS.primary }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={format(parseISO(selectedDetailLog.timestamp), 'HH:mm:ss')}
                                        secondary={t(selectedDetailLog.type)}
                                        primaryTypographyProps={{ fontWeight: 700, color: COLORS.dark }}
                                        secondaryTypographyProps={{ fontSize: '0.75rem', color: COLORS.secondary }}
                                    />
                                </ListItem>
                            )}
                            <Divider sx={{ my: 1, opacity: 0.5 }} />
                            <ListItem sx={{ px: 1, py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <DeviceIcon fontSize="small" sx={{ color: COLORS.secondary }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={selectedDetailLog.device || t('Machine: #01 (Front)')}
                                    secondary={t('Verification: Fingerprint')}
                                    primaryTypographyProps={{ variant: 'caption', fontWeight: 600, color: COLORS.dark }}
                                    secondaryTypographyProps={{ variant: 'caption', color: COLORS.secondary }}
                                />
                            </ListItem>
                        </List>
                        <Box sx={{ p: 2, pt: 0 }}>
                            <Button 
                                size="small" 
                                fullWidth 
                                variant="contained" 
                                sx={{ 
                                    borderRadius: '8px', 
                                    textTransform: 'none', 
                                    fontWeight: 700,
                                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, #825EE4 100%)`,
                                    boxShadow: SHADOWS.xs,
                                    '&:hover': {
                                        boxShadow: SHADOWS.sm
                                    }
                                }}
                            >
                                {t('Request Correction')}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Popover>

            {/* --- Legend --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ 
                mt: 4, 
                pt: 3, 
                borderTop: `1px solid ${COLORS.light}`,
                px: 1
            }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        backgroundColor: COLORS.success,
                        boxShadow: SHADOWS.xs
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.secondary }}>{t('Normal Work')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        backgroundColor: COLORS.error,
                        boxShadow: SHADOWS.xs
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.secondary }}>{t('Late Check-in')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        backgroundColor: COLORS.warning,
                        boxShadow: SHADOWS.xs
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.secondary }}>{t('Early Leave')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        backgroundColor: COLORS.info,
                        boxShadow: SHADOWS.xs
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.secondary }}>{t('Ongoing Session')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        backgroundColor: COLORS.light,
                        border: `1px solid ${alpha(COLORS.secondary, 0.2)}`
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.secondary }}>{t('Weekend / Off')}</Typography>
                </Stack>
            </Stack>
        </Paper>
    );
};

export default AttendanceTimeline;
