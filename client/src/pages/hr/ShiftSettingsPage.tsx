import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Box, Typography, Grid2 as Grid, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, IconButton, Card, CardContent, Divider,
    Alert, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Checkbox,
    FormControlLabel, FormGroup, Stack, Avatar, List, ListItem, ListItemText, ListItemAvatar,
    alpha, useTheme, Tooltip, Badge, CircularProgress, Snackbar, FormHelperText, Fade
} from '@mui/material';
import {
    Add, Edit, Delete, Schedule, AssignmentInd, AccessTime,
    Info, RotateRight, Refresh, AutoFixHigh,
    AddCircle, RemoveCircle, DragIndicator, Close
} from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
    gradientError: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
    gradientInfo: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
};

const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
};

interface Shift {
    id?: number;
    name: string;
    description: string;
    shift_type: 'fixed' | 'rotational';
    start_time: string;
    end_time: string;
    expected_hours: number;
    grace_period_in: number;
    grace_period_out: number;
    ot_threshold: number;
    multiplier_normal: number;
    multiplier_holiday: number;
    holiday_days: string[];
    is_holiday_paid: boolean;
    min_days_for_paid_holiday: number;
    end_day_offset: number;
    temp_rotation_hours: number;
    temp_rotation_offset: number;
    distribute_holiday_bonus: boolean;
    rotation_pattern: { 
        sequence: any[]; 
        days: number;
        slots: Record<string, { start: string; end: string; hours: number }>;
    };
}

interface Employee {
    id: string;
    full_name: string;
    employee_id: string;
    department_name?: string;
    avatar_url?: string;
    position?: string;
    shift_assignments?: any[];
}

interface Assignment {
    employee_id: string;
    shift_id: string | number;
    start_date: string;
}

const ShiftSettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { confirm } = useConfirm();
    const isRtl = i18n.language === 'ar';
    const theme = useTheme();
    const [tab, setTab] = useState(0);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    const inputSx = useMemo(() => ({
        '& .MuiOutlinedInput-root': {
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'inherit',
            borderRadius: '8px',
            '& fieldset': {
                borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.divider, 0.45) : alpha(theme.palette.divider, 0.2),
            },
            '&:hover fieldset': {
                borderColor: COLORS.primary,
            },
            '&.Mui-focused fieldset': {
                borderColor: COLORS.primary,
            },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: COLORS.primary },
        '& .MuiInputBase-input::placeholder': {
            color: theme.palette.text.disabled,
            opacity: 1,
        }
    }), [theme]);

    // Shift Logic States
    const [openAddShift, setOpenAddShift] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
    const [newShift, setNewShift] = useState<Shift>({
        name: '',
        description: '',
        shift_type: 'fixed',
        start_time: '08:00',
        end_time: '17:00',
        expected_hours: 8,
        grace_period_in: 15,
        grace_period_out: 15,
        ot_threshold: 30,
        multiplier_normal: 1.5,
        multiplier_holiday: 2.0,
        holiday_days: ['Friday'],
        is_holiday_paid: true,
        min_days_for_paid_holiday: 4,
        end_day_offset: 0,
        temp_rotation_hours: 8,
        temp_rotation_offset: 0,
        distribute_holiday_bonus: false,
        rotation_pattern: { 
            sequence: [], 
            days: 0,
            slots: {
                A: { start: '08:00', end: '16:00', hours: 8 },
                B: { start: '16:00', end: '00:00', hours: 8 },
                C: { start: '00:00', end: '08:00', hours: 8 }
            }
        }
    });

    // Assignment States
    const [openAssign, setOpenAssign] = useState(false);
    const [newAssignment, setNewAssignment] = useState<Assignment>({
        employee_id: '',
        shift_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd')
    });

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [shiftsRes, empRes] = await Promise.all([
                api.get('hr/shifts'),
                api.get('hr/employees')
            ]);
            
            // Handle shifts data
            const shiftsData = Array.isArray(shiftsRes.data) ? shiftsRes.data : [];
            setShifts(shiftsData);
            
            // Handle employees data - ensure we get the employees array
            const employeesData = Array.isArray(empRes.data) ? empRes.data : 
                                 (empRes.data?.employees || empRes.data?.data || []);
            
            console.log('Shifts data:', shiftsData.length, 'items');
            console.log('Employees data:', employeesData.length, 'items');
            console.log('Sample employee:', employeesData[0]);
            
            setEmployees(employeesData);
        } catch (error: unknown) {
            console.error('Error fetching data:', error);
            const errorMessage = (error as any).response?.data?.detail || (error as Error).message || t('Failed to load data');
            setFeedback({ type: 'error', msg: errorMessage });
            setSnackbarOpen(true);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [t]);

    // Validation functions
    const validateShift = (shift: Shift): {[key: string]: string} => {
        const errors: {[key: string]: string} = {};
        
        if (!shift.name?.trim()) {
            errors.name = t('Shift name is required');
        }
        
        if (!shift.start_time) {
            errors.start_time = t('Start time is required');
        }
        
        if (!shift.end_time) {
            errors.end_time = t('End time is required');
        }
        
        if (shift.start_time && shift.end_time && shift.start_time >= shift.end_time && (!shift.end_day_offset || shift.end_day_offset === 0)) {
            errors.time_range = t('End time must be after start time for same-day shifts');
        }
        
        if (!shift.expected_hours || shift.expected_hours <= 0) {
            errors.expected_hours = t('Expected hours must be greater than 0');
        }
        
        return errors;
    };

    const validateAssignment = (assignment: Assignment): {[key: string]: string} => {
        const errors: {[key: string]: string} = {};
        
        if (!assignment.employee_id) {
            errors.employee_id = t('Employee is required');
        }
        
        if (!assignment.shift_id) {
            errors.shift_id = t('Shift policy is required');
        }
        
        if (!assignment.start_date) {
            errors.start_date = t('Effective date is required');
        }
        
        return errors;
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateShift = async () => {
        setSubmitting(true);
        setValidationErrors({});
        
        try {
            // Validate form
            const errors = validateShift(newShift);
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                return;
            }
            
            if (editingShiftId) {
                await api.put(`hr/shifts/${editingShiftId}`, newShift);
                setFeedback({ type: 'success', msg: t('Shift policy updated successfully') });
            } else {
                await api.post('hr/shifts', newShift);
                setFeedback({ type: 'success', msg: t('Shift policy created successfully') });
            }
            
            setSnackbarOpen(true);
            handleCloseShiftDialog();
            fetchData(false); // Refresh data without showing loading
        } catch (error: any) {
            console.error('Error saving shift:', error);
            const errorMessage = error.response?.data?.detail || error.message || t('Failed to save shift policy');
            setFeedback({ type: 'error', msg: errorMessage });
            setSnackbarOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteShift = async (id: number) => {
        if (!await confirm({ message: t('Are you sure you want to delete this policy?') })) return;
        setSubmitting(true);
        try {
            await api.delete(`hr/shifts/${id}`);
            setFeedback({ type: 'success', msg: t('Shift policy deleted successfully') });
            setSnackbarOpen(true);
            fetchData(false); // Refresh data without showing loading
        } catch (error: any) {
            console.error('Error deleting shift:', error);
            const errorMessage = error.response?.data?.detail || error.message || t('Failed to delete shift policy');
            setFeedback({ type: 'error', msg: errorMessage });
            setSnackbarOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditShift = (shift: any) => {
        setNewShift({
            ...shift,
            end_day_offset: shift.end_day_offset,
            rotation_pattern: shift.rotation_pattern || { sequence: [], days: 0 }
        });
        setEditingShiftId(shift.id);
        setOpenAddShift(true);
    };

    const handleCloseShiftDialog = () => {
        setOpenAddShift(false);
        setEditingShiftId(null);
        setValidationErrors({});
        setNewShift({
            name: '',
            description: '',
            shift_type: 'fixed',
            start_time: '08:00',
            end_time: '17:00',
            expected_hours: 8,
        grace_period_in: 15,
        grace_period_out: 15,
        ot_threshold: 30,
        multiplier_normal: 1.5,
        multiplier_holiday: 2.0,
        holiday_days: ['Friday'],
        is_holiday_paid: true,
        min_days_for_paid_holiday: 4,
        end_day_offset: 0,
        temp_rotation_hours: 8,
        temp_rotation_offset: 0,
        distribute_holiday_bonus: false,
        rotation_pattern: { 
            sequence: [], 
            days: 0,
            slots: {
                A: { start: '08:00', end: '16:00', hours: 8 },
                B: { start: '16:00', end: '00:00', hours: 8 },
                C: { start: '00:00', end: '08:00', hours: 8 }
            }
        }
    });
    };

    const handleAssignShift = async () => {
        setSubmitting(true);
        setValidationErrors({});
        
        try {
            // Validate form
            const errors = validateAssignment(newAssignment);
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                return;
            }
            
            await api.post('hr/employees/assign-shift', newAssignment);
            setFeedback({ type: 'success', msg: t('Shift assigned successfully') });
            setSnackbarOpen(true);
            setOpenAssign(false);
            fetchData(false); // Refresh data without showing loading
        } catch (error: any) {
            console.error('Error assigning shift:', error);
            const errorMessage = error.response?.data?.detail || error.message || t('Failed to assign shift');
            setFeedback({ type: 'error', msg: errorMessage });
            setSnackbarOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseAssignDialog = () => {
        setOpenAssign(false);
        setValidationErrors({});
        setNewAssignment({
            employee_id: '',
            shift_id: '',
            start_date: format(new Date(), 'yyyy-MM-dd')
        });
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <Box sx={{ p: 3, boxSizing: 'border-box', width: '100%', bgcolor: COLORS.bg, minHeight: '100vh' }}>
            <Box sx={{ 
                mb: 4, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ color: COLORS.dark }}>
                        {t('Shift Management')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: COLORS.secondary }}>{t('Define work schedules, grace periods, and overtime rules')}</Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Add />}
                        onClick={() => setOpenAddShift(true)}
                        sx={{ 
                            borderRadius: '8px', 
                            px: 3,
                            background: COLORS.gradientPrimary,
                            boxShadow: SHADOWS.sm,
                            '&:hover': {
                                boxShadow: SHADOWS.md,
                                transform: 'translateY(-1px)'
                            },
                            textTransform: 'none',
                            fontWeight: '600'
                        }}
                        disabled={submitting}
                    >
                        {t('New Policy')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AssignmentInd />}
                        onClick={() => setOpenAssign(true)}
                        sx={{ 
                            borderRadius: '8px', 
                            px: 3,
                            bgcolor: COLORS.white,
                            color: COLORS.dark,
                            boxShadow: SHADOWS.sm,
                            '&:hover': {
                                bgcolor: COLORS.light,
                                boxShadow: SHADOWS.md,
                                transform: 'translateY(-1px)'
                            },
                            textTransform: 'none',
                            fontWeight: '600',
                            border: 'none'
                        }}
                    >
                        {t('Assign to Employee')}
                    </Button>
                    <Button
                        variant="text"
                        startIcon={<Refresh />}
                        onClick={() => fetchData()}
                        sx={{ 
                            borderRadius: '8px', 
                            px: 2,
                            color: COLORS.secondary,
                            '&:hover': {
                                bgcolor: alpha(COLORS.secondary, 0.1)
                            },
                            textTransform: 'none'
                        }}
                        disabled={loading}
                    >
                        {t('Refresh')}
                    </Button>
                </Stack>
            </Box>

            {feedback && (
                <Fade in={!!feedback}>
                    <Alert 
                        severity={feedback.type} 
                        sx={{ 
                            mb: 3, 
                            borderRadius: '12px',
                            boxShadow: SHADOWS.sm,
                            border: 'none',
                            '& .MuiAlert-icon': {
                                color: feedback.type === 'success' ? COLORS.success : COLORS.error
                            }
                        }} 
                        onClose={() => {setFeedback(null); setSnackbarOpen(false);}}
                    >
                        {feedback.msg}
                    </Alert>
                </Fade>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                    value={tab} 
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                            bgcolor: COLORS.primary
                        },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            minWidth: 120,
                            color: COLORS.secondary,
                            '&.Mui-selected': {
                                color: COLORS.primary
                            }
                        }
                    }}
                >
                    <Tab icon={<Schedule sx={{ fontSize: 20 }} />} iconPosition="start" label={t('Shift Policies')} />
                    <Tab icon={<AssignmentInd sx={{ fontSize: 20 }} />} iconPosition="start" label={t('Active Assignments')} />
                </Tabs>
            </Box>

            {tab === 0 && (
                <Grid container spacing={3}>
                    {loading ? (
                        <Grid size={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress sx={{ color: COLORS.primary }} />
                            </Box>
                        </Grid>
                    ) : (
                        shifts.map((shift) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={shift.id}>
                                <Card sx={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    bgcolor: COLORS.white,
                                    boxShadow: SHADOWS.md,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'visible',
                                    '&:hover': {
                                        boxShadow: SHADOWS.lg,
                                        transform: 'translateY(-5px)'
                                    }
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="700" sx={{ color: COLORS.dark }}>{shift.name}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={t(shift.shift_type)}
                                                    sx={{ 
                                                        mt: 0.5, 
                                                        fontWeight: '700',
                                                        bgcolor: shift.shift_type === 'rotational' ? alpha(COLORS.info, 0.1) : alpha(COLORS.primary, 0.1),
                                                        color: shift.shift_type === 'rotational' ? COLORS.info : COLORS.primary,
                                                        borderRadius: '6px'
                                                    }}
                                                />
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title={t('Edit')}>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditShift(shift)} 
                                                        disabled={submitting}
                                                        sx={{ 
                                                            bgcolor: alpha(COLORS.info, 0.1), 
                                                            color: COLORS.info,
                                                            '&:hover': { bgcolor: alpha(COLORS.info, 0.2) }
                                                        }}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('Delete')}>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => shift.id && handleDeleteShift(shift.id)} 
                                                        disabled={submitting}
                                                        sx={{ 
                                                            bgcolor: alpha(COLORS.error, 0.1), 
                                                            color: COLORS.error,
                                                            '&:hover': { bgcolor: alpha(COLORS.error, 0.2) }
                                                        }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Box>

                                        <Divider sx={{ mb: 2, opacity: 0.6 }} />

                                        <Grid container spacing={2}>
                                            <Grid size={6}>
                                                <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: '600' }}>{t('Schedule')}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: '700', color: COLORS.dark }}>
                                                    {shift.start_time} - {shift.end_time}
                                                </Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: '600' }}>{t('Expected Hours')}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: '700', color: COLORS.dark }}>{shift.expected_hours}h</Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: '600' }}>{t('Grace In/Out')}</Typography>
                                                <Typography variant="body2" sx={{ color: COLORS.dark }}>{shift.grace_period_in} / {shift.grace_period_out}m</Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: '600' }}>{t('OT Multiplier')}</Typography>
                                                <Typography variant="body2" sx={{ color: COLORS.success, fontWeight: '700' }}>x{shift.multiplier_normal}</Typography>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ 
                                            mt: 2, 
                                            p: 1.5, 
                                            bgcolor: COLORS.bg, 
                                            borderRadius: '12px', 
                                            border: `1px solid ${alpha(COLORS.secondary, 0.1)}` 
                                        }}>
                                            <Typography variant="caption" sx={{ color: COLORS.secondary, display: 'block', mb: 1, fontWeight: '700' }}>
                                                {shift.shift_type === 'rotational' ? t('Rotation Sequence') : t('Holidays')}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                                {shift.shift_type === 'rotational' ? (
                                                    (shift.rotation_pattern?.sequence || []).map((step: any, i: number) => {
                                                        const label = typeof step === 'string' ? step : step.label;
                                                        return <Chip key={i} label={label} size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.65rem', height: 20 }} />;
                                                    })
                                                ) : (
                                                    shift.holiday_days?.map((day: string) => (
                                                        <Chip key={day} label={day} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                                                    ))
                                                )}
                                            </Stack>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    )}
                    {shifts.length === 0 && !loading && (
                        <Grid size={12}>
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography color="text.secondary" gutterBottom>{t('No shift policies defined yet')}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('Create your first shift policy to get started')}</Typography>
                                <Button variant="contained" onClick={() => setOpenAddShift(true)} startIcon={<Add />}>
                                    {t('Create First Policy')}
                                </Button>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            )}
            {tab === 1 && (
                <Card sx={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    bgcolor: COLORS.white,
                    boxShadow: SHADOWS.md
                }} elevation={0}>
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ 
                            p: 3, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}` 
                        }}>
                            <Typography variant="h6" fontWeight="700" sx={{ color: COLORS.dark }}>
                                {t('Active Assignments')}
                            </Typography>
                            <Button 
                                startIcon={<AssignmentInd />} 
                                size="small" 
                                variant="contained" 
                                onClick={() => setOpenAssign(true)} 
                                sx={{ 
                                    borderRadius: '8px',
                                    background: COLORS.gradientPrimary,
                                    boxShadow: SHADOWS.sm,
                                    '&:hover': {
                                        boxShadow: SHADOWS.md,
                                        transform: 'translateY(-1px)'
                                    },
                                    textTransform: 'none',
                                    fontWeight: '600'
                                }}
                            >
                                {t('New Assignment')}
                            </Button>
                        </Box>
                        <List sx={{ width: '100%', p: 0 }}>
                            {loading ? (
                                <Box sx={{ textAlign: 'center', py: 12 }}>
                                    <CircularProgress sx={{ color: COLORS.primary }} />
                                    <Typography sx={{ mt: 2, color: COLORS.secondary }}>{t('Loading assignments...')}</Typography>
                                </Box>
                            ) : (
                                employees
                                    .filter(e => !!e.shift_assignments && e.shift_assignments.length > 0)
                                    .map((emp) => {
                                        const activeAssignment = emp.shift_assignments!.find((a: any) => !a.end_date) || emp.shift_assignments![emp.shift_assignments!.length - 1];
                                        return (
                                            <React.Fragment key={emp.id}>
                                                <ListItem alignItems="flex-start" sx={{
                                                    px: 3,
                                                    py: 3,
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { bgcolor: alpha(COLORS.bg, 0.5) }
                                                }}>
                                                    <ListItemAvatar sx={{ mr: 2 }}>
                                                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: isRtl ? 'left' : 'right' }} variant="dot" color="success">
                                                            <Avatar sx={{ 
                                                                bgcolor: alpha(COLORS.primary, 0.1), 
                                                                color: COLORS.primary,
                                                                width: 48, 
                                                                height: 48,
                                                                fontWeight: '700',
                                                                fontSize: '1rem',
                                                                border: `2px solid ${alpha(COLORS.primary, 0.2)}`
                                                            }}>{emp.full_name?.[0] || 'U'}</Avatar>
                                                        </Badge>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                                                <Typography fontWeight="700" variant="subtitle1" sx={{ color: COLORS.dark }}>{emp.full_name || 'Unknown'}</Typography>
                                                                <Chip 
                                                                    label={emp.employee_id || 'N/A'} 
                                                                    size="small" 
                                                                    sx={{ 
                                                                        height: 20, 
                                                                        fontSize: '0.7rem', 
                                                                        bgcolor: COLORS.bg,
                                                                        color: COLORS.secondary,
                                                                        fontWeight: '700',
                                                                        borderRadius: '4px'
                                                                    }} 
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Stack direction="row" spacing={4} sx={{ mt: 1.5 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Schedule sx={{ fontSize: 18, color: COLORS.primary }} />
                                                                    <Typography variant="body2" sx={{ fontWeight: '700', color: COLORS.dark }}>
                                                                        {activeAssignment?.shift?.name || t('No Shift Assigned')}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <AccessTime sx={{ fontSize: 18, color: COLORS.secondary }} />
                                                                    <Typography variant="body2" sx={{ color: COLORS.secondary }}>
                                                                        {t('From')}: {activeAssignment?.start_date ? format(new Date(activeAssignment.start_date), 'MMM d, yyyy', { locale: isRtl ? ar : enUS }) : '--'}
                                                                    </Typography>
                                                                </Box>
                                                                {activeAssignment?.shift?.shift_type === 'rotational' && (
                                                                    <Chip 
                                                                        size="small" 
                                                                        label={t('Rotational')} 
                                                                        sx={{ 
                                                                            height: 22, 
                                                                            fontSize: '0.7rem', 
                                                                            fontWeight: '700',
                                                                            bgcolor: alpha(COLORS.info, 0.1),
                                                                            color: COLORS.info,
                                                                            borderRadius: '6px'
                                                                        }} 
                                                                    />
                                                                )}
                                                            </Stack>
                                                        }
                                                    />
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <Tooltip title={t('History')}>
                                                            <IconButton sx={{ color: COLORS.secondary, '&:hover': { bgcolor: alpha(COLORS.secondary, 0.1) } }}>
                                                                <Info fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            sx={{ 
                                                                borderRadius: '8px', 
                                                                textTransform: 'none', 
                                                                fontWeight: '700',
                                                                bgcolor: COLORS.white,
                                                                color: COLORS.primary,
                                                                border: `1px solid ${alpha(COLORS.primary, 0.3)}`,
                                                                boxShadow: 'none',
                                                                '&:hover': {
                                                                    bgcolor: alpha(COLORS.primary, 0.05),
                                                                    boxShadow: 'none',
                                                                    border: `1px solid ${COLORS.primary}`
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                setNewAssignment({ ...newAssignment, employee_id: emp.id });
                                                                setOpenAssign(true);
                                                            }}
                                                        >
                                                            {t('Change')}
                                                        </Button>
                                                    </Stack>
                                                </ListItem>
                                                <Divider variant="inset" component="li" sx={{ borderColor: alpha(COLORS.secondary, 0.05), ml: 10 }} />
                                            </React.Fragment>
                                        );
                                    })
                            )}
                            {!loading && employees.filter(e => !!e.shift_assignments && e.shift_assignments.length > 0).length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 12 }}>
                                    <Box sx={{ 
                                        width: 80, 
                                        height: 80, 
                                        bgcolor: alpha(COLORS.secondary, 0.1), 
                                        borderRadius: '50%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        margin: '0 auto 24px'
                                    }}>
                                        <AssignmentInd sx={{ fontSize: 40, color: COLORS.secondary }} />
                                    </Box>
                                    <Typography variant="h6" sx={{ color: COLORS.dark, fontWeight: '700', mb: 1 }}>{t('No active shift assignments found')}</Typography>
                                    <Typography variant="body2" sx={{ color: COLORS.secondary, mb: 4, maxWidth: 400, margin: '0 auto 32px' }}>{t('Create a shift policy and assign it to employees to get started')}</Typography>
                                    <Stack direction="row" spacing={2} justifyContent="center">
                                        <Button 
                                            variant="contained" 
                                            onClick={() => setOpenAddShift(true)} 
                                            startIcon={<Add />}
                                            sx={{ 
                                                borderRadius: '8px',
                                                background: COLORS.gradientPrimary,
                                                boxShadow: SHADOWS.sm,
                                                fontWeight: '600'
                                            }}
                                        >
                                            {t('Create Shift Policy')}
                                        </Button>
                                        <Button 
                                            variant="contained" 
                                            onClick={() => setOpenAssign(true)} 
                                            startIcon={<AssignmentInd />}
                                            sx={{ 
                                                borderRadius: '8px',
                                                bgcolor: COLORS.white,
                                                color: COLORS.dark,
                                                boxShadow: SHADOWS.sm,
                                                fontWeight: '600'
                                            }}
                                        >
                                            {t('Assign to Employee')}
                                        </Button>
                                    </Stack>
                                </Box>
                            )}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Add/Edit Shift Dialog */}
            <Dialog 
                open={openAddShift} 
                onClose={handleCloseShiftDialog} 
                maxWidth="md" 
                fullWidth 
                slotProps={{ 
                    paper: { 
                        sx: { 
                            borderRadius: '16px', 
                            p: 1,
                            boxShadow: SHADOWS.lg,
                            bgcolor: COLORS.white
                        } 
                    } 
                }}
            >
                <DialogTitle sx={{ 
                    fontWeight: '700', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 1,
                    color: COLORS.dark,
                    pb: 1
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '10px', 
                            background: COLORS.gradientPrimary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: COLORS.white,
                            boxShadow: SHADOWS.sm
                        }}>
                            <RotateRight />
                        </Box>
                        {editingShiftId ? t('Edit Shift Policy') : t('Create Shift Policy')}
                    </Box>
                    <IconButton onClick={handleCloseShiftDialog} size="small" sx={{ color: COLORS.secondary }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField 
                                label={t('Policy Name')} 
                                fullWidth 
                                value={newShift.name || ''} 
                                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} 
                                placeholder={t('examples.shiftName')}
                                error={!!validationErrors.name}
                                helperText={validationErrors.name}
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ '&.Mui-focused': { color: COLORS.primary } }}>{t('Shift Type')}</InputLabel>
                                <Select 
                                    value={newShift.shift_type || 'fixed'} 
                                    label={t('Shift Type')} 
                                    onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value as 'fixed' | 'rotational' })}
                                    sx={{ 
                                        borderRadius: '8px',
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                    }}
                                >
                                    <MenuItem value="fixed">{t('Fixed')}</MenuItem>
                                    <MenuItem value="rotational">{t('Rotational (Cycles)')}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField 
                                label={t('Start Time')} 
                                type="time" 
                                fullWidth 
                                value={newShift.start_time || ''} 
                                onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })} 
                                slotProps={{ inputLabel: { shrink: true } }}
                                error={!!validationErrors.start_time}
                                helperText={validationErrors.start_time}
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField 
                                label={t('End Time')} 
                                type="time" 
                                fullWidth 
                                value={newShift.end_time || ''} 
                                onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })} 
                                slotProps={{ inputLabel: { shrink: true } }}
                                error={!!validationErrors.end_time}
                                helperText={validationErrors.end_time}
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField 
                                label={t('Expected Work Hours')} 
                                type="number" 
                                fullWidth 
                                value={newShift.expected_hours || 0} 
                                onChange={(e) => setNewShift({ ...newShift, expected_hours: Number(e.target.value) })}
                                error={!!validationErrors.expected_hours}
                                helperText={validationErrors.expected_hours}
                                sx={inputSx}
                            />
                        </Grid>

                        <Grid size={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ '&.Mui-focused': { color: COLORS.primary } }}>{t('Shift Ends On')}</InputLabel>
                                <Select
                                    value={newShift.end_day_offset || 0}
                                    label={t('Shift Ends On')}
                                    onChange={(e) => setNewShift({ ...newShift, end_day_offset: Number(e.target.value) })}
                                    sx={{ 
                                        borderRadius: '8px',
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                    }}
                                >
                                    <MenuItem value={0}>{t('Same Day')}</MenuItem>
                                    <MenuItem value={1}>{t('Next Day')}</MenuItem>
                                    <MenuItem value={2}>{t('After 2 Days')}</MenuItem>
                                </Select>
                                <FormHelperText sx={{ color: COLORS.secondary }}>
                                    {t('Select if the shift spans across multiple days (e.g., 16h or 48h shifts)')}
                                </FormHelperText>
                            </FormControl>
                        </Grid>

                        {validationErrors.time_range && (
                            <Grid size={12}>
                                <Alert severity="error" sx={{ borderRadius: '8px' }}>{validationErrors.time_range}</Alert>
                            </Grid>
                        )}

                        <Grid size={12}>
                            <Divider sx={{ my: 1 }}>
                                <Chip 
                                    label={t('Policy Rules')} 
                                    size="small" 
                                    sx={{ 
                                        fontWeight: '700', 
                                        bgcolor: alpha(COLORS.primary, 0.1), 
                                        color: COLORS.primary 
                                    }} 
                                />
                            </Divider>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('Grace In (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_in || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_in: Number(e.target.value) })} 
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('Grace Out (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_out || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_out: Number(e.target.value) })} 
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('OT Threshold (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.ot_threshold || 0} 
                                onChange={(e) => setNewShift({ ...newShift, ot_threshold: Number(e.target.value) })} 
                                sx={inputSx}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('Normal OT Multiplier')} 
                                type="number" 
                                fullWidth 
                                value={newShift.multiplier_normal || 1.5} 
                                onChange={(e) => setNewShift({ ...newShift, multiplier_normal: Number(e.target.value) })} 
                                slotProps={{ htmlInput: { step: 0.1 } }} 
                                sx={inputSx}
                            />
                        </Grid>

                        <Grid size={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: '700', color: COLORS.dark }}>{t('Weekly Holidays & Eligibility')}</Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={newShift.is_holiday_paid ?? true} 
                                            onChange={(e) => setNewShift({ ...newShift, is_holiday_paid: e.target.checked })}
                                            sx={{ 
                                                color: COLORS.primary,
                                                '&.Mui-checked': { color: COLORS.primary }
                                            }}
                                        />
                                    }
                                    label={<Typography variant="body2" sx={{ fontWeight: '600', color: COLORS.dark }}>{t('Holidays are Paid')}</Typography>}
                                />
                            </Box>
                            
                            {newShift.is_holiday_paid && (
                                <Box sx={{ 
                                    mb: 2.5, 
                                    p: 2, 
                                    bgcolor: alpha(COLORS.primary, 0.04), 
                                    borderRadius: '12px', 
                                    border: `1px dashed ${alpha(COLORS.primary, 0.3)}` 
                                }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <Typography variant="body2" sx={{ color: COLORS.secondary }}>
                                                {t('Minimum working days required in the last 7 days to qualify for a paid holiday')}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                label={t('Minimum Work Units')}
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={newShift.min_days_for_paid_holiday ?? 4}
                                                onChange={(e) => setNewShift({ ...newShift, min_days_for_paid_holiday: Number(e.target.value) })}
                                                slotProps={{ htmlInput: { min: 0, max: 21 } }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: COLORS.white } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            <FormGroup row sx={{ gap: 1 }}>
                                {daysOfWeek.map(day => (
                                    <FormControlLabel
                                        key={day}
                                        control={
                                            <Checkbox
                                                checked={newShift.holiday_days?.includes(day)}
                                                onChange={(e) => {
                                                    const days = e.target.checked
                                                        ? [...(newShift.holiday_days || []), day]
                                                        : (newShift.holiday_days || []).filter((d: string) => d !== day);
                                                    setNewShift({ ...newShift, holiday_days: days });
                                                }}
                                                sx={{ 
                                                    color: COLORS.secondary,
                                                    '&.Mui-checked': { color: COLORS.primary }
                                                }}
                                            />
                                        }
                                        label={<Typography variant="body2" sx={{ color: COLORS.dark }}>{t(day)}</Typography>}
                                    />
                                ))}
                            </FormGroup>
                        </Grid>

                        {newShift.shift_type === 'rotational' && (
                            <Grid size={12}>
                                <Divider sx={{ mb: 3 }}>
                                    <Chip 
                                        label={t('Rotational Shift Designer (A/B/C)')} 
                                        size="small" 
                                        sx={{ 
                                            bgcolor: COLORS.primary, 
                                            color: COLORS.white,
                                            fontWeight: 'bold',
                                            px: 1
                                        }} 
                                    />
                                </Divider>
                                <Box sx={{ 
                                    p: 2.5, 
                                    border: `1px solid ${alpha(COLORS.secondary, 0.2)}`, 
                                    borderRadius: '16px', 
                                    bgcolor: alpha(COLORS.secondary, 0.02) 
                                }}>
                                    
                                    {/* Slot Definitions */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: '700', color: COLORS.dark }}>
                                            {t('1. Define Time Slots')}
                                        </Typography>
                                        <Button 
                                            size="small" 
                                            variant="contained"
                                            startIcon={<AddCircle />} 
                                            onClick={() => {
                                                const slots = { ...newShift.rotation_pattern?.slots || {} };
                                                const nextKey = String.fromCharCode(65 + Object.keys(slots).length); // A, B, C...
                                                slots[nextKey] = { start: '08:00', end: '16:00', hours: 8 };
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                            }}
                                            sx={{
                                                bgcolor: COLORS.primary,
                                                borderRadius: '8px',
                                                textTransform: 'none',
                                                boxShadow: SHADOWS.xs,
                                                '&:hover': { bgcolor: COLORS.primary, boxShadow: SHADOWS.sm }
                                            }}
                                        >
                                            {t('Add Slot')}
                                        </Button>
                                    </Box>
                                    <Grid container spacing={2} sx={{ mb: 4 }}>
                                        {Object.entries(newShift.rotation_pattern?.slots || {}).map(([slot, data]: [string, any]) => (
                                            <Grid size={{ xs: 12, md: 4 }} key={slot}>
                                                <Paper variant="outlined" sx={{ 
                                                    p: 2, 
                                                    borderRadius: '12px', 
                                                    position: 'relative',
                                                    borderColor: alpha(COLORS.secondary, 0.2),
                                                    bgcolor: COLORS.white,
                                                    transition: 'all 0.2s',
                                                    '&:hover': { borderColor: COLORS.primary, boxShadow: SHADOWS.xs }
                                                }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' }}>
                                                            {t('Slot')} {slot}
                                                        </Typography>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => {
                                                                const slots = { ...newShift.rotation_pattern.slots };
                                                                delete slots[slot];
                                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                                            }}
                                                            sx={{ color: COLORS.error }}
                                                        >
                                                            <RemoveCircle sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Box>
                                                    <Stack direction="row" spacing={1.5}>
                                                        <TextField
                                                            size="small"
                                                            label={t('Start')}
                                                            type="time"
                                                            value={data.start || '08:00'}
                                                            onChange={(e) => {
                                                                const slots = { ...newShift.rotation_pattern.slots };
                                                                slots[slot] = { ...slots[slot], start: e.target.value };
                                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                                            }}
                                                            slotProps={{ inputLabel: { shrink: true } }}
                                                            sx={{ 
                                                                '& .MuiOutlinedInput-root': { 
                                                                    borderRadius: '8px',
                                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                                                },
                                                                '& .MuiInputLabel-root.Mui-focused': { color: COLORS.primary }
                                                            }}
                                                        />
                                                        <TextField
                                                            size="small"
                                                            label={t('End')}
                                                            type="time"
                                                            value={data.end || '16:00'}
                                                            onChange={(e) => {
                                                                const slots = { ...newShift.rotation_pattern.slots };
                                                                slots[slot] = { ...slots[slot], end: e.target.value };
                                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                                            }}
                                                            slotProps={{ inputLabel: { shrink: true } }}
                                                            sx={{ 
                                                                '& .MuiOutlinedInput-root': { 
                                                                    borderRadius: '8px',
                                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                                                },
                                                                '& .MuiInputLabel-root.Mui-focused': { color: COLORS.primary }
                                                            }}
                                                        />
                                                    </Stack>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    {/* Sequence Builder */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: '700', color: COLORS.dark }}>
                                            {t('2. Build Sequence')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button 
                                                variant="text" 
                                                size="small" 
                                                startIcon={<AutoFixHigh fontSize="small" />}
                                                onClick={() => {
                                                    setNewShift({
                                                        ...newShift,
                                                        name: t('ABC Rotation (8-16-OFF)'),
                                                        distribute_holiday_bonus: true,
                                                        rotation_pattern: {
                                                            ...newShift.rotation_pattern,
                                                            sequence: [
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'B+C', slots: ['B', 'C'], hours: 16, offset: 1 },
                                                                'OFF'
                                                            ]
                                                        }
                                                    });
                                                }}
                                                sx={{ color: COLORS.primary, fontWeight: '600', textTransform: 'none' }}
                                            >
                                                {t('Template: 8-16-OFF')}
                                            </Button>
                                            <Button 
                                                variant="text" 
                                                size="small" 
                                                startIcon={<AutoFixHigh fontSize="small" />}
                                                onClick={() => {
                                                    setNewShift({
                                                        ...newShift,
                                                        name: t('Standard 48h Week'),
                                                        min_days_for_paid_holiday: 6,
                                                        holiday_days: ['Friday'],
                                                        rotation_pattern: {
                                                            ...newShift.rotation_pattern,
                                                            sequence: [
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                { label: 'A', slots: ['A'], hours: 8, offset: 0 },
                                                                'OFF'
                                                            ]
                                                        }
                                                    });
                                                }}
                                                sx={{ color: COLORS.primary, fontWeight: '600', textTransform: 'none' }}
                                            >
                                                {t('Template: 48h/6-Days')}
                                            </Button>
                                        </Box>
                                    </Stack>
                                    <Typography variant="caption" sx={{ color: COLORS.secondary, mb: 2.5, display: 'block', fontStyle: 'italic' }}>
                                        {t('The sequence will repeat automatically after the last day.')}
                                    </Typography>
                                    
                                    <Stack direction="row" spacing={1.5} sx={{ mb: 4 }}>
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            startIcon={<AddCircle />}
                                            onClick={() => {
                                                const seq = [...(newShift.rotation_pattern?.sequence || []), { label: '', slots: [], hours: 0, offset: 0 }];
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                            }}
                                            sx={{ 
                                                color: COLORS.primary, 
                                                borderColor: COLORS.primary,
                                                borderRadius: '8px',
                                                '&:hover': { borderColor: COLORS.primary, bgcolor: alpha(COLORS.primary, 0.04) }
                                            }}
                                        >
                                            {t('Add Work Day')}
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            startIcon={<RemoveCircle />}
                                            onClick={() => {
                                                const seq = [...(newShift.rotation_pattern?.sequence || []), 'OFF'];
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                            }}
                                            sx={{ 
                                                color: COLORS.error, 
                                                borderColor: COLORS.error,
                                                borderRadius: '8px',
                                                '&:hover': { borderColor: COLORS.error, bgcolor: alpha(COLORS.error, 0.04) }
                                            }}
                                        >
                                            {t('Add OFF Day')}
                                        </Button>
                                        <Button 
                                            variant="text" 
                                            size="small"
                                            onClick={() => {
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: [] } });
                                            }}
                                            sx={{ color: COLORS.secondary, textTransform: 'none' }}
                                        >
                                            {t('Clear')}
                                        </Button>
                                    </Stack>

                                    {/* Sequence Display */}
                                    <Box sx={{ 
                                        minHeight: 120, 
                                        p: 2.5, 
                                        bgcolor: alpha(COLORS.white, 0.5), 
                                        borderRadius: '16px', 
                                        border: `2px dashed ${alpha(COLORS.secondary, 0.2)}` 
                                    }}>
                                        <Stack spacing={2}>
                                            {(newShift.rotation_pattern?.sequence || []).map((step: any, i: number) => {
                                                const isOff = typeof step === 'string' && step === 'OFF';
                                                return (
                                                    <Paper 
                                                        key={i} 
                                                        variant="outlined" 
                                                        sx={{ 
                                                            p: 2, 
                                                            borderRadius: '12px', 
                                                            bgcolor: isOff ? alpha(COLORS.error, 0.02) : COLORS.white,
                                                            borderColor: isOff ? alpha(COLORS.error, 0.2) : alpha(COLORS.secondary, 0.2),
                                                            position: 'relative',
                                                            boxShadow: SHADOWS.xs,
                                                            transition: 'all 0.2s',
                                                            '&:hover': { borderColor: COLORS.primary }
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <DragIndicator sx={{ color: COLORS.secondary, cursor: 'grab', opacity: 0.5 }} />
                                                                <Typography variant="subtitle2" sx={{ fontWeight: '700', color: COLORS.dark }}>
                                                                    {t('Day')} {i + 1}
                                                                </Typography>
                                                            </Box>
                                                            {isOff ? (
                                                                <Chip 
                                                                    label={t('OFF')} 
                                                                    size="small" 
                                                                    sx={{ 
                                                                        bgcolor: alpha(COLORS.error, 0.1), 
                                                                        color: COLORS.error, 
                                                                        fontWeight: 'bold',
                                                                        borderRadius: '6px',
                                                                        border: 'none'
                                                                    }} 
                                                                />
                                                            ) : (
                                                                <Stack direction="row" spacing={1}>
                                                                    {Object.keys(newShift.rotation_pattern?.slots || {}).map(slotKey => {
                                                                        const isSelected = step.slots?.includes(slotKey);
                                                                        return (
                                                                            <Chip
                                                                                key={slotKey}
                                                                                label={slotKey}
                                                                                size="small"
                                                                                onClick={() => {
                                                                                    const seq = [...newShift.rotation_pattern.sequence];
                                                                                    const daySlots = [...(step.slots || [])];
                                                                                    const idx = daySlots.indexOf(slotKey);
                                                                                    if (idx > -1) daySlots.splice(idx, 1);
                                                                                    else daySlots.push(slotKey);
                                                                                    
                                                                                    // Calculate total hours and offset
                                                                                    let totalHours = 0;
                                                                                    let maxOffset = 0;
                                                                                    daySlots.forEach(s => {
                                                                                        const slotData = newShift.rotation_pattern.slots[s];
                                                                                        const start = slotData.start || '08:00';
                                                                                        const end = slotData.end || '16:00';
                                                                                        const startH = parseInt(start.split(':')[0]);
                                                                                        const endH = parseInt(end.split(':')[0]);
                                                                                        let h = endH - startH;
                                                                                        if (h < 0) {
                                                                                            h += 24;
                                                                                            maxOffset = 1;
                                                                                        }
                                                                                        totalHours += h;
                                                                                    });

                                                                                    seq[i] = { 
                                                                                        ...(typeof seq[i] === 'object' ? seq[i] : {}), 
                                                                                        slots: daySlots, 
                                                                                        hours: totalHours, 
                                                                                        offset: maxOffset,
                                                                                        label: daySlots.join('+') || t('No Slot')
                                                                                    };
                                                                                    setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                                                }}
                                                                                sx={{
                                                                                    bgcolor: isSelected ? COLORS.primary : 'transparent',
                                                                                    color: isSelected ? COLORS.white : COLORS.secondary,
                                                                                    borderColor: isSelected ? COLORS.primary : alpha(COLORS.secondary, 0.3),
                                                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                                                    borderRadius: '6px',
                                                                                    border: isSelected ? 'none' : '1px solid',
                                                                                    '&:hover': {
                                                                                        bgcolor: isSelected ? COLORS.primary : alpha(COLORS.primary, 0.05),
                                                                                        borderColor: COLORS.primary
                                                                                    }
                                                                                }}
                                                                            />
                                                                        );
                                                                    })}
                                                                </Stack>
                                                            )}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                {!isOff && (
                                                                    <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: '700' }}>
                                                                        {step.hours || 0}h {step.offset > 0 ? `(+${step.offset}d)` : ''}
                                                                    </Typography>
                                                                )}
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => {
                                                                        const seq = [...newShift.rotation_pattern.sequence];
                                                                        const newStep = typeof step === 'string' ? step : { ...step, slots: [...(step.slots || [])] };
                                                                        seq.splice(i + 1, 0, newStep);
                                                                        setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                                    }}
                                                                    sx={{ color: COLORS.primary }}
                                                                >
                                                                    <RotateRight sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => {
                                                                        const seq = [...newShift.rotation_pattern.sequence];
                                                                        seq.splice(i, 1);
                                                                        setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                                    }}
                                                                    sx={{ color: COLORS.error }}
                                                                >
                                                                    <Delete sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                    </Paper>
                                                );
                                            })}
                                            {(newShift.rotation_pattern?.sequence || []).length === 0 && (
                                                <Typography variant="caption" align="center" sx={{ py: 3, color: COLORS.secondary, fontStyle: 'italic' }}>
                                                    {t('Sequence is empty. Add work days or off days above.')}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Holiday Bonus Option */}
                                    <Box sx={{ 
                                        mt: 3, 
                                        p: 2, 
                                        bgcolor: alpha(COLORS.success, 0.05), 
                                        borderRadius: '12px', 
                                        border: `1px solid ${alpha(COLORS.success, 0.2)}` 
                                    }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={newShift.distribute_holiday_bonus || false}
                                                    onChange={(e) => setNewShift({ ...newShift, distribute_holiday_bonus: e.target.checked })}
                                                    sx={{ 
                                                        color: COLORS.success,
                                                        '&.Mui-checked': { color: COLORS.success }
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: '700', color: COLORS.success }}>
                                                        {t('Distribute Holiday Pay Proportionally')}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: COLORS.secondary }}>
                                                        {t('Instead of a fixed holiday, pay is distributed across work days based on hours (A=1 share, B+C=2 shares).')}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Box>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: COLORS.bg, borderTop: `1px solid ${alpha(COLORS.secondary, 0.1)}` }}>
                    <Button 
                        onClick={handleCloseShiftDialog} 
                        sx={{ 
                            borderRadius: '8px', 
                            color: COLORS.secondary,
                            textTransform: 'none',
                            fontWeight: '600'
                        }}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={handleCreateShift} 
                        variant="contained" 
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ 
                            borderRadius: '8px', 
                            px: 4,
                            bgcolor: COLORS.primary,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: SHADOWS.sm,
                            '&:hover': { bgcolor: COLORS.primary, boxShadow: SHADOWS.md }
                        }}
                    >
                        {editingShiftId ? t('Update Policy') : t('Create Policy')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assignment Dialog */}
            <Dialog 
                open={openAssign} 
                onClose={handleCloseAssignDialog} 
                maxWidth="sm" 
                fullWidth 
                slotProps={{ 
                    paper: { 
                        sx: { 
                            borderRadius: '16px',
                            boxShadow: SHADOWS.lg,
                            bgcolor: COLORS.white
                        } 
                    } 
                }}
            >
                <DialogTitle sx={{ 
                    fontWeight: '800', 
                    color: COLORS.dark,
                    p: 3,
                    borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}`
                }}>
                    {t('Assign Shift Policy')}
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <FormControl fullWidth error={!!validationErrors.employee_id}>
                            <InputLabel sx={{ color: COLORS.secondary }}>{t('Employee')}</InputLabel>
                            <Select
                                value={newAssignment.employee_id}
                                label={t('Employee')}
                                onChange={(e) => setNewAssignment({ ...newAssignment, employee_id: e.target.value })}
                                sx={{ 
                                    borderRadius: '8px',
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                }}
                            >
                                {employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id} sx={{ borderRadius: '6px', mx: 1, my: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }}>
                                                {emp.full_name?.[0]}
                                            </Avatar>
                                            <Typography variant="body2">{emp.full_name} ({emp.employee_id})</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            {validationErrors.employee_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, marginInlineStart: 1.5 }}>
                                    {validationErrors.employee_id}
                                </Typography>
                            )}
                        </FormControl>
                        <FormControl fullWidth error={!!validationErrors.shift_id}>
                            <InputLabel sx={{ color: COLORS.secondary, '&.Mui-focused': { color: COLORS.primary } }}>{t('Shift Policy')}</InputLabel>
                            <Select
                                value={newAssignment.shift_id}
                                label={t('Shift Policy')}
                                onChange={(e) => setNewAssignment({ ...newAssignment, shift_id: e.target.value })}
                                sx={{ 
                                    borderRadius: '8px',
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                }}
                            >
                                {shifts.map(shift => (
                                    <MenuItem key={shift.id} value={shift.id} sx={{ borderRadius: '6px', mx: 1, my: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Schedule sx={{ fontSize: 18, color: COLORS.primary }} />
                                            <Typography variant="body2">{shift.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            {validationErrors.shift_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, marginInlineStart: 1.5 }}>
                                    {validationErrors.shift_id}
                                </Typography>
                            )}
                        </FormControl>
                        <TextField
                            label={t('Effective From')}
                            type="date"
                            fullWidth
                            value={newAssignment.start_date}
                            onChange={(e) => setNewAssignment({ ...newAssignment, start_date: e.target.value })}
                            slotProps={{ inputLabel: { shrink: true } }}
                            error={!!validationErrors.start_date}
                            helperText={validationErrors.start_date}
                            sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                    borderRadius: '8px',
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary }
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: COLORS.primary }
                            }}
                        />
                        <Alert 
                            severity="info" 
                            icon={<Info />}
                            sx={{ 
                                borderRadius: '12px',
                                bgcolor: alpha(COLORS.info, 0.05),
                                color: COLORS.dark,
                                border: `1px solid ${alpha(COLORS.info, 0.2)}`,
                                '& .MuiAlert-icon': { color: COLORS.info }
                            }}
                        >
                            {t('Assigning a new policy will automatically end the previous one as of the selected date.')}
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: COLORS.bg, borderTop: `1px solid ${alpha(COLORS.secondary, 0.1)}` }}>
                    <Button 
                        onClick={handleCloseAssignDialog}
                        sx={{ 
                            borderRadius: '8px', 
                            color: COLORS.secondary,
                            textTransform: 'none',
                            fontWeight: '600'
                        }}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={handleAssignShift} 
                        variant="contained" 
                        sx={{ 
                            borderRadius: '8px', 
                            px: 4,
                            background: COLORS.gradientPrimary,
                            boxShadow: SHADOWS.sm,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            '&:hover': {
                                boxShadow: SHADOWS.md,
                                transform: 'translateY(-1px)'
                            }
                        }}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AssignmentInd />}
                    >
                        {t('Assign Now')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for better mobile feedback */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={feedback?.type || 'info'} sx={{ width: '100%' }}>
                    {feedback?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ShiftSettingsPage;
