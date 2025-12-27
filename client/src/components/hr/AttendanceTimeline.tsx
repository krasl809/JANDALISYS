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

// Colors inspired by the reference image - matching the new design
const TIMELINE_COLORS = {
    present: '#10B981', // Emerald 500 - for normal attendance
    late: '#EF4444',    // Red 500 - for late arrival
    earlyLeave: '#F59E0B', // Amber 500 - for early leave
    absent: '#6B7280',  // Gray 500 - for absent
    ongoing: '#3B82F6', // Blue 500 - for ongoing work
    overtime: '#8B5CF6', // Violet 500 - for overtime
    partial: '#F97316'  // Orange 500 - for partial work
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
    const { t } = useTranslation();
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
                backgroundColor: 'action.hover', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`
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
                                        left: `${startPercent}%`,
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: getRawColor(),
                                        border: '2px solid white',
                                        zIndex: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            opacity: 0.8,
                                            transform: 'translate(-50%, -50%) scale(1.1)'
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
                                    left: `${startPercent}% `,
                                    width: `${widthPercent}% `,
                                    height: 28,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    borderRadius: 1,
                                    backgroundColor: getStatusColor(),
                                    border: `1px solid ${getStatusColor()}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: 1,
                                    zIndex: 1,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        opacity: 0.8
                                    }
                                }}
                            >
                                {showLabels && (
                                    <Typography variant="caption" sx={{ 
                                        color: 'white', 
                                        fontWeight: 600, 
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
    }, [data, timeRange, handlePopoverOpen, t, theme.palette.divider]);

    // Loading state
    if (loading) {
        return (
            <Paper sx={{
                p: 4,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                textAlign: 'center'
            }}>
                <CircularProgress size={40} sx={{ color: TIMELINE_COLORS.present, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    {t('Loading attendance data...')}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{
            p: 2,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden'
        }}>
            {/* --- Simple Controls Header --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ 
                        display: 'flex', 
                        backgroundColor: 'action.hover', 
                        borderRadius: 1, 
                        p: 0.5, 
                        border: `1px solid ${theme.palette.divider}`
                    }}>
                        <IconButton size="small" onClick={handlePrev} disabled={zoomLevel === 'range'} sx={{ color: TIMELINE_COLORS.present }}>
                            <ChevronLeft />
                        </IconButton>
                        <IconButton size="small" onClick={() => onDateChange(new Date())} sx={{ 
                            color: 'white', 
                            backgroundColor: TIMELINE_COLORS.present,
                            mx: 0.5,
                            '&:hover': { backgroundColor: TIMELINE_COLORS.present, opacity: 0.8 }
                        }}>
                            <Today />
                        </IconButton>
                        <IconButton size="small" onClick={handleNext} disabled={zoomLevel === 'range'} sx={{ color: TIMELINE_COLORS.present }}>
                            <ChevronRight />
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
                                        '& .MuiInput-root': { 
                                            fontWeight: 500, 
                                            '& fieldset': {
                                                borderColor: theme.palette.divider
                                            }
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
                            backgroundColor: 'action.hover',
                            border: `1px solid ${theme.palette.divider}`,
                            '& .MuiToggleButton-root': {
                                px: 1.5,
                                py: 0.5,
                                fontWeight: 500,
                                textTransform: 'none',
                                border: 'none',
                                borderRadius: '0px !important',
                                '&.Mui-selected': {
                                    backgroundColor: TIMELINE_COLORS.present,
                                    color: 'white'
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
                                backgroundColor: 'action.hover',
                                color: TIMELINE_COLORS.overtime,
                                border: `1px solid ${theme.palette.divider}`,
                                '&:hover': {
                                    backgroundColor: 'action.selected'
                                },
                                '&:disabled': {
                                    opacity: 0.5
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
                                backgroundColor: 'action.hover',
                                color: TIMELINE_COLORS.ongoing,
                                border: `1px solid ${theme.palette.divider}`,
                                '&:hover': {
                                    backgroundColor: 'action.selected'
                                },
                                '&:disabled': {
                                    opacity: 0.5
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
                    backgroundColor: 'action.hover'
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: TIMELINE_COLORS.present,
                    '&:hover': {
                        backgroundColor: TIMELINE_COLORS.present,
                        opacity: 0.8
                    }
                }
            }} ref={scrollContainerRef}>
                {/* Grid Lines */}
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 240, 
                    right: 0, 
                    bottom: 0, 
                    pointerEvents: 'none', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    zIndex: 0 
                }}>
                    {timeRange.interval.map((_, i) => (
                        <Box key={i} sx={{ 
                            borderLeft: `1px solid ${theme.palette.divider}`, 
                            width: 1, 
                            height: '100%' 
                        }} />
                    ))}
                </Box>

                {/* Time Scale Header */}
                <Box sx={{ 
                    display: 'flex', 
                    mb: 2, 
                    borderBottom: `1px solid ${theme.palette.divider}`, 
                    pb: 1, 
                    position: 'sticky', 
                    top: 0, 
                    backgroundColor: 'background.paper', 
                    zIndex: 10,
                    px: 1
                }}>
                    <Box sx={{ 
                        minWidth: 240, 
                        flexShrink: 0, 
                        display: 'flex',
                        alignItems: 'center',
                        px: 1
                    }}>
                        <Schedule sx={{ mr: 1, color: TIMELINE_COLORS.present }} />
                        <Typography variant="subtitle2" fontWeight="600" color="primary">
                            {t('Employees')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'space-between', pr: 2 }}>
                        {timeRange.interval.map((t, i) => (
                            <Typography key={i} variant="caption" color="text.secondary" sx={{ 
                                minWidth: 60, 
                                textAlign: 'center', 
                                fontWeight: 500,
                                px: 1
                            }}>
                                {format(t, timeRange.labelFormat)}
                            </Typography>
                        ))}
                    </Box>
                </Box>

                {/* Employee Rows */}
                <Stack spacing={1}>
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
                                borderRadius: 1,
                                border: `1px solid ${theme.palette.divider}`,
                                backgroundColor: index % 2 === 0 ? 'transparent' : 'action.hover',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'action.selected'
                                }
                            }}>
                                {/* Employee Info - Sticky */}
                                <Box sx={{
                                    minWidth: 240,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: 'inherit',
                                    zIndex: 2,
                                    borderRight: `1px solid ${theme.palette.divider}`,
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: '0 4px 4px 0'
                                }}>
                                    <Avatar sx={{ 
                                        backgroundColor: TIMELINE_COLORS.present, 
                                        width: 32, 
                                        height: 32, 
                                        fontSize: '0.85rem', 
                                        fontWeight: 600
                                    }}>
                                        {emp.name[0]}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight="600" sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {emp.name}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ 
                                                fontSize: '0.7rem'
                                            }}>
                                                {emp.employee_id}
                                            </Typography>
                                            <Box sx={{
                                                px: 0.5,
                                                py: 0.1,
                                                borderRadius: 0.5,
                                                backgroundColor: progress >= 100 ? TIMELINE_COLORS.present : 
                                                         progress >= 75 ? TIMELINE_COLORS.ongoing : 
                                                         TIMELINE_COLORS.earlyLeave,
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5
                                            }}>
                                                <Typography sx={{ 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 600 
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
                                    px: 1
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
                        width: 280,
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.divider}`
                    }
                }}
            >
                {selectedDetailLog && (
                    <Card sx={{ borderRadius: 1 }}>
                        <CardContent sx={{ p: 0 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                backgroundColor: 'action.hover', 
                                borderBottom: `1px solid ${theme.palette.divider}`
                            }}>
                                <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                                    {selectedDetailLog.status === 'present' ? t('Present') :
                                        selectedDetailLog.status === 'late' ? t('Late') :
                                        selectedDetailLog.status === 'early_leave' ? t('Early Leave') : 
                                        selectedDetailLog.status === 'ongoing' ? t('Ongoing Work') : 
                                        t('Working Period')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(selectedDetailLog.timestamp ? parseISO(selectedDetailLog.timestamp) : parseISO(selectedDetailLog.check_in), 'EEEE, MMMM d, yyyy')}
                                </Typography>
                            </Box>
                            <List dense sx={{ p: 1 }}>
                                {/* If it's a period, show all raw logs for that day */}
                                {selectedDetailLog.check_in ? (
                                    data.filter(log => !!log.timestamp && isSameDay(parseISO(log.timestamp), parseISO(selectedDetailLog.check_in)) && (log.employee_id === selectedDetailLog.employee_id || log.employee_pk === selectedDetailLog.employee_pk))
                                        .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime())
                                        .map((raw, rIdx) => (
                                            <ListItem key={rIdx} sx={{ px: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    {raw.type === 'check_in' ? 
                                                        <Check fontSize="small" sx={{ color: TIMELINE_COLORS.present }} /> : 
                                                        <AccessTime fontSize="small" sx={{ color: TIMELINE_COLORS.ongoing }} />
                                                    }
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={format(parseISO(raw.timestamp), 'HH:mm:ss')}
                                                    secondary={t(raw.type)}
                                                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8rem' }}
                                                    secondaryTypographyProps={{ fontSize: '0.7rem', color: 'text.secondary' }}
                                                />
                                            </ListItem>
                                        ))
                                ) : (
                                    <ListItem sx={{ px: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            <AccessTime fontSize="small" sx={{ color: TIMELINE_COLORS.present }} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={format(parseISO(selectedDetailLog.timestamp), 'HH:mm:ss')}
                                            secondary={t(selectedDetailLog.type)}
                                            primaryTypographyProps={{ fontWeight: 600 }}
                                        />
                                    </ListItem>
                                )}
                                <ListItem sx={{ px: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        <DeviceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={selectedDetailLog.device || t('Machine: #01 (Front)')}
                                        secondary={t('Verification: Fingerprint')}
                                        primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                                    />
                                </ListItem>
                            </List>
                            <Divider />
                            <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
                                <Button 
                                    size="small" 
                                    fullWidth 
                                    variant="outlined" 
                                    sx={{ 
                                        borderRadius: 1, 
                                        textTransform: 'none', 
                                        fontWeight: 500,
                                        borderColor: theme.palette.divider,
                                        '&:hover': {
                                            backgroundColor: 'action.hover'
                                        }
                                    }}
                                >
                                    {t('Request Correction')}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Popover>

            {/* --- Legend --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ 
                mt: 3, 
                pt: 2, 
                borderTop: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'action.hover',
                px: 1
            }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: TIMELINE_COLORS.present
                    }} />
                    <Typography variant="caption" fontWeight="500">{t('Normal Work')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: TIMELINE_COLORS.late
                    }} />
                    <Typography variant="caption" fontWeight="500">{t('Late Check-in')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: TIMELINE_COLORS.earlyLeave
                    }} />
                    <Typography variant="caption" fontWeight="500">{t('Early Leave')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: TIMELINE_COLORS.ongoing
                    }} />
                    <Typography variant="caption" fontWeight="500">{t('Ongoing Session')}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: theme.palette.divider
                    }} />
                    <Typography variant="caption" color="text.secondary">{t('Weekend / Off')}</Typography>
                </Stack>
            </Stack>
        </Paper>
    );
};

export default AttendanceTimeline;
