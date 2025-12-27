import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, IconButton, Card, CardContent, Divider,
    Alert, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Checkbox,
    FormControlLabel, FormGroup, Stack, Avatar, List, ListItem, ListItemText, ListItemAvatar,
    alpha, useTheme, Tooltip, Badge, CircularProgress, Snackbar
} from '@mui/material';
import {
    Add, Edit, Delete, Schedule, AssignmentInd, AccessTime,
    Info, RotateRight, CheckCircle, Warning, FilterList, Refresh
} from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const ShiftSettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const [tab, setTab] = useState(0);
    const [shifts, setShifts] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [rotationInput, setRotationInput] = useState('');
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    // Shift Logic States
    const [openAddShift, setOpenAddShift] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
    const [newShift, setNewShift] = useState<any>({
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
        rotation_pattern: { sequence: [], days: 0 }
    });

    // Assignment States
    const [openAssign, setOpenAssign] = useState(false);
    const [newAssignment, setNewAssignment] = useState({
        employee_id: '',
        shift_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd')
    });

    const fetchData = async (showLoading = true) => {
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
        } catch (error: any) {
            console.error('Error fetching data:', error);
            const errorMessage = error.response?.data?.detail || error.message || t('Failed to load data');
            setFeedback({ type: 'error', msg: errorMessage });
            setSnackbarOpen(true);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Validation functions
    const validateShift = (shift: any): {[key: string]: string} => {
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
        
        if (shift.start_time && shift.end_time && shift.start_time >= shift.end_time) {
            errors.time_range = t('End time must be after start time');
        }
        
        if (!shift.expected_hours || shift.expected_hours <= 0) {
            errors.expected_hours = t('Expected hours must be greater than 0');
        }
        
        return errors;
    };

    const validateAssignment = (assignment: any): {[key: string]: string} => {
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
    }, []);

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
            rotation_pattern: { sequence: [], days: 0 }
        });
        setRotationInput('');
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
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="900" sx={{ background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {t('Shift Management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{t('Define work schedules, grace periods, and overtime rules')}</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
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
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress />
                            </Box>
                        </Grid>
                    ) : (
                        shifts.map((shift) => (
                            <Grid item xs={12} md={6} lg={4} key={shift.id}>
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
                                                <IconButton size="small" color="error" onClick={() => handleDeleteShift(shift.id)} disabled={submitting}><Delete fontSize="small" /></IconButton>
                                            </Stack>
                                        </Box>

                                        <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Schedule')}</Typography>
                                                <Typography variant="body2" fontWeight="800">
                                                    {shift.start_time} - {shift.end_time}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Expected Hours')}</Typography>
                                                <Typography variant="body2" fontWeight="800">{shift.expected_hours}h</Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">{t('Grace In/Out')}</Typography>
                                                <Typography variant="body2">{shift.grace_period_in} / {shift.grace_period_out}m</Typography>
                                            </Grid>
                                            <Grid item xs={6}>
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
                                                    (shift.rotation_pattern?.sequence || []).map((step: string, i: number) => (
                                                        <Chip key={i} label={step} size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.65rem', height: 20 }} />
                                                    ))
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
                        <Grid item xs={12}>
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
                                    .map((emp, idx) => {
                                        const activeAssignment = emp.shift_assignments.find((a: any) => !a.end_date) || emp.shift_assignments[emp.shift_assignments.length - 1];
                                        return (
                                            <React.Fragment key={emp.id}>
                                                <ListItem alignItems="flex-start" sx={{
                                                    px: 3,
                                                    py: 2.5,
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                                }}>
                                                    <ListItemAvatar>
                                                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" color="success">
                                                            <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 44, height: 44 }}>{emp.name?.[0] || 'U'}</Avatar>
                                                        </Badge>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography fontWeight="900" variant="subtitle1">{emp.name || 'Unknown'}</Typography>
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
                                                                        {t('From')}: {activeAssignment?.start_date ? format(new Date(activeAssignment.start_date), 'MMM d, yyyy') : '--'}
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
            <Dialog open={openAddShift} onClose={handleCloseShiftDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 5, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RotateRight color="primary" /> {editingShiftId ? t('Edit Shift Policy') : t('Create Shift Policy')}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
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
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>{t('Shift Type')}</InputLabel>
                                <Select value={newShift.shift_type || 'fixed'} label={t('Shift Type')} onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}>
                                    <MenuItem value="fixed">{t('Fixed')}</MenuItem>
                                    <MenuItem value="rotational">{t('Rotational (Cycles)')}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField 
                                label={t('Start Time')} 
                                type="time" 
                                fullWidth 
                                value={newShift.start_time || ''} 
                                onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })} 
                                InputLabelProps={{ shrink: true }}
                                error={!!validationErrors.start_time}
                                helperText={validationErrors.start_time}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField 
                                label={t('End Time')} 
                                type="time" 
                                fullWidth 
                                value={newShift.end_time || ''} 
                                onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })} 
                                InputLabelProps={{ shrink: true }}
                                error={!!validationErrors.end_time}
                                helperText={validationErrors.end_time}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
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

                        {validationErrors.time_range && (
                            <Grid item xs={12}>
                                <Alert severity="error">{validationErrors.time_range}</Alert>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <Divider><Chip label={t('Policy Rules')} size="small" /></Divider>
                        </Grid>

                        <Grid item xs={6} md={3}>
                            <TextField 
                                label={t('Grace In (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_in || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_in: Number(e.target.value) })} 
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField 
                                label={t('Grace Out (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.grace_period_out || 0} 
                                onChange={(e) => setNewShift({ ...newShift, grace_period_out: Number(e.target.value) })} 
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField 
                                label={t('OT Threshold (m)')} 
                                type="number" 
                                fullWidth 
                                value={newShift.ot_threshold || 0} 
                                onChange={(e) => setNewShift({ ...newShift, ot_threshold: Number(e.target.value) })} 
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField 
                                label={t('Normal OT Multiplier')} 
                                type="number" 
                                fullWidth 
                                value={newShift.multiplier_normal || 1.5} 
                                onChange={(e) => setNewShift({ ...newShift, multiplier_normal: Number(e.target.value) })} 
                                inputProps={{ step: 0.1 }} 
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>{t('Holiday Days (2.0x Multiplier)')}</Typography>
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
                            <Grid item xs={12}>
                                <Divider sx={{ mb: 2 }}><Chip label={t('Rotation Cycle')} size="small" /></Divider>
                                <Box sx={{ p: 2, border: `1px dashed ${theme.palette.divider}`, borderRadius: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                        {t('Add work hours or OFF to define the sequence (e.g., 8h, 8h, 16h, OFF)')}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                        <TextField
                                            size="small"
                                            placeholder={t('Add step (e.g. 8h)')}
                                            value={rotationInput}
                                            onChange={(e) => setRotationInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (!rotationInput) return;
                                                    const seq = [...(newShift.rotation_pattern?.sequence || []), rotationInput];
                                                    setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                    setRotationInput('');
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                if (!rotationInput) return;
                                                const seq = [...(newShift.rotation_pattern?.sequence || []), rotationInput];
                                                setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                setRotationInput('');
                                            }}
                                        >
                                            {t('Add')}
                                        </Button>
                                    </Stack>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        {(newShift.rotation_pattern?.sequence || []).map((step: string, i: number) => (
                                            <Chip
                                                key={i}
                                                label={step}
                                                onDelete={() => {
                                                    const seq = [...newShift.rotation_pattern.sequence];
                                                    seq.splice(i, 1);
                                                    setNewShift({ ...newShift, rotation_pattern: { ...newShift.rotation_pattern, sequence: seq } });
                                                }}
                                                color="secondary"
                                            />
                                        ))}
                                    </Stack>
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
            <Dialog open={openAssign} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 5 } }}>
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
                                    <MenuItem key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</MenuItem>
                                ))}
                            </Select>
                            {validationErrors.employee_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
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
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
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
                            InputLabelProps={{ shrink: true }}
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
