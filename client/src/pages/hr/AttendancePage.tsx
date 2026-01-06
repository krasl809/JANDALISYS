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
    Close, PersonPinCircle
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

// Colors inspired by professional enterprise systems (Zoho, etc.)
export const ATTENDANCE_COLORS = {
    present: '#059669',     // Emerald 600
    late: '#DC2626',        // Red 600
    earlyLeave: '#D97706',  // Amber 600
    absent: '#475569',      // Slate 600
    holiday: '#7C3AED',     // Violet 600
    ongoing: '#2563EB',     // Blue 600
    overtime: '#7C3AED',    // Violet 600
    partial: '#EA580C'      // Orange 600
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
    const theme = useTheme();
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

    if (loading && recentLogs.length === 0) return <LinearProgress />;
    if (recentLogs.length === 0) return null;

    return (
        <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%', maxHeight: '800px', overflowY: 'auto' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime fontSize="small" color="primary" />
                {t('Live Activity')}
            </Typography>
            <Stack spacing={2}>
                {recentLogs.map((log, idx) => (
                    <Box key={log.id || idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: log.type === 'check_in' ? ATTENDANCE_COLORS.present : ATTENDANCE_COLORS.earlyLeave, fontSize: '0.8rem' }}>
                            {log.employee_name?.[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight="600" noWrap title={log.employee_name}>
                                {log.employee_name}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                    {log.type === 'check_in' ? t('Checked In') : t('Checked Out')}
                                </Typography>
                                <Typography variant="caption" fontWeight="700" color="primary.main">
                                    {format(parseISO(log.timestamp), 'HH:mm')}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {log.device}
                            </Typography>
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

    if (loading) return <LinearProgress sx={{ width: 100 }} />;

    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {devices.map((device) => (
                <Tooltip key={device.id} title={`${device.name} (${device.ip_address})`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FiberManualRecord 
                            sx={{ 
                                fontSize: 12, 
                                color: device.status === 'online' ? ATTENDANCE_COLORS.present : ATTENDANCE_COLORS.late 
                            }} 
                        />
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
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
    const theme = useTheme();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            px: 2,
            py: 0.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}>
            <Typography variant="h6" fontWeight="800" sx={{ color: 'primary.main', lineHeight: 1, mb: 0.5 }}>
                {format(time, 'HH:mm:ss')}
            </Typography>
            <Typography variant="caption" fontWeight="500" color="text.secondary">
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
            color="primary"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ 
                borderRadius: 2, 
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 2
            }}
        >
            {syncing ? t('Syncing...') : t('Sync Devices')}
        </Button>
    );
};

// Consolidated Summary Cards Component
const AttendanceSummaryCards = React.memo(({
    summary,
    theme,
    onCardClick
}: {
    summary: AttendanceSummary;
    theme: any;
    onCardClick?: (type: string) => void;
}) => {
    const { t } = useTranslation();

    const cards = useMemo(() => [
        {
            id: 'total',
            title: t('Total Employees'),
            value: summary.total_employees,
            icon: <Group sx={{ fontSize: 28 }} />,
            color: theme.palette.primary.main
        },
        {
            id: 'present',
            title: t('Present Today'),
            value: summary.present_today,
            icon: <CheckCircle sx={{ fontSize: 28 }} />,
            color: ATTENDANCE_COLORS.present
        },
        {
            id: 'late',
            title: t('Late Today'),
            value: summary.late_today,
            icon: <Alarm sx={{ fontSize: 28 }} />,
            color: ATTENDANCE_COLORS.late
        },
        {
            id: 'currently_in',
            title: t('Currently In'),
            value: summary.currently_in,
            icon: <PersonPinCircle sx={{ fontSize: 28 }} />,
            color: ATTENDANCE_COLORS.ongoing
        },
        {
            id: 'absent',
            title: t('Absent Today'),
            value: summary.absent_today,
            icon: <Cancel sx={{ fontSize: 28 }} />,
            color: ATTENDANCE_COLORS.absent
        }
    ], [summary, theme.palette.primary.main, t]);

    return (
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {cards.map((card) => (
                <Grid item xs={12} sm={6} md={2.4} key={card.id}>
                    <Card 
                        sx={{ 
                            p: 2.5, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 4,
                            border: `1px solid ${alpha(card.color, 0.1)}`,
                            background: theme.palette.mode === 'light'
                                ? `linear-gradient(135deg, ${alpha(card.color, 0.02)} 0%, #FFFFFF 100%)`
                                : `linear-gradient(135deg, ${alpha(card.color, 0.05)} 0%, ${theme.palette.background.paper} 100%)`,
                            cursor: onCardClick ? 'pointer' : 'default',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': onCardClick ? {
                                transform: 'translateY(-6px)',
                                boxShadow: theme.palette.mode === 'light'
                                    ? `0 12px 24px ${alpha(card.color, 0.12)}`
                                    : `0 12px 24px ${alpha(card.color, 0.3)}`,
                                border: `1px solid ${alpha(card.color, 0.3)}`,
                            } : {}
                        }}
                        onClick={() => onCardClick?.(card.id)}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2,
                            zIndex: 1
                        }}>
                            <Box sx={{ 
                                p: 1.2, 
                                borderRadius: 2.5, 
                                background: `linear-gradient(135deg, ${card.color} 0%, ${alpha(card.color, 0.8)} 100%)`,
                                color: '#FFFFFF',
                                display: 'flex',
                                boxShadow: `0 4px 12px ${alpha(card.color, 0.25)}`
                            }}>
                                {card.icon}
                            </Box>
                            <Typography variant="h4" fontWeight="900" sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
                                {card.value}
                            </Typography>
                        </Box>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="700" sx={{ zIndex: 1 }}>
                            {card.title}
                        </Typography>
                        
                        {/* Decorative background element */}
                        <Box sx={{ 
                            position: 'absolute', 
                            right: -15, 
                            bottom: -15, 
                            opacity: theme.palette.mode === 'light' ? 0.06 : 0.1, 
                            transform: 'rotate(-10deg)',
                            color: card.color,
                            transition: 'all 0.3s ease',
                            '.MuiCard-root:hover &': {
                                transform: 'rotate(0deg) scale(1.1)',
                                opacity: 0.12
                            }
                        }}>
                            {React.cloneElement(card.icon as React.ReactElement, { sx: { fontSize: 100 } })}
                        </Box>

                        {/* Progress line at bottom */}
                        <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: 4,
                            background: alpha(card.color, 0.1)
                        }}>
                            <Box sx={{
                                width: '40%', // Decorative width
                                height: '100%',
                                background: card.color,
                                borderRadius: '0 4px 4px 0'
                            }} />
                        </Box>
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
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: 1,
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.primary,
                    '&:hover': {
                        borderColor: ATTENDANCE_COLORS.present,
                        backgroundColor: 'action.hover'
                    }
                }}
            >
                {getCurrentLabel()}
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: isRtl ? 'right' : 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: isRtl ? 'right' : 'left',
                }}
            >
                <MenuItem onClick={() => { filters.handleQuickView('today'); handleClose(); }}>
                    <ListItemIcon>
                        <Today fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Today')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { filters.handleQuickView('week'); handleClose(); }}>
                    <ListItemIcon>
                        <Event fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('This Week')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { filters.handleQuickView('month'); handleClose(); }}>
                    <ListItemIcon>
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
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: 1,
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.primary,
                    '&:hover': {
                        borderColor: ATTENDANCE_COLORS.present,
                        backgroundColor: 'action.hover'
                    }
                }}
            >
                {t('Actions')}
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: isRtl ? 'left' : 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: isRtl ? 'left' : 'right',
                }}
            >
                <MenuItem 
                    onClick={handleRawViewToggle}
                    disabled={filters.viewMode === 'calendar' || filters.viewMode === 'matrix' || filters.viewMode === 'month' || filters.viewMode === 'analytics'}
                >
                    <ListItemIcon>
                        {filters.rawView ? <TableChart fontSize="small" /> : <ViewList fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{filters.rawView ? t('Processed View') : t('Raw View')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleExport} disabled={loading || !rows || rows.length === 0}>
                    <ListItemIcon>
                        <GetApp fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Export CSV')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handlePrint}>
                    <ListItemIcon>
                        <Print fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Print Report')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleRefresh} disabled={loading}>
                    <ListItemIcon>
                        <Refresh fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('Refresh Data')}</ListItemText>
                </MenuItem>
                <Divider />
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
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <Delete fontSize="small" color="error" />
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
        <Paper sx={{
            p: 2,
            mb: 2,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'background.paper'
        }}>
            {/* Main Controls Row */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                {/* View Mode Selection */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight="600" sx={{ whiteSpace: 'nowrap' }}>
                        {t('View Mode')}:
                    </Typography>
                    <ToggleButtonGroup
                        value={filters.viewMode}
                        exclusive
                        onChange={(_, v) => v && filters.handleViewModeChange(v)}
                        size="small"
                        sx={{
                            backgroundColor: 'background.paper',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            '& .MuiToggleButton-root': {
                                paddingInline: 1.5,
                                py: 0.5,
                                fontWeight: 500,
                                textTransform: 'none',
                                border: 'none',
                                borderRadius: '0px !important',
                                '&.Mui-selected': {
                                    backgroundColor: ATTENDANCE_COLORS.present,
                                    color: 'white'
                                }
                            }
                        }}
                    >
                        <ToggleButton value="matrix">
                            <Schedule sx={{ marginInlineEnd: 0.5, fontSize: 16 }} />
                            {t('Matrix')}
                        </ToggleButton>
                        <ToggleButton value="month">
                            <CalendarToday sx={{ marginInlineEnd: 0.5, fontSize: 16 }} />
                            {t('Month')}
                        </ToggleButton>
                        <ToggleButton value="calendar">
                            <Event sx={{ marginInlineEnd: 0.5, fontSize: 16 }} />
                            {t('Calendar')}
                        </ToggleButton>
                        <ToggleButton value="table">
                            <TableChart sx={{ marginInlineEnd: 0.5, fontSize: 16 }} />
                            {t('List')}
                        </ToggleButton>
                        <ToggleButton value="analytics">
                            <TrendingUp sx={{ marginInlineEnd: 0.5, fontSize: 16 }} />
                            {t('Analytics')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Quick View Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight="600" sx={{ whiteSpace: 'nowrap' }}>
                        {t('Quick View')}:
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
            <Grid container spacing={2} alignItems="center">
                {/* Date Range */}
                {(filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics') && (
                    <>
                        <Grid item xs={12} sm={6} md={2}>
                            <DatePicker
                                label={t('Start Date')}
                                value={filters.startDate}
                                onChange={(newValue) => onFilterChange('startDate', newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        variant: 'outlined'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <DatePicker
                                label={t('End Date')}
                                value={filters.endDate}
                                onChange={(newValue) => onFilterChange('endDate', newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        variant: 'outlined'
                                    }
                                }}
                            />
                        </Grid>
                    </>
                )}

                {/* Department Filter */}
                <Grid item xs={12} sm={6} md={filters.viewMode === 'table' || filters.viewMode === 'matrix' || filters.viewMode === 'analytics' ? 2 : 3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('Department')}</InputLabel>
                        <Select
                            value={filters.selectedDepartment}
                            onChange={(e) => onFilterChange('selectedDepartment', e.target.value)}
                            label={t('Department')}
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
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('Employee')}</InputLabel>
                        <Select
                            value={filters.selectedEmployee}
                            onChange={(e) => onFilterChange('selectedEmployee', e.target.value)}
                            label={t('Employee')}
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
                            sx={{
                                height: '40px',
                                backgroundColor: ATTENDANCE_COLORS.present,
                                '&:hover': {
                                    backgroundColor: ATTENDANCE_COLORS.present,
                                    opacity: 0.8
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
    const theme = useTheme();

    return (
        <Box sx={{ mt: 2 }}>
            <Paper sx={{
                height: 600,
                width: '100%',
                borderRadius: 1,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`
            }}>
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
                        },
                    }}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell:focus': { outline: 'none' },
                        '& .MuiDataGrid-row:hover': {
                            backgroundColor: 'action.hover'
                        }
                    }}
                />
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
        <Box sx={{ mt: 2 }}>
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
                        return (
                            <Chip
                                label={isCheckIn ? t('Check In') : t('Check Out')}
                                color={isCheckIn ? 'success' : 'warning'}
                                variant="outlined"
                                size="small"
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: ATTENDANCE_COLORS.present, fontSize: '0.75rem' }}>
                            {params.value?.[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight="500">{params.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{params.row.employee_id}</Typography>
                        </Box>
                    </Box>
                )
            },
            {
                field: 'check_in_date',
                headerName: t('Date'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => params.value ? format(parseISO(params.value), 'dd/MM/yyyy') : '-'
            },
            {
                field: 'check_in',
                headerName: t('Start'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => params.value ? format(parseISO(params.value), 'HH:mm') : '-'
            },
            {
                field: 'check_out',
                headerName: t('End'),
                width: 100,
                renderCell: (params: GridRenderCellParams) => params.value ? format(parseISO(params.value), 'HH:mm') : '-'
            },
            {
                field: 'break_hours',
                headerName: t('Break'),
                width: 100,
                valueFormatter: (params: any) => params.value ? `${params.value}h` : '-'
            },
            {
                field: 'actual_work',
                headerName: t('Work'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {params.row.actual_work < params.row.capacity && params.row.status !== 'ongoing' && (
                            <Box
                                sx={{
                                    fontSize: 14,
                                    color: ATTENDANCE_COLORS.earlyLeave,
                                    cursor: 'pointer'
                                }}
                                onClick={() => showAlert(`${t('Under Capacity')}: ${round(params.row.capacity - params.row.actual_work, 1)}h ${t('remaining')}`, t('Warning'), 'warning')}
                                title={`${t('Under Capacity')}: ${round(params.row.capacity - params.row.actual_work, 1)}h ${t('remaining')}`}
                            >
                                <Warning sx={{ fontSize: 14 }} />
                            </Box>
                        )}
                        <Typography variant="body2" fontWeight="500">{params.value}h</Typography>
                    </Box>
                )
            },
            {
                field: 'capacity',
                headerName: t('Capacity'),
                width: 100,
                valueFormatter: (params: any) => params.value ? `${params.value}h` : '8.0h'
            },
            {
                field: 'overtime',
                headerName: t('Overtime'),
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography variant="body2" color={params.value > 0 ? ATTENDANCE_COLORS.present : 'text.secondary'} sx={{ fontWeight: params.value > 0 ? '600' : 'normal' }}>
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
                        if (isMissingExit) return ATTENDANCE_COLORS.absent;
                        switch (status) {
                            case 'present': return ATTENDANCE_COLORS.present;
                            case 'late': return ATTENDANCE_COLORS.late;
                            case 'early_leave': return ATTENDANCE_COLORS.earlyLeave;
                            case 'holiday': return ATTENDANCE_COLORS.holiday;
                            case 'ongoing': return ATTENDANCE_COLORS.ongoing;
                            default: return ATTENDANCE_COLORS.absent;
                        }
                    };

                    if (isMissingExit) {
                        return (
                            <Chip
                                size="small"
                                label={t('Missing Exit')}
                                variant="filled"
                                sx={{
                                    backgroundColor: ATTENDANCE_COLORS.absent,
                                    color: 'white',
                                    fontWeight: 600
                                }}
                            />
                        );
                    }

                    if (status?.includes('&')) {
                        return (
                            <Stack direction="row" spacing={0.5}>
                                <Chip size="small" label={t('Late')} color="error" variant="outlined" />
                                <Chip size="small" label={t('Early')} color="warning" variant="outlined" />
                            </Stack>
                        );
                    }
                    return (
                        <Chip
                            size="small"
                            label={t(status || 'present')}
                            variant="filled"
                            sx={{
                                backgroundColor: getStatusColor(),
                                color: 'white',
                                fontWeight: 500
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
                p: 2, 
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
                <Box className="no-print" sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4" fontWeight="800" color="text.primary">
                            {t('Attendance Management')}
                        </Typography>
                        <SyncDevicesButton onSyncSuccess={handleRefresh} />
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <DeviceStatusWidget />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DigitalClock />
                        <AttendanceMoreActions onRefresh={handleRefresh} rows={rows} filters={filters} theme={theme} />
                    </Box>
                </Box>

                {/* Loading Indicator */}
                {(loading || summaryLoading) && (
                    <Box className="no-print" sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress />
                    </Box>
                )}

                {/* Summary Cards */}
                {!filters.rawView && (
                    <AttendanceSummaryCards summary={summary} theme={theme} onCardClick={handleCardClick} />
                )}

                {/* Detail Dialog */}
                <Dialog 
                    className="no-print"
                    open={detailDialog.open} 
                    onClose={() => setDetailDialog(prev => ({ ...prev, open: false }))}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="700">{detailDialog.title}</Typography>
                        <IconButton onClick={() => setDetailDialog(prev => ({ ...prev, open: false }))}>
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {detailDialog.data.length > 0 ? (
                            <List>
                                {detailDialog.data.map((item, idx) => (
                                    <ListItem key={idx} divider={idx < detailDialog.data.length - 1}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                                {item.employee_name?.[0]}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={item.employee_name}
                                            secondary={
                                                detailDialog.type === 'absent' 
                                                ? `${t('ID')}: ${item.employee_id} | ${t('Department')}: ${item.department || t('N/A')}`
                                                : `${t('ID')}: ${item.employee_id} | ${t('Check In')}: ${item.check_in ? format(parseISO(item.check_in), 'HH:mm') : '-'}`
                                            }
                                        />
                                        <Chip 
                                            label={t(item.status)} 
                                            size="small"
                                            sx={{ 
                                                bgcolor: item.status === 'absent' ? ATTENDANCE_COLORS.absent : (item.status === 'late' ? ATTENDANCE_COLORS.late : ATTENDANCE_COLORS.present),
                                                color: 'white'
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">{t('No data found for today.')}</Typography>
                            </Box>
                        )}
                    </DialogContent>
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
