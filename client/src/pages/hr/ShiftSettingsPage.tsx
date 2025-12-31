import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Grid2 as Grid, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, IconButton, Card, CardContent, Divider,
    Alert, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Checkbox,
    FormControlLabel, FormGroup, Stack, Avatar, List, ListItem, ListItemText, ListItemAvatar,
    alpha, useTheme, Tooltip, Badge, CircularProgress, Snackbar, FormHelperText
} from '@mui/material';
import {
    Add, Edit, Delete, Schedule, AssignmentInd, AccessTime,
    Info, RotateRight, Refresh, AutoFixHigh,
    AddCircle, RemoveCircle, DragIndicator
} from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
                api.get('/hr/shifts'),
                api.get('/hr/employees')
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
                await api.put(`/hr/shifts/${editingShiftId}`, newShift);
                setFeedback({ type: 'success', msg: t('Shift policy updated successfully') });
            } else {
                await api.post('/hr/shifts', newShift);
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
        if (!window.confirm(t('Are you sure you want to delete this policy?'))) return;
        
        setSubmitting(true);
        try {
            await api.delete(`/hr/shifts/${id}`);
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
            
            await api.post('/hr/employees/assign-shift', newAssignment);
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
        <Box sx={{ p: 3, boxSizing: 'border-box', width: '100%' }}>
            <Box sx={{ 
                mb: 4, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight="900" sx={{ background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {t('Shift Management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{t('Define work schedules, grace periods, and overtime rules')}</Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Add />}
                        onClick={() => setOpenAddShift(true)}
                        sx={{ borderRadius: 3, px: 3 }}
                        disabled={submitting}
                    >
                        {t('New Policy')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AssignmentInd />}
                        onClick={() => setOpenAssign(true)}
                        sx={{ borderRadius: 3, px: 3 }}
                    >
                        {t('Assign to Employee')}
                    </Button>
                    <Button
                        variant="text"
                        startIcon={<Refresh />}
                        onClick={() => fetchData()}
                        sx={{ borderRadius: 3, px: 2 }}
                        disabled={loading}
                    >
                        {t('Refresh')}
                    </Button>
                </Stack>
            </Box>

            {feedback && (
                <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 3 }} onClose={() => {setFeedback(null); setSnackbarOpen(false);}}>
                    {feedback.msg}
                </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
                    <Tab icon={<Schedule sx={{ fontSize: 20 }} />} iconPosition="start" label={t('Shift Policies')} />
                    <Tab icon={<AssignmentInd sx={{ fontSize: 20 }} />} iconPosition="start" label={t('Active Assignments')} />
                </Tabs>
            </Box>

            {tab === 0 && (
                <Grid container spacing={3}>
                    {loading ? (
                        <Grid size={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress />
                            </Box>
                        </Grid>
                    ) : (
                        shifts.map((shift) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={shift.id}>
                                <Card elevation={0} sx={{
                                    borderRadius: 4,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.08)}`,
                                        borderColor: theme.palette.primary.main
                                    }
                                }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">{shift.name}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={t(shift.shift_type)}
                                                    color={shift.shift_type === 'rotational' ? 'secondary' : 'primary'}
                                                    sx={{ mt: 0.5, fontWeight: 'bold' }}
                                                />
                                            </Box>
                                            <Stack direction="row">
                                                <IconButton size="small" color="primary" onClick={() => handleEditShift(shift)} disabled={submitting}><Edit fontSize="small" /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => shift.id && handleDeleteShift(shift.id)} disabled={submitting}><Delete fontSize="small" /></IconButton>
                                            </Stack>
                                        </Box>

                                        <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                                        <Grid container spacing={2}>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Schedule')}</Typography>
                                                <Typography variant="body2" fontWeight="800">
                                                    {shift.start_time} - {shift.end_time}
                                                </Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Expected Hours')}</Typography>
                                                <Typography variant="body2" fontWeight="800">{shift.expected_hours}h</Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Grace In/Out')}</Typography>
                                                <Typography variant="body2">{shift.grace_period_in} / {shift.grace_period_out}m</Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary">{t('OT Multiplier')}</Typography>
                                                <Typography variant="body2" color="success.main" fontWeight="bold">x{shift.multiplier_normal}</Typography>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 'bold' }}>
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
                <Card sx={{ borderRadius: 4, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }} elevation={0}>
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                            <Button startIcon={<AssignmentInd />} size="small" variant="contained" onClick={() => setOpenAssign(true)} sx={{ borderRadius: 2 }}>
                                {t('New Assignment')}
                            </Button>
                        </Box>
                        <List sx={{ width: '100%', p: 0 }}>
                            {loading ? (
                                <Box sx={{ textAlign: 'center', py: 12 }}>
                                    <CircularProgress />
                                    <Typography color="text.secondary" sx={{ mt: 2 }}>{t('Loading assignments...')}</Typography>
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
                                                    py: 2.5,
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                                }}>
                                                    <ListItemAvatar>
                                                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: isRtl ? 'left' : 'right' }} variant="dot" color="success">
                                                            <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 44, height: 44 }}>{emp.full_name?.[0] || 'U'}</Avatar>
                                                        </Badge>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography fontWeight="900" variant="subtitle1">{emp.full_name || 'Unknown'}</Typography>
                                                                <Typography variant="caption" color="text.secondary">[{emp.employee_id || 'N/A'}]</Typography>
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                                    <Schedule sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        {activeAssignment?.shift?.name || t('No Shift Assigned')}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                                    <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {t('From')}: {activeAssignment?.start_date ? format(new Date(activeAssignment.start_date), 'MMM d, yyyy', { locale: isRtl ? ar : enUS }) : '--'}
                                                                    </Typography>
                                                                </Box>
                                                                {activeAssignment?.shift?.shift_type === 'rotational' && (
                                                                    <Chip size="small" label={t('Rotational')} color="secondary" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 900 }} />
                                                                )}
                                                            </Stack>
                                                        }
                                                    />
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Tooltip title={t('History')}>
                                                            <IconButton size="small"><Info fontSize="small" /></IconButton>
                                                        </Tooltip>
                                                        <Button
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                                                            onClick={() => {
                                                                setNewAssignment({ ...newAssignment, employee_id: emp.id });
                                                                setOpenAssign(true);
                                                            }}
                                                        >
                                                            {t('Change')}
                                                        </Button>
                                                    </Stack>
                                                </ListItem>
                                                <Divider variant="inset" component="li" sx={{ borderColor: alpha(theme.palette.divider, 0.05) }} />
                                            </React.Fragment>
                                        );
                                    })
                            )}
                            {!loading && employees.filter(e => !!e.shift_assignments && e.shift_assignments.length > 0).length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 12 }}>
                                    <AssignmentInd sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5, mb: 1 }} />
                                    <Typography color="text.secondary" fontWeight="700">{t('No active shift assignments found')}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('Create a shift policy and assign it to employees to get started')}</Typography>
                                    <Stack direction="row" spacing={2} justifyContent="center">
                                        <Button variant="contained" onClick={() => setOpenAddShift(true)} startIcon={<Add />}>
                                            {t('Create Shift Policy')}
                                        </Button>
                                        <Button variant="outlined" onClick={() => setOpenAssign(true)} startIcon={<AssignmentInd />}>
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
            <Dialog open={openAddShift} onClose={handleCloseShiftDialog} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 5, p: 1 } } }}>
                <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RotateRight color="primary" /> {editingShiftId ? t('Edit Shift Policy') : t('Create Shift Policy')}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField 
                                label={t('Policy Name')} 
                                fullWidth 
                                value={newShift.name || ''} 
                                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} 
                                placeholder="e.g. Administrative Shift"
                                error={!!validationErrors.name}
                                helperText={validationErrors.name}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>{t('Shift Type')}</InputLabel>
                                <Select value={newShift.shift_type || 'fixed'} label={t('Shift Type')} onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value as 'fixed' | 'rotational' })}>
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
                            />
                        </Grid>

                        <Grid size={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>{t('Shift Ends On')}</InputLabel>
                                <Select
                                    value={newShift.end_day_offset || 0}
                                    label={t('Shift Ends On')}
                                    onChange={(e) => setNewShift({ ...newShift, end_day_offset: Number(e.target.value) })}
                                >
                                    <MenuItem value={0}>{t('Same Day')}</MenuItem>
                                    <MenuItem value={1}>{t('Next Day')}</MenuItem>
                                    <MenuItem value={2}>{t('After 2 Days')}</MenuItem>
                                </Select>
                                <FormHelperText>
                                    {t('Select if the shift spans across multiple days (e.g., 16h or 48h shifts)')}
                                </FormHelperText>
                            </FormControl>
                        </Grid>

                        {validationErrors.time_range && (
                            <Grid size={12}>
                                <Alert severity="error">{validationErrors.time_range}</Alert>
                            </Grid>
                        )}

                        <Grid size={12}>
                            <Divider><Chip label={t('Policy Rules')} size="small" /></Divider>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('Grace In (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_in || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_in: Number(e.target.value) })} 
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('Grace Out (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_out || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_out: Number(e.target.value) })} 
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField 
                                label={t('OT Threshold (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.ot_threshold || 0} 
                                onChange={(e) => setNewShift({ ...newShift, ot_threshold: Number(e.target.value) })} 
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
                            />
                        </Grid>

                        <Grid size={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('Weekly Holidays & Eligibility')}</Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={newShift.is_holiday_paid ?? true} 
                                            onChange={(e) => setNewShift({ ...newShift, is_holiday_paid: e.target.checked })}
                                            color="primary"
                                        />
                                    }
                                    label={<Typography variant="body2" sx={{ fontWeight: 'bold' }}>{t('Holidays are Paid')}</Typography>}
                                />
                            </Box>
                            
                            {newShift.is_holiday_paid && (
                                <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: `1px dashed ${theme.palette.primary.main}` }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('Minimum working days required in the last 7 days to qualify for a paid holiday')}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                label={t('Minimum Work Units (Shifts/Days) for Holiday Eligibility')}
                                                helperText={t('Number of attendance records required in the last 7 days to qualify for a paid holiday')}
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={newShift.min_days_for_paid_holiday ?? 4}
                                                onChange={(e) => setNewShift({ ...newShift, min_days_for_paid_holiday: Number(e.target.value) })}
                                                slotProps={{ htmlInput: { min: 0, max: 21 } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            <FormGroup row>
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
                                            />
                                        }
                                        label={t(day)}
                                    />
                                ))}
                            </FormGroup>
                        </Grid>

                        {newShift.shift_type === 'rotational' && (
                            <Grid size={12}>
                                <Divider sx={{ mb: 2 }}><Chip label={t('Rotational Shift Designer (A/B/C)')} size="small" /></Divider>
                                <Box sx={{ p: 2, border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`, borderRadius: 4, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                                    
                                    {/* Slot Definitions */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('1. Define Time Slots')}</Typography>
                                        <Button 
                                            size="small" 
                                            startIcon={<AddCircle />} 
                                            onClick={() => {
                                                const slots = { ...newShift.rotation_pattern?.slots || {} };
                                                const nextKey = String.fromCharCode(65 + Object.keys(slots).length); // A, B, C...
                                                slots[nextKey] = { start: '08:00', end: '16:00', hours: 8 };
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                            }}
                                        >
                                            {t('Add Slot')}
                                        </Button>
                                    </Box>
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        {Object.entries(newShift.rotation_pattern?.slots || {}).map(([slot, data]: [string, any]) => (
                                            <Grid size={{ xs: 12, md: 4 }} key={slot}>
                                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, position: 'relative' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                        <Typography variant="caption" fontWeight="bold" color="secondary">{t('Slot')} {slot}</Typography>
                                                        <IconButton 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => {
                                                                const slots = { ...newShift.rotation_pattern.slots };
                                                                delete slots[slot];
                                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, slots } });
                                                            }}
                                                        >
                                                            <RemoveCircle sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Box>
                                                    <Stack direction="row" spacing={1}>
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
                                                        />
                                                    </Stack>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    {/* Sequence Builder */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('2. Build Sequence')}</Typography>
                                        <Box>
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
                                            >
                                                {t('Template: 48h/6-Days')}
                                            </Button>
                                        </Box>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                        {t('The sequence will repeat automatically after the last day.')}
                                    </Typography>
                                    
                                    <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                        <Button 
                                            variant="outlined" 
                                            color="secondary" 
                                            size="small"
                                            startIcon={<AddCircle />}
                                            onClick={() => {
                                                const seq = [...(newShift.rotation_pattern?.sequence || []), { label: '', slots: [], hours: 0, offset: 0 }];
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                            }}
                                        >
                                            {t('Add Work Day')}
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            color="error" 
                                            size="small"
                                            startIcon={<RemoveCircle />}
                                            onClick={() => {
                                                const seq = [...(newShift.rotation_pattern?.sequence || []), 'OFF'];
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                            }}
                                        >
                                            {t('Add OFF Day')}
                                        </Button>
                                        <Button 
                                            variant="text" 
                                            color="error" 
                                            size="small"
                                            onClick={() => {
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: [] } });
                                            }}
                                        >
                                            {t('Clear')}
                                        </Button>
                                    </Stack>

                                    {/* Sequence Display */}
                                    <Box sx={{ minHeight: 100, p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 3, border: `1px dashed ${theme.palette.divider}` }}>
                                        <Stack spacing={2}>
                                            {(newShift.rotation_pattern?.sequence || []).map((step: any, i: number) => {
                                                const isOff = typeof step === 'string' && step === 'OFF';
                                                return (
                                                    <Paper 
                                                        key={i} 
                                                        variant="outlined" 
                                                        sx={{ 
                                                            p: 1.5, 
                                                            borderRadius: 2, 
                                                            bgcolor: isOff ? alpha(theme.palette.error.main, 0.02) : 'background.paper',
                                                            borderColor: isOff ? alpha(theme.palette.error.main, 0.2) : 'divider'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                                                                <Typography variant="subtitle2" fontWeight="bold">
                                                                    {t('Day')} {i + 1}
                                                                </Typography>
                                                            </Box>
                                                            {isOff ? (
                                                                <Chip label={t('OFF')} size="small" color="error" variant="outlined" />
                                                            ) : (
                                                                <Stack direction="row" spacing={0.5}>
                                                                    {Object.keys(newShift.rotation_pattern?.slots || {}).map(slotKey => {
                                                                        const isSelected = step.slots?.includes(slotKey);
                                                                        return (
                                                                            <Chip
                                                                                key={slotKey}
                                                                                label={slotKey}
                                                                                size="small"
                                                                                color={isSelected ? "secondary" : "default"}
                                                                                variant={isSelected ? "filled" : "outlined"}
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
                                                                                        // Calculate hours if not set (rough estimation for UI)
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
                                                                            />
                                                                        );
                                                                    })}
                                                                </Stack>
                                                            )}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                {!isOff && (
                                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                        {step.hours || 0}h {step.offset > 0 ? `(+${step.offset}d)` : ''}
                                                                    </Typography>
                                                                )}
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="primary"
                                                                    onClick={() => {
                                                                        const seq = [...newShift.rotation_pattern.sequence];
                                                                        const newStep = typeof step === 'string' ? step : { ...step, slots: [...(step.slots || [])] };
                                                                        seq.splice(i + 1, 0, newStep);
                                                                        setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                                    }}
                                                                >
                                                                    <RotateRight fontSize="small" sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="error"
                                                                    onClick={() => {
                                                                        const seq = [...newShift.rotation_pattern.sequence];
                                                                        seq.splice(i, 1);
                                                                        setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                                    }}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                    </Paper>
                                                );
                                            })}
                                            {(newShift.rotation_pattern?.sequence || []).length === 0 && (
                                                <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2 }}>
                                                    {t('Sequence is empty. Add work days or off days above.')}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Holiday Bonus Option */}
                                    <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={newShift.distribute_holiday_bonus || false}
                                                    onChange={(e) => setNewShift({ ...newShift, distribute_holiday_bonus: e.target.checked })}
                                                    color="success"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                                        {t('Distribute Holiday Pay Proportionally')}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
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
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseShiftDialog} sx={{ borderRadius: 2 }}>{t('Cancel')}</Button>
                    <Button 
                        onClick={handleCreateShift} 
                        variant="contained" 
                        sx={{ borderRadius: 2, px: 4 }}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {editingShiftId ? t('Update Policy') : t('Create Policy')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assignment Dialog */}
            <Dialog open={openAssign} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 5 } } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>{t('Assign Shift Policy')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <FormControl fullWidth error={!!validationErrors.employee_id}>
                            <InputLabel>{t('Employee')}</InputLabel>
                            <Select
                                value={newAssignment.employee_id}
                                label={t('Employee')}
                                onChange={(e) => setNewAssignment({ ...newAssignment, employee_id: e.target.value })}
                            >
                                {employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</MenuItem>
                                ))}
                            </Select>
                            {validationErrors.employee_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, marginInlineStart: 1.5 }}>
                                    {validationErrors.employee_id}
                                </Typography>
                            )}
                        </FormControl>
                        <FormControl fullWidth error={!!validationErrors.shift_id}>
                            <InputLabel>{t('Shift Policy')}</InputLabel>
                            <Select
                                value={newAssignment.shift_id}
                                label={t('Shift Policy')}
                                onChange={(e) => setNewAssignment({ ...newAssignment, shift_id: e.target.value })}
                            >
                                {shifts.map(shift => (
                                    <MenuItem key={shift.id} value={shift.id}>{shift.name}</MenuItem>
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
                        />
                        <Alert severity="info" icon={<Info />}>
                            {t('Assigning a new policy will automatically end the previous one as of the selected date.')}
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseAssignDialog}>{t('Cancel')}</Button>
                    <Button 
                        onClick={handleAssignShift} 
                        variant="contained" 
                        sx={{ borderRadius: 2, px: 4 }}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
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
