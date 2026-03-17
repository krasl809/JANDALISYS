import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardContent, CardHeader, Typography, Grid, Box, 
  Button, TextField, MenuItem, Chip, Paper, Divider,
  Alert, CircularProgress, FormControl, InputLabel, 
  Select, FormControlLabel, Checkbox, Autocomplete,
  Stepper, Step, StepLabel
} from '@mui/material';
import { 
  Send as SubmitIcon, 
  Save as SaveIcon,
  ArrowBack as BackIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Description as DocIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

interface LeaveType {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  category: string;
  max_days_per_year: number;
  max_consecutive_days: number;
  min_advance_days: number;
  requires_documents: boolean;
  document_types: string[];
  color: string;
  is_paid: boolean;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  remaining_days: number;
  allocated_days: number;
  used_days: number;
}

interface Employee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

const steps = [
  { label: 'Leave Type', description: 'Select leave type' },
  { label: 'Dates', description: 'Choose dates' },
  { label: 'Details', description: 'Additional information' },
  { label: 'Review', description: 'Review and submit' }
];

export default function LeaveRequestForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_half_day: false,
    is_hourly: false,
    hours_requested: 0,
    reason: '',
    destination: '',
    contact_number: '',
    handover_to_employee_id: null as string | null,
    handover_notes: '',
    replacement_employee_id: null as string | null,
    documents: [] as string[],
    document_descriptions: [] as string[]
  });

  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch leave types
      const typesRes = await api.get('/leave/leave/types', {
        params: { is_visible: true, is_active: true }
      });
      setLeaveTypes(typesRes.data);

      // Fetch my balances
      try {
        const balancesRes = await api.get('/leave/leave/balances/me');
        setBalances(balancesRes.data.balances || []);
      } catch (e) {
        console.log('No balances found');
      }

      // If editing, fetch existing request
      if (id) {
        const requestRes = await api.get(`/leave/leave/requests/${id}`);
        const req = requestRes.data;
        setFormData({
          leave_type_id: req.leave_type_id,
          start_date: req.start_date,
          end_date: req.end_date,
          start_time: req.start_time || '',
          end_time: req.end_time || '',
          is_half_day: req.is_half_day,
          is_hourly: req.is_hourly,
          hours_requested: req.hours_requested || 0,
          reason: req.reason || '',
          destination: req.destination || '',
          contact_number: req.contact_number || '',
          handover_to_employee_id: req.handover_to_employee_id,
          handover_notes: req.handover_notes || '',
          replacement_employee_id: req.replacement_employee_id,
          documents: req.documents || [],
          document_descriptions: req.document_descriptions || []
        });

        // Set selected leave type
        const lt = typesRes.data.find((lt: LeaveType) => lt.id === req.leave_type_id);
        if (lt) setSelectedLeaveType(lt);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? (e.target as HTMLInputElement).checked : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLeaveTypeChange = (leaveTypeId: string) => {
    const lt = leaveTypes.find(t => t.id === leaveTypeId);
    setSelectedLeaveType(lt || null);
    setFormData(prev => ({
      ...prev,
      leave_type_id: leaveTypeId
    }));
  };

  const calculateTotalDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (formData.is_half_day) return 0.5;
    if (formData.is_hourly) return formData.hours_requested / 8;
    
    // Exclude weekends (simplified - just count days)
    let workDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) workDays++;
      current.setDate(current.getDate() + 1);
    }
    
    return workDays;
  };

  const getSelectedBalance = () => {
    if (!formData.leave_type_id) return null;
    return balances.find(b => b.leave_type_id === formData.leave_type_id);
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return Boolean(formData.leave_type_id);
      case 1:
        return Boolean(formData.start_date && formData.end_date);
      case 2:
        return true; // Details are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async (submit: boolean = false) => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      if (isEdit) {
        await api.put(`/leave/leave/requests/${id}`, payload);
        setSuccess('Leave request updated successfully');
      } else {
        const res = await api.post('/leave/leave/requests', payload);
        
        if (submit) {
          // Submit for approval
          await api.put(`/leave/leave/requests/${res.data.id}/submit`);
          setSuccess('Leave request submitted for approval');
        } else {
          setSuccess('Leave request saved as draft');
        }
      }

      setTimeout(() => {
        navigate('/hr/leave');
      }, 1500);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error saving leave request');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedBalance = getSelectedBalance();
  const totalDays = calculateTotalDays();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/hr/leave')}
        >
          {t('common.back', 'Back')}
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {isEdit 
            ? t('leave.edit_request', 'Edit Leave Request')
            : t('leave.new_request', 'New Leave Request')
          }
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title={steps[activeStep].description} />
            <CardContent>
              {/* Step 0: Leave Type */}
              {activeStep === 0 && (
                <Box>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>{t('leave.leave_type', 'Leave Type')}</InputLabel>
                    <Select
                      value={formData.leave_type_id}
                      label={t('leave.leave_type', 'Leave Type')}
                      onChange={(e) => handleLeaveTypeChange(e.target.value)}
                    >
                      {leaveTypes.map((lt) => (
                        <MenuItem key={lt.id} value={lt.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: lt.color }} />
                            {lt.name}
                            {!lt.is_paid && (
                              <Chip label="Unpaid" size="small" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedLeaveType && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {selectedLeaveType.name} Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Max Days/Year
                          </Typography>
                          <Typography>{selectedLeaveType.max_days_per_year} days</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Max Consecutive Days
                          </Typography>
                          <Typography>{selectedLeaveType.max_consecutive_days} days</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Minimum Advance Notice
                          </Typography>
                          <Typography>{selectedLeaveType.min_advance_days} days</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Requires Documents
                          </Typography>
                          <Typography>{selectedLeaveType.requires_documents ? 'Yes' : 'No'}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Step 1: Dates */}
              {activeStep === 1 && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('leave.start_date', 'Start Date')}
                        name="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('leave.end_date', 'End Date')}
                        name="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: formData.start_date }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Leave Options
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.is_half_day}
                        onChange={handleInputChange}
                        name="is_half_day"
                      />
                    }
                    label={t('leave.half_day', 'Half Day')}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.is_hourly}
                        onChange={handleInputChange}
                        name="is_hourly"
                      />
                    }
                    label={t('leave.hourly', 'Hourly Leave')}
                  />

                  {formData.is_hourly && (
                    <TextField
                      fullWidth
                      label={t('leave.hours', 'Number of Hours')}
                      name="hours_requested"
                      type="number"
                      value={formData.hours_requested}
                      onChange={handleInputChange}
                      sx={{ mt: 2 }}
                      inputProps={{ min: 0.5, max: 8, step: 0.5 }}
                    />
                  )}

                  {formData.is_half_day && (
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('leave.start_time', 'Start Time')}
                          name="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={handleInputChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('leave.end_time', 'End Time')}
                          name="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={handleInputChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}

              {/* Step 2: Details */}
              {activeStep === 2 && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label={t('leave.reason', 'Reason')}
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label={t('leave.destination', 'Destination')}
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    sx={{ mb: 2 }}
                    placeholder="Where will you be during leave?"
                  />

                  <TextField
                    fullWidth
                    label={t('leave.contact_number', 'Contact Number')}
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    sx={{ mb: 2 }}
                    placeholder="Emergency contact during leave"
                  />

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    {t('leave.handover', 'Handover Information')}
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={t('leave.handover_notes', 'Handover Notes')}
                    name="handover_notes"
                    value={formData.handover_notes}
                    onChange={handleInputChange}
                    sx={{ mb: 2 }}
                    placeholder="Notes for colleague covering your work"
                  />
                </Box>
              )}

              {/* Step 3: Review */}
              {activeStep === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('leave.review_request', 'Review Your Request')}
                  </Typography>

                  <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Leave Type
                        </Typography>
                        <Typography variant="body1">
                          {selectedLeaveType?.name || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Total Days
                        </Typography>
                        <Typography variant="body1">
                          {totalDays} days
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Start Date
                        </Typography>
                        <Typography variant="body1">
                          {formData.start_date || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          End Date
                        </Typography>
                        <Typography variant="body1">
                          {formData.end_date || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">
                          Reason
                        </Typography>
                        <Typography variant="body1">
                          {formData.reason || '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {selectedBalance && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Available Balance: {selectedBalance.remaining_days} days
                      <br />
                      After this request: {Math.max(0, selectedBalance.remaining_days - totalDays).toFixed(1)} days
                    </Alert>
                  )}
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(prev => prev - 1)}
                >
                  {t('common.back', 'Back')}
                </Button>
                
                {activeStep < steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(prev => prev + 1)}
                    disabled={!canProceed()}
                  >
                    {t('common.next', 'Next')}
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={() => handleSubmit(false)}
                      disabled={loading}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SubmitIcon />}
                      onClick={() => handleSubmit(true)}
                      disabled={loading}
                      sx={{ bgcolor: '#3B82F6' }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Submit for Approval'}
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Balance Info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardHeader 
              title={t('leave.my_balances', 'My Leave Balances')} 
              avatar={<TimeIcon color="primary" />}
            />
            <CardContent>
              {balances.length === 0 ? (
                <Typography color="textSecondary">
                  No leave balances available
                </Typography>
              ) : (
                <Box>
                  {balances.map((balance) => (
                    <Box 
                      key={balance.leave_type_id} 
                      sx={{ 
                        p: 1.5, 
                        mb: 1, 
                        bgcolor: balance.leave_type_id === formData.leave_type_id ? 'primary.light' : 'grey.50',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleLeaveTypeChange(balance.leave_type_id)}
                    >
                      <Typography variant="subtitle2">
                        {balance.leave_type_name}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">
                          Used: {balance.used_days}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {balance.remaining_days} left
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
