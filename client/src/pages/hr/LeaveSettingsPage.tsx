import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardContent, CardHeader, Typography, Grid, Box,
  Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  TextField, MenuItem, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
  IconButton, Switch, FormControlLabel, Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface LeaveType {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  category: string;
  description?: string;
  max_days_per_year: number;
  max_consecutive_days: number;
  min_advance_days: number;
  max_advance_days: number;
  is_paid: boolean;
  is_accumulative: boolean;
  is_active: boolean;
  is_visible_to_employees: boolean;
  color: string;
  requires_approval: boolean;
  approval_levels_required: number;
}

export default function LeaveSettingsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    category: 'annual',
    description: '',
    max_days_per_year: 0,
    max_consecutive_days: 0,
    min_advance_days: 0,
    max_advance_days: 0,
    is_paid: true,
    is_accumulative: false,
    is_active: true,
    is_visible_to_employees: true,
    color: '#3B82F6',
    requires_approval: true,
    approval_levels_required: 1
  });

  const categories = [
    { value: 'annual', label: 'Annual' },
    { value: 'sick', label: 'Sick' },
    { value: 'personal', label: 'Personal' },
    { value: 'maternity', label: 'Maternity' },
    { value: 'paternity', label: 'Paternity' },
    { value: 'bereavement', label: 'Bereavement' },
    { value: 'marriage', label: 'Marriage' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'business', label: 'Business' },
    { value: 'study', label: 'Study' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leave/leave/types');
      setLeaveTypes(res.data);
    } catch (err: any) {
      console.error('Error fetching leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        name_ar: type.name_ar || '',
        code: type.code,
        category: type.category,
        description: type.description || '',
        max_days_per_year: type.max_days_per_year,
        max_consecutive_days: type.max_consecutive_days,
        min_advance_days: type.min_advance_days,
        max_advance_days: type.max_advance_days,
        is_paid: type.is_paid,
        is_accumulative: type.is_accumulative,
        is_active: type.is_active,
        is_visible_to_employees: type.is_visible_to_employees,
        color: type.color,
        requires_approval: type.requires_approval,
        approval_levels_required: type.approval_levels_required
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        name_ar: '',
        code: '',
        category: 'annual',
        description: '',
        max_days_per_year: 0,
        max_consecutive_days: 0,
        min_advance_days: 0,
        max_advance_days: 0,
        is_paid: true,
        is_accumulative: false,
        is_active: true,
        is_visible_to_employees: true,
        color: '#3B82F6',
        requires_approval: true,
        approval_levels_required: 1
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (editingType) {
        await api.put(`/leave/leave/types/${editingType.id}`, formData);
        setSuccess('Leave type updated successfully');
      } else {
        await api.post('/leave/leave/types', formData);
        setSuccess('Leave type created successfully');
      }

      setDialogOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error saving leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;

    try {
      await api.delete(`/leave/leave/types/${id}`);
      fetchLeaveTypes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error deleting leave type');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      await api.post('/leave/leave/seed-defaults');
      setSuccess('Default leave types created');
      fetchLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error seeding defaults');
    } finally {
      setLoading(false);
    }
  };

  if (loading && leaveTypes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {t('leave.settings.title', 'Leave Settings')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleSeedDefaults}
          >
            Seed Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#3B82F6' }}
          >
            Add Leave Type
          </Button>
        </Box>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="center">Max Days/Year</TableCell>
              <TableCell align="center">Max Consecutive</TableCell>
              <TableCell align="center">Paid</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="center">Visible</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">
                    No leave types configured
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 1 }}
                    onClick={handleSeedDefaults}
                  >
                    Create Default Types
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              leaveTypes.map((type) => (
                <TableRow key={type.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: type.color }} />
                      {type.code}
                    </Box>
                  </TableCell>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>
                    <Chip label={type.category} size="small" />
                  </TableCell>
                  <TableCell align="center">{type.max_days_per_year}</TableCell>
                  <TableCell align="center">{type.max_consecutive_days}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={type.is_paid ? 'Paid' : 'Unpaid'} 
                      size="small"
                      color={type.is_paid ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={type.is_active ? 'Active' : 'Inactive'} 
                      size="small"
                      color={type.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {type.is_visible_to_employees ? '✓' : '✗'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(type)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(type.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name (Arabic)"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={!!editingType}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Max Days/Year"
                value={formData.max_days_per_year}
                onChange={(e) => setFormData({ ...formData, max_days_per_year: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Max Consecutive"
                value={formData.max_consecutive_days}
                onChange={(e) => setFormData({ ...formData, max_consecutive_days: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Min Advance Days"
                value={formData.min_advance_days}
                onChange={(e) => setFormData({ ...formData, min_advance_days: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Approval Levels"
                value={formData.approval_levels_required}
                onChange={(e) => setFormData({ ...formData, approval_levels_required: Number(e.target.value) })}
                inputProps={{ min: 1, max: 3 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_paid}
                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  />
                }
                label="Paid Leave"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_accumulative}
                    onChange={(e) => setFormData({ ...formData, is_accumulative: e.target.checked })}
                  />
                }
                label="Accumulative"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_visible_to_employees}
                    onChange={(e) => setFormData({ ...formData, is_visible_to_employees: e.target.checked })}
                  />
                }
                label="Visible to Employees"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  />
                }
                label="Requires Approval"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.code}
            sx={{ bgcolor: '#3B82F6' }}
          >
            {saving ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
