import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Box, Typography, Paper, Chip, Button, Grid, Card,
    MenuItem, FormControl, InputLabel, Select, Divider,
    Avatar, Tooltip, IconButton,
    ToggleButton, ToggleButtonGroup, useTheme, TablePagination,
    Stack, LinearProgress, Menu, ListItemIcon, ListItemText,
    Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar,
    CircularProgress
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams } from '@mui/x-data-grid';
import {
    Refresh, Warning, Error as ErrorIcon, AccessTime,
    Schedule, Group, ViewList, TableChart,
    CalendarToday, Today, Event, GetApp,
    TrendingUp, MoreVert, ExpandMore,
    FiberManualRecord, Delete, CheckCircle, Alarm, Cancel, Print,
    Close, PersonPinCircle, Computer, People
} from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import AttendanceTimeline from '../../components/hr/AttendanceTimeline';
import AttendanceAnalytics from '../../components/hr/AttendanceAnalytics';
import MonthView from './MonthView';
import CalendarView from './CalendarView';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isToday, isAfter, differenceInDays, addDays } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { alpha } from '@mui/material/styles';

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

export const ATTENDANCE_COLORS = {
    present: COLORS.success,
    late: COLORS.error,
    earlyLeave: COLORS.warning,
    absent: COLORS.secondary,
    holiday: '#7C3AED',
    ongoing: COLORS.primary,
    overtime: '#7C3AED',
    partial: '#EA580C'
};

const round = (val: number, precision: number) => Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);

// Types
interface Department {
    id: string;
    name: string;
    description?: string;
    manager_id?: string;
    created_at?: string;
}

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

interface AttendanceSummary {
    total_employees: number;
    present_today: number;
    late_today: number;
    early_leave_today: number;
    absent_today: number;
    currently_in: number; // New field
}

// Optimized Custom Hooks
const useAttendanceData = (filters: any) => {
    const [rows, setRows] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { alert: showAlert } = useConfirm();
    const { t } = useTranslation();

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters.viewMode === 'calendar') {
                const monthStart = startOfMonth(filters.currentMonth);
                const monthEnd = endOfMonth(filters.currentMonth);
                params.append('start_date', format(monthStart, 'yyyy-MM-dd'));
                params.append('end_date', format(monthEnd, 'yyyy-MM-dd'));
            } else if (filters.viewMode === 'month') {
                const monthStart = startOfMonth(filters.currentMonth || new Date());
                const monthEnd = endOfMonth(filters.currentMonth || new Date());
                params.append('start_date', format(monthStart, 'yyyy-MM-dd'));
                params.append('end_date', format(monthEnd, 'yyyy-MM-dd'));
            } else {
                if (filters.startDate) params.append('start_date', format(filters.startDate, 'yyyy-MM-dd'));
                if (filters.endDate) params.append('end_date', format(filters.endDate, 'yyyy-MM-dd'));
            }

            if (filters.selectedEmployee) params.append('employee_id', filters.selectedEmployee);
            if (filters.selectedDepartment) params.append('department', filters.selectedDepartment);
            if (filters.rawView) params.append('raw', 'true');

            const res = await api.get(`hr/attendance?${params}`);
            setRows(res.data as AttendanceRecord[]);
        } catch (error: any) {
            console.error('Error fetching attendance:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'فشل في تحميل بيانات الحضور';
            setError(errorMessage);
            if (!silent) showAlert(`فشل في تحميل بيانات الحضور: ${errorMessage}`, t('Error'), 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters.viewMode, filters.currentMonth, filters.startDate, filters.endDate, filters.selectedEmployee, filters.selectedDepartment, filters.rawView, showAlert, t]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return { rows, loading, error, refetch: fetchLogs };
};

const useAttendanceFilters = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [rawView, setRawView] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'matrix' | 'month' | 'analytics'>('matrix');
    const [quickView, setQuickView] = useState<'today' | 'week' | 'month' | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'range'>('day');

    const handleQuickView = useCallback((view: 'today' | 'week' | 'month') => {
        const today = new Date();
        setQuickView(view);

        switch (view) {
            case 'today':
                setStartDate(today);
                setEndDate(today);
                setZoomLevel('day');
                break;
            case 'week':
                setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
                setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
                setZoomLevel('week');
                break;
            case 'month':
                setStartDate(startOfMonth(today));
                setEndDate(endOfMonth(today));
                setZoomLevel('month');
                break;
        }
    }, []);

    const handleDateChange = useCallback((newDate: Date) => {
        if (!startDate) {
            setStartDate(newDate);
            setQuickView(null);
            return;
        }

        const delta = differenceInDays(newDate, startDate);
        setStartDate(newDate);
        if (endDate) {
            setEndDate(addDays(endDate, delta));
        }
        setQuickView(null);
    }, [startDate, endDate]);

    const handleViewModeChange = useCallback((mode: typeof viewMode) => {
        if (mode) {
            setViewMode(mode);
            setQuickView(null);
            if (mode === 'month') {
                handleQuickView('month');
            }
        }
    }, [handleQuickView]);

    return {
        startDate,
        endDate,
        selectedEmployee,
        selectedDepartment,
        rawView,
        viewMode,
        quickView,
        currentMonth,
        zoomLevel,
        setStartDate,
        setEndDate,
        setSelectedEmployee,
        setSelectedDepartment,
        setRawView,
        setQuickView,
        setCurrentMonth,
        setZoomLevel,
        handleQuickView,
        handleDateChange,
        handleViewModeChange
    };
};

// Add RecentActivitySidebar component
const RecentActivitySidebar = () => {
    const { t } = useTranslation();
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecentActivity = useCallback(async () => {
        try {
            const res = await api.get('hr/recent-activity');
            setRecentLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch recent activity:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentActivity();
        const interval = setInterval(fetchRecentActivity, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [fetchRecentActivity]);

    if (loading && recentLogs.length === 0) return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={30} sx={{ color: COLORS.primary }} />
        </Box>
    );
    
    if (recentLogs.length === 0) return (
        <Paper 
            elevation={0}
            sx={{ 
                p: 4, 
                borderRadius: '16px', 
                bgcolor: COLORS.white,
                boxShadow: SHADOWS.md,
                textAlign: 'center'
            }}
        >
            <Typography variant="body2" color={COLORS.secondary} fontWeight="600">
                {t('No recent activity')}
            </Typography>
        </Paper>
    );

    return (
        <Paper 
            elevation={0}
            sx={{ 
                p: 3, 
                borderRadius: '16px', 
                bgcolor: COLORS.white,
                boxShadow: SHADOWS.md,
                height: '100%', 
                maxHeight: '800px', 
                overflowY: 'auto',
                border: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: alpha(COLORS.secondary, 0.2), borderRadius: '4px' }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: COLORS.dark }}>
                    <Box sx={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: '10px', 
                        bgcolor: alpha(COLORS.primary, 0.1), 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: `0 4px 10px ${alpha(COLORS.primary, 0.1)}`
                    }}>
                        <AccessTime sx={{ color: COLORS.primary, fontSize: 20 }} />
                    </Box>
                    {t('Live Activity')}
                </Typography>
                <Chip 
                    label={t('LIVE')} 
                    size="small" 
                    sx={{ 
                        bgcolor: alpha(COLORS.error, 0.1), 
                        color: COLORS.error, 
                        fontWeight: 900, 
                        fontSize: '0.65rem',
                        height: 20,
                        animation: 'blink 2s infinite',
                        '@keyframes blink': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.5 },
                            '100%': { opacity: 1 }
                        }
                    }} 
                />
            </Box>

            <Stack spacing={2}>
                {recentLogs.map((log, idx) => (
                    <Box key={log.id || idx} sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        alignItems: 'center',
                        p: 2,
                        borderRadius: '12px',
                        transition: 'all 0.2s ease',
                        border: `1px solid transparent`,
                        '&:hover': { 
                            bgcolor: alpha(COLORS.primary, 0.02),
                            borderColor: alpha(COLORS.primary, 0.05),
                            transform: 'translateX(-4px)'
                        }
                    }}>
                        <Avatar 
                            sx={{ 
                                width: 42, 
                                height: 42, 
                                background: log.type === 'check_in' ? COLORS.gradientSuccess : COLORS.gradientWarning,
                                color: COLORS.white,
                                fontSize: '1rem',
                                fontWeight: 800,
                                borderRadius: '12px',
                                boxShadow: SHADOWS.sm
                            }}
                        >
                            {log.employee_name?.[0]}
                        </Avatar>
                        
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="body2" fontWeight="800" color={COLORS.dark} noWrap sx={{ maxWidth: '70%' }}>
                                    {log.employee_name}
                                </Typography>
                                <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.primary, bgcolor: alpha(COLORS.primary, 0.05), px: 1, py: 0.25, borderRadius: '4px' }}>
                                    {format(parseISO(log.timestamp), 'HH:mm')}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: log.type === 'check_in' ? COLORS.success : COLORS.warning,
                                    boxShadow: `0 0 0 2px ${alpha(log.type === 'check_in' ? COLORS.success : COLORS.warning, 0.15)}`
                                }} />
                                <Typography variant="caption" fontWeight="700" sx={{ color: log.type === 'check_in' ? COLORS.success : COLORS.warning }}>
                                    {log.type === 'check_in' ? t('Check In') : t('Check Out')}
                                </Typography>
                                <Typography variant="caption" sx={{ color: COLORS.secondary, mx: 0.5 }}>•</Typography>
                                <Typography variant="caption" sx={{ color: alpha(COLORS.secondary, 0.8), fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Computer sx={{ fontSize: 12 }} />
                                    {log.device}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
};

// Add DeviceStatusWidget component
const DeviceStatusWidget = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = async () => {
        try {
            const res = await api.get('hr/devices');
            setDevices(res.data);
        } catch (error) {
            console.error('Failed to fetch devices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    if (loading) return <LinearProgress sx={{ width: 100, borderRadius: '4px', height: 4, bgcolor: alpha(COLORS.primary, 0.1), '& .MuiLinearProgress-bar': { background: COLORS.gradientPrimary } }} />;

    return (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {devices.map((device) => (
                <Tooltip key={device.id} title={`${device.name} (${device.ip_address})`}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        bgcolor: COLORS.white,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '10px',
                        boxShadow: SHADOWS.xs,
                        border: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOWS.sm }
                    }}>
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: device.status === 'online' ? COLORS.success : COLORS.error,
                            boxShadow: `0 0 0 3px ${alpha(device.status === 'online' ? COLORS.success : COLORS.error, 0.15)}`,
                            animation: device.status === 'online' ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': {
                                '0%': { boxShadow: `0 0 0 0px ${alpha(COLORS.success, 0.4)}` },
                                '70%': { boxShadow: `0 0 0 6px ${alpha(COLORS.success, 0)}` },
                                '100%': { boxShadow: `0 0 0 0px ${alpha(COLORS.success, 0)}` }
                            }
                        }} />
                        <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.dark, fontSize: '0.75rem' }}>
                            {device.name}
                        </Typography>
                    </Box>
                </Tooltip>
            ))}
        </Box>
    );
};

// Add DigitalClock component
const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            px: 2.5,
            py: 1,
            borderRadius: '12px',
            bgcolor: COLORS.white,
            border: `1px solid ${alpha(COLORS.primary, 0.1)}`,
            boxShadow: SHADOWS.xs,
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '4px',
                height: '100%',
                bgcolor: COLORS.primary
            }
        }}>
            <Typography variant="h6" fontWeight="900" sx={{ color: COLORS.primary, lineHeight: 1.2, mb: 0.25, letterSpacing: '1px', fontFamily: '"Roboto Mono", monospace' }}>
                {format(time, 'HH:mm:ss')}
            </Typography>
            <Typography variant="caption" fontWeight="700" sx={{ color: COLORS.secondary, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {format(time, 'EEEE, dd MMMM yyyy')}
            </Typography>
        </Box>
    );
};

// Add SyncDevicesButton component
const SyncDevicesButton = ({ onSyncSuccess }: { onSyncSuccess: () => void }) => {
    const { t } = useTranslation();
    const [syncing, setSyncing] = useState(false);
    const { alert: showAlert } = useConfirm();

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await api.post('hr/devices/sync-multiple', {});
            const total = res.data.total_new_logs;
            showAlert(t('Synced successfully! Found {{count}} new logs.', { count: total }), t('Sync Success'), 'success');
            onSyncSuccess();
        } catch (error) {
            console.error('Sync failed:', error);
            showAlert(t('Failed to sync devices. Please check connection.'), t('Error'), 'error');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={18} sx={{ color: COLORS.white }} /> : <Refresh />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ 
                borderRadius: '8px', 
                textTransform: 'none',
                fontWeight: 700,
                background: COLORS.gradientPrimary,
                boxShadow: SHADOWS.sm,
                px: 3,
                py: 1,
                '&:hover': {
                    boxShadow: SHADOWS.md,
                    opacity: 0.9,
                },
                '&.Mui-disabled': {
                    background: alpha(COLORS.primary, 0.5),
                    color: COLORS.white
                }
            }}
        >
            {syncing ? t('Syncing...') : t('Sync Devices')}
        </Button>
    );
};

// Consolidated Summary Cards Component
const AttendanceSummaryCards = React.memo(({
    summary,
    onCardClick
}: {
    summary: AttendanceSummary;
    onCardClick?: (type: string) => void;
}) => {
    const { t } = useTranslation();

    const cards = useMemo(() => [
        {
            id: 'total',
            title: t('Total Employees'),
            value: summary.total_employees,
            icon: <Group />,
            gradient: COLORS.gradientPrimary,
            shadowColor: alpha(COLORS.primary, 0.3)
        },
        {
            id: 'present',
            title: t('Present Today'),
            value: summary.present_today,
            icon: <CheckCircle />,
            gradient: COLORS.gradientSuccess,
            shadowColor: alpha(COLORS.success, 0.3)
        },
        {
            id: 'late',
            title: t('Late Today'),
            value: summary.late_today,
            icon: <Alarm />,
            gradient: COLORS.gradientWarning,
            shadowColor: alpha(COLORS.warning, 0.3)
        },
        {
            id: 'currently_in',
            title: t('Currently In'),
            value: summary.currently_in,
            icon: <PersonPinCircle />,
            gradient: COLORS.gradientInfo,
            shadowColor: alpha(COLORS.info, 0.3)
        },
        {
            id: 'absent',
            title: t('Absent Today'),
            value: summary.absent_today,
            icon: <Cancel />,
            gradient: COLORS.gradientError,
            shadowColor: alpha(COLORS.error, 0.3)
        }
    ], [summary, t]);

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {cards.map((card) => (
                <Grid item xs={12} sm={6} md={2.4} key={card.id}>
                    <Card 
                        elevation={0}
                        sx={{ 
                            p: 2.5, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%',
                            position: 'relative',
                            overflow: 'visible', // Changed to visible for shadow to show better
                            borderRadius: '16px',
                            background: card.gradient,
                            color: COLORS.white,
                            cursor: onCardClick ? 'pointer' : 'default',
                            boxShadow: `0 8px 16px -4px ${card.shadowColor}`,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': onCardClick ? {
                                transform: 'translateY(-8px)',
                                boxShadow: `0 12px 20px -5px ${card.shadowColor}`,
                                '& .card-icon-box': {
                                    transform: 'scale(1.1) rotate(-5deg)',
                                }
                            } : {},
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: '-20%',
                                right: '-10%',
                                width: '120px',
                                height: '120px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                zIndex: 0
                            }
                        }}
                        onClick={() => onCardClick?.(card.id)}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2.5,
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <Box 
                                className="card-icon-box"
                                sx={{ 
                                    p: 1.5, 
                                    borderRadius: '12px', 
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: COLORS.white,
                                    display: 'flex',
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                    transition: 'transform 0.3s ease'
                                }}
                            >
                                {React.cloneElement(card.icon as React.ReactElement, { sx: { fontSize: 24 } })}
                            </Box>
                            <Typography variant="h3" fontWeight="800" sx={{ color: COLORS.white, letterSpacing: '-1px' }}>
                                {card.value}
                            </Typography>
                        </Box>
                        <Typography variant="subtitle2" color="inherit" fontWeight="700" sx={{ opacity: 0.95, position: 'relative', zIndex: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                            {card.title}
                        </Typography>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
});

// Quick View Menu Component
const QuickViewMenu = React.memo(({ 
    filters,
    theme
}: {
    filters: any;
    theme: any;
}) => {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const getCurrentLabel = () => {
        switch (filters.quickView) {
            case 'today': return t('Today');
            case 'week': return t('Week');
            case 'month': return t('Month');
            default: return t('Quick View');
        }
    };

    const getCurrentIcon = () => {
        switch (filters.quickView) {
            case 'today': return <Today />;
            case 'week': return <Event />;
            case 'month': return <CalendarToday />;
            default: return <Schedule />;
        }
    };

    return (
        <>
            <Button
                onClick={handleClick}
                startIcon={getCurrentIcon()}
                endIcon={<ExpandMore />}
                variant="outlined"
                size="small"
                sx={{
                    minWidth: 120,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                    borderColor: '#E9ECEF',
                    color: COLORS.dark,
                    bgcolor: COLORS.white,
                    boxShadow: SHADOWS.xs,
                    px: 2,
                    py: 0.75,
                    '&:hover': {
                        borderColor: COLORS.primary,
                        backgroundColor: alpha(COLORS.primary, 0.05),
                        boxShadow: SHADOWS.sm
                    }
                }}
            >
                {getCurrentLabel()}
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                elevation={0}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: isRtl ? 'right' : 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: isRtl ? 'right' : 'left',
                }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '12px',
                        boxShadow: SHADOWS.lg,
                        border: `1px solid ${alpha(COLORS.dark, 0.05)}`,
                        minWidth: 160,
                        '& .MuiMenuItem-root': {
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            mx: 1,
                            my: 0.5,
                            gap: 1.5,
                            color: COLORS.dark,
                            '&:hover': {
                                bgcolor: alpha(COLORS.primary, 0.05),
                                color: COLORS.primary
                            }
                        }
                    }
                }}
            >
                <MenuItem onClick={() => { filters.handleQuickView('today'); handleClose(); }}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <Today fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Today')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { filters.handleQuickView('week'); handleClose(); }}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <Event fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('This Week')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { filters.handleQuickView('month'); handleClose(); }}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <CalendarToday fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('This Month')}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
});

// Action Menu Component
// Add AttendanceMoreActions component
const AttendanceMoreActions = React.memo(({
    filters,
    onRefresh,
    loading,
    theme,
    rows // Pass rows for export
}: {
    filters: any;
    onRefresh: () => void;
    loading?: boolean;
    theme: any;
    rows: any[];
}) => {
    const { t, i18n } = useTranslation();
    const { confirm, alert: showAlert } = useConfirm();
    const isRtl = i18n.language === 'ar';
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleRawViewToggle = () => {
        filters.setRawView(!filters.rawView);
        filters.setQuickView(null);
        handleClose();
    };

    const handleRefresh = () => {
        onRefresh();
        handleClose();
    };

    const handleExport = () => {
        if (!rows || rows.length === 0) return;

        // Add BOM for Excel UTF-8 support (Arabic characters)
        const BOM = '\uFEFF';
        const headers = filters.rawView 
            ? [t('ID'), t('Employee ID'), t('Name'), t('Timestamp'), t('Type'), t('Status'), t('Device')]
            : [t('Employee ID'), t('Name'), t('Date'), t('Check In'), t('Check Out'), t('Work Hours'), t('Status')];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => {
                if (filters.rawView) {
                    return [
                        row.id,
                        row.employee_id,
                        `"${row.employee_name}"`,
                        row.timestamp,
                        row.type,
                        row.raw_status,
                        `"${row.device}"`
                    ].join(',');
                } else {
                    return [
                        row.employee_id,
                        `"${row.employee_name}"`,
                        row.check_in_date,
                        row.check_in ? format(parseISO(row.check_in), 'HH:mm') : '-',
                        row.check_out ? format(parseISO(row.check_out), 'HH:mm') : '-',
                        row.actual_work,
                        row.status
                    ].join(',');
                }
            })
        ].join('\n');

        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        handleClose();
    };

    const handlePrint = () => {
        window.print();
        handleClose();
    };

    return (
        <>
            <Button
                onClick={handleClick}
                startIcon={<MoreVert />}
                endIcon={<ExpandMore />}
                variant="outlined"
                size="small"
                sx={{
                    minWidth: 100,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                    borderColor: '#E9ECEF',
                    color: COLORS.dark,
                    bgcolor: COLORS.white,
                    boxShadow: SHADOWS.xs,
                    px: 2,
                    py: 0.75,
                    '&:hover': {
                        borderColor: COLORS.primary,
                        backgroundColor: alpha(COLORS.primary, 0.05),
                        boxShadow: SHADOWS.sm
                    }
                }}
            >
                {t('Actions')}
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                elevation={0}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: isRtl ? 'left' : 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: isRtl ? 'left' : 'right',
                }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '12px',
                        boxShadow: SHADOWS.lg,
                        border: `1px solid ${alpha(COLORS.dark, 0.05)}`,
                        minWidth: 180,
                        '& .MuiMenuItem-root': {
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            mx: 1,
                            my: 0.5,
                            gap: 1.5,
                            color: COLORS.dark,
                            '&:hover': {
                                bgcolor: alpha(COLORS.primary, 0.05),
                                color: COLORS.primary
                            }
                        }
                    }
                }}
            >
                <MenuItem 
                    onClick={handleRawViewToggle}
                    disabled={filters.viewMode === 'calendar' || filters.viewMode === 'matrix' || filters.viewMode === 'month' || filters.viewMode === 'analytics'}
                >
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        {filters.rawView ? <TableChart fontSize="small" /> : <ViewList fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{filters.rawView ? t('Processed View') : t('Raw View')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleExport} disabled={loading || !rows || rows.length === 0}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <GetApp fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Export CSV')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handlePrint}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <Print fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Print Report')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleRefresh} disabled={loading}>
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <Refresh fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Refresh Data')}</ListItemText>
                </MenuItem>
                <Divider sx={{ my: 1, opacity: 0.1 }} />
                <MenuItem 
                    onClick={async () => {
                        handleClose();
                        const confirmed = await confirm({
                            title: t('Clear Attendance Data'),
                            message: t('Are you sure you want to delete all attendance logs? This action cannot be undone.'),
                            confirmText: t('Clear'),
                            cancelText: t('Cancel'),
                            type: 'error'
                        });
                        if (confirmed) {
                            try {
                                await api.delete('hr/attendance/clear');
                                showAlert(t('Attendance data cleared successfully'));
                                onRefresh();
                            } catch (error) {
                                console.error('Failed to clear attendance:', error);
                                showAlert(t('Failed to clear attendance data'));
                            }
                        }
                    }}
                    sx={{ color: COLORS.error, '&:hover': { bgcolor: alpha(COLORS.error, 0.05) + ' !important' } }}
                >
                    <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                        <Delete fontSize="small" sx={{ color: COLORS.error }} />
                    </ListItemIcon>
                    <ListItemText>{t('Clear All Logs')}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
});

// Consolidated Controls Component
const AttendanceControls = React.memo(({
    filters,
    employees,
    departments,
    onFilterChange,
    onApplyFilters,
    onRefresh,
    loading,
    rows
}: {
    filters: any;
    employees: any[];
    departments: Department[];
    onFilterChange: (key: string, value: any) => void;
    onApplyFilters: () => void;
    onRefresh: () => void;
    loading?: boolean;
    rows: any[];
}) => {
    const { t } = useTranslation();
    const theme = useTheme();

    return (
        <Paper 
            elevation={0}
            sx={{
                p: 2.5,
                mb: 3,
                borderRadius: '16px',
                backgroundColor: COLORS.white,
                boxShadow: SHADOWS.md,
                border: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
            }}
        >
            {/* Main Controls Row */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
                {/* View Mode Selection */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle2" fontWeight="800" sx={{ color: COLORS.dark, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                        {t('View Mode')}
                    </Typography>
                    <ToggleButtonGroup
                        value={filters.viewMode}
                        exclusive
                        onChange={(_, v) => v && filters.handleViewModeChange(v)}
                        size="small"
                        sx={{
                            backgroundColor: alpha(COLORS.bg, 0.8),
                            borderRadius: '10px',
                            p: 0.5,
                            border: 'none',
                            '& .MuiToggleButton-root': {
                                px: 2.5,
                                py: 0.75,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                border: 'none',
                                borderRadius: '8px !important',
                                color: COLORS.secondary,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&.Mui-selected': {
                                    backgroundColor: COLORS.white,
                                    color: COLORS.primary,
                                    boxShadow: SHADOWS.sm,
                                    '&:hover': {
                                        backgroundColor: COLORS.white,
                                    }
                                },
                                '&:hover': {
                                    backgroundColor: alpha(COLORS.white, 0.5),
                                    color: COLORS.primary
                                }
                            }
                        }}
                    >
                        <ToggleButton value="matrix">
                            <Schedule sx={{ marginInlineEnd: 1, fontSize: 18 }} />
                            {t('Matrix')}
                        </ToggleButton>
                        <ToggleButton value="month">
                            <CalendarToday sx={{ marginInlineEnd: 1, fontSize: 18 }} />
                            {t('Month')}
                        </ToggleButton>
                        <ToggleButton value="calendar">
                            <Event sx={{ marginInlineEnd: 1, fontSize: 18 }} />
                            {t('Calendar')}
                        </ToggleButton>
                        <ToggleButton value="table">
                            <TableChart sx={{ marginInlineEnd: 1, fontSize: 18 }} />
                            {t('List')}
                        </ToggleButton>
                        <ToggleButton value="analytics">
                            <TrendingUp sx={{ marginInlineEnd: 1, fontSize: 18 }} />
                            {t('Analytics')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center', opacity: 0.1 }} />

                {/* Quick View Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle2" fontWeight="800" sx={{ color: COLORS.dark, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                        {t('Quick View')}
                    </Typography>
                    <QuickViewMenu 
                        filters={filters} 
                        theme={theme} 
                    />
                </Box>

                {/* Action Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginInlineStart: 'auto' }}>
                    <AttendanceMoreActions 
                        filters={filters} 
                        onRefresh={onRefresh} 
                        loading={loading} 
                        theme={theme} 
                        rows={rows}
                    />
                </Box>
            </Stack>

            {/* Filters Row */}
            <Grid container spacing={2.5} alignItems="flex-end">
                {/* Date Range */}
                {(filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics') && (
                    <>
                        <Grid item xs={12} sm={6} md={2}>
                            <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.secondary, mb: 0.5, display: 'block', textTransform: 'uppercase', ml: 0.5 }}>
                                {t('Start Date')}
                            </Typography>
                            <DatePicker
                                value={filters.startDate}
                                onChange={(newValue) => onFilterChange('startDate', newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        variant: 'outlined',
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '10px',
                                                bgcolor: COLORS.white,
                                                '& fieldset': { borderColor: alpha(COLORS.secondary, 0.2) },
                                                '&:hover fieldset': { borderColor: COLORS.primary },
                                                '&.Mui-focused fieldset': { borderColor: COLORS.primary, borderWidth: '2px' },
                                            }
                                        }
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.secondary, mb: 0.5, display: 'block', textTransform: 'uppercase', ml: 0.5 }}>
                                {t('End Date')}
                            </Typography>
                            <DatePicker
                                value={filters.endDate}
                                onChange={(newValue) => onFilterChange('endDate', newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        variant: 'outlined',
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '10px',
                                                bgcolor: COLORS.white,
                                                '& fieldset': { borderColor: alpha(COLORS.secondary, 0.2) },
                                                '&:hover fieldset': { borderColor: COLORS.primary },
                                                '&.Mui-focused fieldset': { borderColor: COLORS.primary, borderWidth: '2px' },
                                            }
                                        }
                                    }
                                }}
                            />
                        </Grid>
                    </>
                )}

                {/* Department Filter */}
                <Grid item xs={12} sm={6} md={filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics' ? 2 : 3}>
                    <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.secondary, mb: 0.5, display: 'block', textTransform: 'uppercase', ml: 0.5 }}>
                        {t('Department')}
                    </Typography>
                    <FormControl fullWidth size="small">
                        <Select
                            value={filters.selectedDepartment}
                            onChange={(e) => onFilterChange('selectedDepartment', e.target.value)}
                            displayEmpty
                            sx={{
                                borderRadius: '10px',
                                bgcolor: COLORS.white,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(COLORS.secondary, 0.2) },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary, borderWidth: '2px' }
                            }}
                        >
                            <MenuItem value="">{t('All Departments')}</MenuItem>
                            {departments.map((dept, index) => (
                                <MenuItem key={dept.id || `dept-${index}`} value={dept.id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Employee Filter */}
                <Grid item xs={12} sm={6} md={filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics' ? 2 : 3}>
                    <Typography variant="caption" fontWeight="800" sx={{ color: COLORS.secondary, mb: 0.5, display: 'block', textTransform: 'uppercase', ml: 0.5 }}>
                        {t('Employee')}
                    </Typography>
                    <FormControl fullWidth size="small">
                        <Select
                            value={filters.selectedEmployee}
                            onChange={(e) => onFilterChange('selectedEmployee', e.target.value)}
                            displayEmpty
                            sx={{
                                borderRadius: '10px',
                                bgcolor: COLORS.white,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(COLORS.secondary, 0.2) },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary, borderWidth: '2px' }
                            }}
                        >
                            <MenuItem value="">{t('All Employees')}</MenuItem>
                            {employees
                                .filter(emp => !filters.selectedDepartment || emp.department_id === filters.selectedDepartment)
                                .map((emp, index) => (
                                    <MenuItem key={emp.id || emp.employee_id || `emp-${index}`} value={emp.employee_id}>
                                        {emp.name} ({emp.employee_id})
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Apply Filters Button */}
                {(filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics') && (
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={onApplyFilters}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
                            sx={{
                                height: '40px',
                                background: COLORS.gradientPrimary,
                                color: COLORS.white,
                                borderRadius: '10px',
                                fontWeight: 800,
                                textTransform: 'none',
                                boxShadow: SHADOWS.sm,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: SHADOWS.md,
                                    transform: 'translateY(-1px)',
                                    opacity: 0.95
                                },
                                '&:active': {
                                    transform: 'translateY(0)'
                                }
                            }}
                        >
                            {t('Apply')}
                        </Button>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
});

// Optimized Table View Component
const TableView = React.memo(({
    rows,
    columns,
    loading,
    totalEmployees,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange
}: {
    rows: AttendanceRecord[];
    columns: GridColDef[];
    loading: boolean;
    totalEmployees: number;
    page: number;
    rowsPerPage: number;
    handlePageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) => {
    return (
        <Box sx={{ mt: 3 }}>
            <Paper 
                elevation={0}
                sx={{
                    height: 600,
                    width: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: SHADOWS.md,
                    backgroundColor: COLORS.white,
                    border: 'none'
                }}
            >
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    getRowId={(row) => row.id || row.employee_pk || `${row.employee_id}-${row.check_in_date}-${row.check_in}`}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                            quickFilterProps: { debounceMs: 500 },
                            sx: {
                                p: 2.5,
                                borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                                '& .MuiButton-root': { 
                                    color: COLORS.primary, 
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px',
                                    '&:hover': { bgcolor: alpha(COLORS.primary, 0.05) }
                                },
                                '& .MuiInputBase-root': { 
                                    borderRadius: '10px',
                                    bgcolor: COLORS.bg,
                                    px: 2,
                                    py: 0.5,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: alpha(COLORS.primary, 0.2) },
                                    '&.Mui-focused': { borderColor: COLORS.primary, bgcolor: COLORS.white, boxShadow: SHADOWS.xs },
                                    '&:before, &:after': { display: 'none' }
                                }
                            }
                        },
                    }}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-main': { borderRadius: '16px' },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: alpha(COLORS.bg, 0.5),
                            borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}`,
                            '& .MuiDataGrid-columnHeaderTitle': {
                                fontWeight: 700,
                                color: COLORS.dark,
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                            color: COLORS.secondary,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            '&:focus': { outline: 'none' }
                        },
                        '& .MuiDataGrid-row': {
                            transition: 'all 0.2s',
                            '&:hover': {
                                backgroundColor: alpha(COLORS.primary, 0.04),
                                cursor: 'pointer'
                            }
                        },
                        '& .MuiLinearProgress-root': {
                            height: 4,
                            bgcolor: alpha(COLORS.primary, 0.1),
                            '& .MuiLinearProgress-bar': { background: COLORS.gradientPrimary }
                        }
                    }}
                />
            </Paper>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                mt: 2,
                bgcolor: COLORS.white,
                borderRadius: '12px',
                boxShadow: SHADOWS.sm,
                p: 0.5
            }}>
                <TablePagination
                    component="div"
                    count={totalEmployees}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    sx={{ 
                        border: 'none',
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            color: COLORS.secondary,
                            fontWeight: 700,
                            fontSize: '0.8rem'
                        },
                        '& .MuiTablePagination-select': {
                            fontWeight: 700,
                            color: COLORS.primary
                        }
                    }}
                />
            </Box>
        </Box>
    );
});

// Optimized Matrix View Component
const MatrixView = React.memo(({
    rows,
    employees,
    loading,
    filters,
    totalEmployees,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    handleDateChange,
    handleZoomChange
}: {
    rows: AttendanceRecord[];
    employees: any[];
    loading: boolean;
    filters: any;
    totalEmployees: number;
    page: number;
    rowsPerPage: number;
    handlePageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleDateChange: (date: Date) => void;
    handleZoomChange: (zoom: string) => void;
}) => {
    return (
        <Box sx={{ mt: 3 }}>
            <Paper 
                elevation={0}
                sx={{
                    p: 0,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: SHADOWS.md,
                    backgroundColor: COLORS.white,
                    border: 'none'
                }}
            >
                <AttendanceTimeline
                    data={rows}
                    employees={filters.selectedEmployee ? employees.filter(e => e.employee_id === filters.selectedEmployee) : employees}
                    loading={loading}
                    viewDate={filters.startDate || new Date()}
                    endDate={filters.endDate || undefined}
                    onDateChange={handleDateChange}
                    zoomLevel={filters.zoomLevel}
                    onZoomChange={handleZoomChange}
                />
            </Paper>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                mt: 2,
                bgcolor: COLORS.white,
                borderRadius: '12px',
                boxShadow: SHADOWS.sm,
                p: 0.5
            }}>
                <TablePagination
                    component="div"
                    count={totalEmployees}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    sx={{ 
                        border: 'none',
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            color: COLORS.secondary,
                            fontWeight: 700,
                            fontSize: '0.8rem'
                        }
                    }}
                />
            </Box>
        </Box>
    );
});

// Main AttendancePage Component - Optimized
const AttendancePage: React.FC = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const { alert: showAlert } = useConfirm();

    // Custom hooks
    const filters = useAttendanceFilters();
    const { rows, loading, error, refetch } = useAttendanceData({
        startDate: filters.startDate,
        endDate: filters.endDate,
        selectedEmployee: filters.selectedEmployee,
        selectedDepartment: filters.selectedDepartment,
        rawView: filters.rawView,
        viewMode: filters.viewMode,
        currentMonth: filters.currentMonth
    });

    const [summary, setSummary] = useState<AttendanceSummary>({
        total_employees: 0,
        present_today: 0,
        late_today: 0,
        early_leave_today: 0,
        absent_today: 0,
        currently_in: 0
    });

    // State for employees and departments
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.selectedDepartment) params.append('department', filters.selectedDepartment);
            const res = await api.get(`hr/dashboard?${params}`);
            setSummary(res.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setSummaryLoading(false);
        }
    }, [filters.selectedDepartment]);

    const handleRefresh = useCallback(async (silent = false) => {
        await Promise.all([refetch(silent), fetchSummary()]);
    }, [refetch, fetchSummary]);

    // Auto-refresh data periodically (silent)
    useEffect(() => {
        // Only auto-refresh if we are viewing the current month or today's data
        const isCurrentView = filters.viewMode === 'month' ? 
            format(filters.currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM') :
            (filters.startDate && isToday(filters.startDate)) || (filters.endDate && isToday(filters.endDate));

        if (!isCurrentView) return;

        const interval = setInterval(() => {
            handleRefresh(true);
        }, 60000); // Refresh every minute

        return () => clearInterval(interval);
    }, [handleRefresh, filters.viewMode, filters.currentMonth, filters.startDate, filters.endDate]);

    // Detail Dialog State
    const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string; data: any[] }>({
        open: false,
        type: '',
        title: '',
        data: []
    });

    const handleCardClick = useCallback(async (type: string) => {
        let title = '';
        let filteredData = [];
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        switch (type) {
            case 'late':
                title = t('Late Employees Today');
                filteredData = rows.filter((r: any) => r.check_in_date === todayStr && r.status === 'late');
                break;
            case 'currently_in':
                title = t('Employees Currently In');
                filteredData = rows.filter((r: any) => r.check_in_date === todayStr && !r.check_out);
                break;
            case 'present':
                title = t('Employees Present Today');
                filteredData = rows.filter((r: any) => r.check_in_date === todayStr);
                break;
            case 'absent':
                title = t('Employees Absent Today');
                try {
                    const params = new URLSearchParams();
                    if (filters.selectedDepartment) params.append('department', filters.selectedDepartment);
                    const res = await api.get(`hr/absent-employees?${params}`);
                    filteredData = res.data;
                } catch (error) {
                    console.error('Failed to fetch absent employees:', error);
                    filteredData = [];
                }
                break;
            default:
                return;
        }

        setDetailDialog({
            open: true,
            type,
            title,
            data: filteredData
        });
    }, [rows, t, filters.selectedDepartment]);

    // Optimized data fetching
    const fetchEmployees = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append('page', (page + 1).toString());
            params.append('limit', rowsPerPage.toString());
            if (filters.selectedDepartment) params.append('department', filters.selectedDepartment);

            const res = await api.get(`hr/employees?${params}`);
            setEmployees(res.data.employees || []);
            setTotalEmployees(res.data.total || 0);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }, [page, rowsPerPage, filters.selectedDepartment]);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await api.get('departments');
            setDepartments(res.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }, []);

    // Optimized summary calculation with useMemo
    const calculatedSummary = useMemo(() => {
        if (filters.rawView) return summary;

        const totalCount = totalEmployees;
        const periods = rows;

        const rangeStart = filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        const rangeEnd = filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

        const rangePeriods = periods.filter((period: AttendanceRecord) =>
            period.check_in_date >= rangeStart && period.check_in_date <= rangeEnd && period.check_out
        );

        const uniqueEmployeesInRange = new Set(rangePeriods.map((p: AttendanceRecord) => p.employee_id)).size;
        
        // Currently in: Check-in today but no check-out
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentlyIn = periods.filter((p: any) => 
            p.check_in_date === todayStr && !p.check_out
        ).length;

        return {
            total_employees: totalCount,
            present_today: rangePeriods.filter((p: any) => p.status === 'present').length,
            late_today: rangePeriods.filter((p: any) => p.status === 'late').length,
            early_leave_today: rangePeriods.filter((p: any) => p.status === 'early_leave').length,
            absent_today: totalCount - uniqueEmployeesInRange,
            currently_in: currentlyIn
        };
    }, [filters.rawView, filters.startDate, filters.endDate, totalEmployees, rows]);

    // Update summary when calculated summary changes (only if not today)
    useEffect(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const isTodayRange = filters.startDate && format(filters.startDate, 'yyyy-MM-dd') === todayStr && 
                           filters.endDate && format(filters.endDate, 'yyyy-MM-dd') === todayStr;
        
        if (!isTodayRange || filters.rawView) {
            setSummary(calculatedSummary);
        }
    }, [calculatedSummary, filters.startDate, filters.endDate, filters.rawView]);

    // Effects
    useEffect(() => {
        fetchDepartments();
        fetchSummary();
    }, [fetchDepartments, fetchSummary]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Update view mode effects
    useEffect(() => {
        if (filters.quickView) return;

        if (filters.viewMode === 'month') {
            filters.setZoomLevel('month');
        } else if (filters.startDate && filters.endDate && isAfter(filters.endDate, filters.startDate) && filters.viewMode === 'matrix') {
            filters.setZoomLevel('range');
        } else if (filters.startDate && filters.endDate && isSameDay(filters.startDate, filters.endDate)) {
            filters.setZoomLevel('day');
        }
    }, [filters.startDate, filters.endDate, filters.viewMode, filters.quickView, filters.setZoomLevel]);

    // Optimized columns with useMemo
    const columns: GridColDef[] = useMemo(() => {
        if (filters.rawView) {
            return [
                { field: 'id', headerName: t('ID'), width: 80 },
                { field: 'employee_id', headerName: t('Employee ID'), width: 120 },
                { field: 'employee_name', headerName: t('Name'), width: 200, flex: 1 },
                {
                    field: 'timestamp',
                    headerName: t('Timestamp'),
                    width: 200,
                    renderCell: (params: GridRenderCellParams) => params.value ? format(parseISO(params.value), 'yyyy-MM-dd HH:mm:ss') : ''
                },
                {
                    field: 'type',
                    headerName: t('Type'),
                    width: 120,
                    renderCell: (params: GridRenderCellParams) => {
                        const isCheckIn = params.value === 'check_in';
                        const color = isCheckIn ? COLORS.success : COLORS.warning;
                        return (
                            <Chip
                                label={isCheckIn ? t('Check In').toUpperCase() : t('Check Out').toUpperCase()}
                                sx={{
                                    borderRadius: '6px',
                                    height: 24,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    backgroundColor: alpha(color, 0.1),
                                    color: color,
                                    border: `1px solid ${alpha(color, 0.2)}`,
                                    '& .MuiChip-label': { px: 1 }
                                }}
                            />
                        );
                    }
                },
                { field: 'raw_status', headerName: t('Device Status'), width: 120 },
                { field: 'verification_mode', headerName: t('Verification'), width: 130 },
                { field: 'device', headerName: t('Device Name'), width: 120 },
                { field: 'device_ip', headerName: t('Device IP'), width: 120 },
            ];
        }

        return [
            {
                field: 'employee_name',
                headerName: t('User'),
                width: 220,
                renderCell: (params: GridRenderCellParams) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: COLORS.primary, 
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            boxShadow: SHADOWS.xs
                        }}>
                            {params.value?.[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight="700" color={COLORS.dark}>{params.value}</Typography>
                            <Typography variant="caption" color={COLORS.secondary}>{params.row.employee_id}</Typography>
                        </Box>
                    </Box>
                )
            },
            {
                field: 'check_in_date',
                headerName: t('Date'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={COLORS.secondary} fontWeight="600">
                        {params.value ? format(parseISO(params.value), 'dd/MM/yyyy') : '-'}
                    </Typography>
                )
            },
            {
                field: 'check_in',
                headerName: t('Start'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={COLORS.dark} fontWeight="700">
                        {params.value ? format(parseISO(params.value), 'HH:mm') : '-'}
                    </Typography>
                )
            },
            {
                field: 'check_out',
                headerName: t('End'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={COLORS.dark} fontWeight="700">
                        {params.value ? format(parseISO(params.value), 'HH:mm') : '-'}
                    </Typography>
                )
            },
            {
                field: 'break_hours',
                headerName: t('Break'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={COLORS.secondary} fontWeight="600">
                        {params.value ? `${params.value}h` : '-'}
                    </Typography>
                )
            },
            {
                field: 'actual_work',
                headerName: t('Work'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {params.row.actual_work < params.row.capacity && params.row.status !== 'ongoing' && (
                            <Warning sx={{ fontSize: 16, color: COLORS.warning }} />
                        )}
                        <Typography variant="body2" fontWeight="700" color={COLORS.dark}>{params.value}h</Typography>
                    </Box>
                )
            },
            {
                field: 'capacity',
                headerName: t('Capacity'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={COLORS.secondary} fontWeight="600">
                        {params.value ? `${params.value}h` : '8.0h'}
                    </Typography>
                )
            },
            {
                field: 'overtime',
                headerName: t('Overtime'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography 
                        variant="body2" 
                        color={params.value > 0 ? COLORS.success : COLORS.secondary} 
                        sx={{ fontWeight: params.value > 0 ? '700' : '600' }}
                    >
                        {params.value > 0 ? `+${params.value}h` : '-'}
                    </Typography>
                )
            },
            {
                field: 'status',
                headerName: t('Status'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => {
                    const status = params.value as string;
                    const isTodayRecord = isToday(parseISO(params.row.check_in_date));
                    const isMissingExit = !params.row.check_out && !isTodayRecord;

                    const getStatusColor = () => {
                        if (isMissingExit) return COLORS.error;
                        switch (status) {
                            case 'present': return COLORS.success;
                            case 'late': return COLORS.warning;
                            case 'early_leave': return COLORS.info;
                            case 'holiday': return COLORS.primary;
                            case 'ongoing': return COLORS.info;
                            default: return COLORS.error;
                        }
                    };

                    const color = getStatusColor();

                    if (isMissingExit) {
                        return (
                            <Chip
                                label={t('Missing Exit').toUpperCase()}
                                sx={{
                                    borderRadius: '6px',
                                    height: 24,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    backgroundColor: alpha(COLORS.error, 0.1),
                                    color: COLORS.error,
                                    border: `1px solid ${alpha(COLORS.error, 0.2)}`,
                                    '& .MuiChip-label': { px: 1 }
                                }}
                            />
                        );
                    }

                    return (
                        <Chip
                            label={t(status || 'present').toUpperCase()}
                            sx={{
                                borderRadius: '6px',
                                height: 24,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: alpha(color, 0.1),
                                color: color,
                                border: `1px solid ${alpha(color, 0.2)}`,
                                '& .MuiChip-label': { px: 1 }
                            }}
                        />
                    );
                }
            }
        ];
    }, [filters.rawView, t, showAlert]);

    // Optimized handlers
    const handleFilterChange = useCallback((key: string, value: any) => {
        switch (key) {
            case 'startDate':
                filters.setStartDate(value);
                filters.setQuickView(null);
                break;
            case 'endDate':
                filters.setEndDate(value);
                filters.setQuickView(null);
                break;
            case 'selectedDepartment':
                filters.setSelectedDepartment(value);
                filters.setQuickView(null);
                setPage(0);
                break;
            case 'selectedEmployee':
                filters.setSelectedEmployee(value);
                filters.setQuickView(null);
                setPage(0);
                break;
        }
    }, [filters]);

    const handlePageChange = useCallback((_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    if (error) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Card sx={{ p: 3, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                    <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                    <Typography variant="h6" color="error.main" gutterBottom>
                        {t('Error Loading Attendance Data')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        {error}
                    </Typography>
                    <Button variant="contained" onClick={() => refetch()} startIcon={<Refresh />}>
                        {t('Retry')}
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ 
                p: 3, 
                backgroundColor: COLORS.bg,
                minHeight: '100vh',
                overflowX: 'hidden', 
                boxSizing: 'border-box', 
                width: '100%',
                '@media print': {
                    p: 0,
                    '& .no-print': { display: 'none' },
                    '& .MuiPaper-root': { border: 'none', boxShadow: 'none' }
                }
            }}>
                {/* Header */}
                <Box className="no-print" sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                        <Typography variant="h4" fontWeight="800" color={COLORS.dark} sx={{ letterSpacing: '-0.5px' }}>
                            {t('Attendance Management')}
                        </Typography>
                        <SyncDevicesButton onSyncSuccess={handleRefresh} />
                        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: alpha(COLORS.secondary, 0.2) }} />
                        <DeviceStatusWidget />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DigitalClock />
                        <AttendanceMoreActions onRefresh={handleRefresh} rows={rows} filters={filters} theme={theme} />
                    </Box>
                </Box>

                {/* Loading Indicator */}
                {(loading || summaryLoading) && (
                    <Box className="no-print" sx={{ width: '100%', mb: 3, borderRadius: '4px', overflow: 'hidden' }}>
                        <LinearProgress sx={{ 
                            height: 4, 
                            borderRadius: 2, 
                            backgroundColor: alpha(COLORS.primary, 0.1),
                            '& .MuiLinearProgress-bar': { backgroundColor: COLORS.primary }
                        }} />
                    </Box>
                )}

                {/* Summary Cards */}
                {!filters.rawView && (
                    <AttendanceSummaryCards summary={summary} onCardClick={handleCardClick} />
                )}

                {/* Detail Dialog */}
                <Dialog 
                    className="no-print"
                    open={detailDialog.open} 
                    onClose={() => setDetailDialog(prev => ({ ...prev, open: false }))}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: '16px',
                            boxShadow: SHADOWS.lg,
                            backgroundImage: 'none',
                            overflow: 'hidden'
                        }
                    }}
                >
                    <DialogTitle sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 3,
                        background: `linear-gradient(135deg, ${COLORS.dark} 0%, ${alpha(COLORS.dark, 0.9)} 100%)`,
                        color: COLORS.white
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: alpha(COLORS.white, 0.2), color: COLORS.white }}>
                                {detailDialog.type === 'late' ? <AccessTime /> : <People />}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.2 }}>{detailDialog.title}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    {detailDialog.data.length} {t('Employees')}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton 
                            onClick={() => setDetailDialog(prev => ({ ...prev, open: false }))}
                            sx={{ color: COLORS.white, '&:hover': { bgcolor: alpha(COLORS.white, 0.1) } }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 0, bgcolor: COLORS.bg }}>
                        {detailDialog.data.length > 0 ? (
                            <List sx={{ py: 1 }}>
                                {detailDialog.data.map((item, idx) => (
                                    <ListItem 
                                        key={idx} 
                                        sx={{ 
                                            px: 3, 
                                            py: 2,
                                            mx: 1.5,
                                            my: 0.75,
                                            width: 'auto',
                                            borderRadius: '12px',
                                            bgcolor: COLORS.white,
                                            boxShadow: SHADOWS.xs,
                                            transition: 'all 0.2s',
                                            '&:hover': { 
                                                transform: 'translateY(-2px)',
                                                boxShadow: SHADOWS.sm,
                                                bgcolor: alpha(COLORS.primary, 0.02)
                                            }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ 
                                                width: 42, 
                                                height: 42, 
                                                bgcolor: alpha(COLORS.primary, 0.1), 
                                                color: COLORS.primary,
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                boxShadow: SHADOWS.xs
                                            }}>
                                                {item.employee_name?.[0]}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={
                                                <Typography variant="subtitle1" fontWeight="700" color={COLORS.dark}>
                                                    {item.employee_name}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" color={COLORS.secondary} fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                                    <Box component="span" sx={{ bgcolor: alpha(COLORS.secondary, 0.1), px: 1, borderRadius: '4px' }}>
                                                        {t('ID')}: {item.employee_id}
                                                    </Box>
                                                    {detailDialog.type !== 'absent' && (
                                                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <AccessTime sx={{ fontSize: 14 }} />
                                                            {item.check_in ? format(parseISO(item.check_in), 'HH:mm') : '-'}
                                                        </Box>
                                                    )}
                                                </Typography>
                                            }
                                        />
                                        <Chip 
                                            label={t(item.status || 'present').toUpperCase()} 
                                            sx={{ 
                                                borderRadius: '6px',
                                                height: 24,
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                background: item.status === 'absent' ? COLORS.gradientError : (item.status === 'late' ? COLORS.gradientWarning : COLORS.gradientSuccess),
                                                color: COLORS.white,
                                                boxShadow: SHADOWS.xs,
                                                '& .MuiChip-label': { px: 1.5 }
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(COLORS.secondary, 0.1), color: COLORS.secondary, mx: 'auto', mb: 2 }}>
                                    <People sx={{ fontSize: 32 }} />
                                </Avatar>
                                <Typography fontWeight="700" color={COLORS.dark}>{t('No data found for today.')}</Typography>
                                <Typography variant="caption" color={COLORS.secondary}>{t('Check again later or verify filters.')}</Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <Box sx={{ p: 2, bgcolor: COLORS.white, borderTop: `1px solid ${alpha(COLORS.secondary, 0.1)}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                            variant="contained" 
                            onClick={() => setDetailDialog(prev => ({ ...prev, open: false }))}
                            sx={{ 
                                background: COLORS.gradientPrimary,
                                color: COLORS.white,
                                borderRadius: '8px',
                                px: 3,
                                fontWeight: 700,
                                textTransform: 'none'
                            }}
                        >
                            {t('Close')}
                        </Button>
                    </Box>
                </Dialog>

                {/* Consolidated Controls */}
                <Box className="no-print">
                    <AttendanceControls
                        filters={filters}
                        employees={employees}
                        departments={departments}
                        onFilterChange={handleFilterChange}
                        onApplyFilters={handleRefresh}
                        onRefresh={handleRefresh}
                        loading={loading}
                        rows={rows}
                    />
                </Box>

                {/* Content Area */}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={filters.viewMode === 'analytics' ? 12 : 9} sx={{ overflow: 'visible' }}>
                        {filters.viewMode === 'analytics' && (
                            <AttendanceAnalytics 
                                data={rows} 
                                employees={employees} 
                                startDate={filters.startDate || new Date()} 
                                endDate={filters.endDate || new Date()} 
                            />
                        )}

                        {filters.viewMode === 'matrix' && (
                            <MatrixView
                                rows={rows}
                                employees={employees}
                                loading={loading}
                                filters={filters}
                                totalEmployees={totalEmployees}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                handlePageChange={handlePageChange}
                                handleRowsPerPageChange={handleRowsPerPageChange}
                                handleDateChange={filters.handleDateChange}
                                handleZoomChange={(zoom) => {
                                    filters.setZoomLevel(zoom as 'day' | 'week' | 'month' | 'range');
                                    filters.setQuickView(null);
                                }}
                            />
                        )}

                        {filters.viewMode === 'table' && (
                            <TableView
                                rows={rows}
                                columns={columns}
                                loading={loading}
                                totalEmployees={totalEmployees}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                handlePageChange={handlePageChange}
                                handleRowsPerPageChange={handleRowsPerPageChange}
                            />
                        )}

                        {filters.viewMode === 'month' && (
                            <MonthView
                                rows={rows}
                                employees={employees}
                                filters={{
                                    ...filters,
                                    startDate: filters.startDate || undefined,
                                    endDate: filters.endDate || undefined
                                }}
                                totalEmployees={totalEmployees}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                handlePageChange={handlePageChange}
                                handleRowsPerPageChange={handleRowsPerPageChange}
                            />
                        )}

                        {filters.viewMode === 'calendar' && (
                            <CalendarView
                                rows={rows}
                                filters={filters}
                            />
                        )}
                    </Grid>

                    {filters.viewMode !== 'analytics' && (
                        <Grid item xs={12} md={3} className="no-print">
                            <RecentActivitySidebar />
                        </Grid>
                    )}
                </Grid>
            </Box>
        </LocalizationProvider>
    );
};

export default AttendancePage;
