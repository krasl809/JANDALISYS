import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardContent, CardHeader, Typography, Grid, Box,
  Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  TextField, MenuItem, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
  IconButton, Switch, FormControlLabel, Alert, Autocomplete,
  List, ListItem, ListItemText, ListItemIcon, Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Group as GroupIcon,
  HowToReg as StepIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface ApprovalWorkflow {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
  priority: number;
  is_default: boolean;
  steps_count: number;
  employees_count: number;
}

interface ApprovalStep {
  id?: string;
  step_order: number;
  name: string;
  approver_type: string;
  approver_id?: string;
  approver_employee_id?: string;
  auto_assign: boolean;
  allow_delegation: boolean;
  is_active: boolean;
  approver_name?: string;
}

interface WorkflowEmployeeGroup {
  id?: string;
  employee_ids: string[];
  department_ids: string[];
  employee_levels: string[];
  is_active: boolean;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  name_ar?: string;
}

const APPROVER_TYPES = [
  { value: 'manager', label: 'Direct Manager' },
  { value: 'dept_head', label: 'Department Head' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'director', label: 'Director/CEO' },
  { value: 'custom', label: 'Custom Approver' },
  { value: 'employee', label: 'Specific Employee' }
];

const EMPLOYEE_LEVELS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' }
];

export default function ApprovalWorkflowSettings() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    is_active: true,
    priority: 0,
    is_default: false
  });

  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [employeeGroups, setEmployeeGroups] = useState<WorkflowEmployeeGroup[]>([]);

  // Data for dropdowns
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchWorkflows();
    fetchDropdowns();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leave/leave/workflows');
      setWorkflows(res.data);
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      // Fetch users
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);

      // Fetch employees from correct endpoint /hr/employees - handle both paginated and non-paginated responses
      const employeesRes = await api.get('/hr/employees', { params: { limit: 0 } });
      const employeesData = employeesRes.data.employees || employeesRes.data || [];
      setEmployees(employeesData);

      // Fetch departments
      const deptsRes = await api.get('/departments');
      const deptsData = deptsRes.data.departments || deptsRes.data || [];
      setDepartments(deptsData);
    } catch (err: any) {
      console.error('Error fetching dropdowns:', err);
    }
  };

  const handleOpenDialog = async (workflow?: ApprovalWorkflow) => {
    setError('');
    setSuccess('');
    
    if (workflow) {
      // Edit mode - fetch full workflow details
      setEditingWorkflow(workflow);
      setFormData({
        name: workflow.name,
        name_ar: workflow.name_ar || '',
        description: workflow.description || '',
        is_active: workflow.is_active,
        priority: workflow.priority,
        is_default: workflow.is_default
      });

      // Fetch steps
      try {
        const stepsRes = await api.get(`/leave/leave/workflows/${workflow.id}`);
        setSteps(stepsRes.data.steps || []);
        setEmployeeGroups(stepsRes.data.employee_groups || []);
      } catch (err) {
        console.error('Error fetching workflow details:', err);
      }
    } else {
      // Create mode
      setEditingWorkflow(null);
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        is_active: true,
        priority: 0,
        is_default: false
      });
      setSteps([]);
      setEmployeeGroups([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWorkflow(null);
    setSteps([]);
    setEmployeeGroups([]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const workflowData = {
        ...formData,
        steps: steps.map((s, idx) => ({
          ...s,
          step_order: idx + 1
        })),
        employee_groups: employeeGroups
      };

      if (editingWorkflow) {
        // Update existing
        await api.put(`/leave/leave/workflows/${editingWorkflow.id}`, workflowData);
        setSuccess('Workflow updated successfully');
      } else {
        // Create new
        await api.post('/leave/leave/workflows', workflowData);
        setSuccess('Workflow created successfully');
      }

      fetchWorkflows();
      setTimeout(handleCloseDialog, 1000);
    } catch (err: any) {
      console.error('Error saving workflow:', err);
      setError(err.response?.data?.detail || 'Error saving workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await api.delete(`/leave/leave/workflows/${workflowId}`);
      fetchWorkflows();
      setSuccess('Workflow deleted successfully');
    } catch (err: any) {
      console.error('Error deleting workflow:', err);
      setError(err.response?.data?.detail || 'Error deleting workflow');
    }
  };

  const addStep = () => {
    const newStep: ApprovalStep = {
      step_order: steps.length + 1,
      name: `Approval Step ${steps.length + 1}`,
      approver_type: 'manager',
      auto_assign: true,
      allow_delegation: false,
      is_active: true
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    // Reorder
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (index: number, field: keyof ApprovalStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const addEmployeeGroup = () => {
    const newGroup: WorkflowEmployeeGroup = {
      employee_ids: [],
      department_ids: [],
      employee_levels: [],
      is_active: true
    };
    setEmployeeGroups([...employeeGroups, newGroup]);
  };

  const removeEmployeeGroup = (index: number) => {
    const newGroups = [...employeeGroups];
    newGroups.splice(index, 1);
    setEmployeeGroups(newGroups);
  };

  const updateEmployeeGroup = (index: number, field: keyof WorkflowEmployeeGroup, value: any) => {
    const newGroups = [...employeeGroups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setEmployeeGroups(newGroups);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + (direction === 'up' ? -1 : 1)];
    newSteps[index + (direction === 'up' ? -1 : 1)] = temp;
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const getApproverName = (step: ApprovalStep) => {
    if (step.approver_type === 'custom' && step.approver_id) {
      const user = users.find(u => u.id === step.approver_id);
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown';
    }
    if (step.approver_type === 'employee' && step.approver_employee_id) {
      const emp = employees.find(e => e.id === step.approver_employee_id);
      return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
    }
    return APPROVER_TYPES.find(t => t.value === step.approver_type)?.label || step.approver_type;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              {t('approval_workflows', 'Approval Workflows')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              {t('add_workflow', 'Add Workflow')}
            </Button>
          </Box>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('name', 'Name')}</TableCell>
                    <TableCell>{t('description', 'Description')}</TableCell>
                    <TableCell>{t('steps', 'Steps')}</TableCell>
                    <TableCell>{t('employees', 'Employees')}</TableCell>
                    <TableCell>{t('priority', 'Priority')}</TableCell>
                    <TableCell>{t('default', 'Default')}</TableCell>
                    <TableCell>{t('status', 'Status')}</TableCell>
                    <TableCell align="center">{t('actions', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflows.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <Typography fontWeight="medium">{workflow.name}</Typography>
                        {workflow.name_ar && (
                          <Typography variant="caption" color="text.secondary">
                            {workflow.name_ar}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{workflow.description || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          icon={<StepIcon />} 
                          label={workflow.steps_count} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={<GroupIcon />} 
                          label={workflow.employees_count} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{workflow.priority}</TableCell>
                      <TableCell>
                        {workflow.is_default && (
                          <Chip label={t('default', 'Default')} size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={workflow.is_active ? t('active', 'Active') : t('inactive', 'Inactive')} 
                          size="small" 
                          color={workflow.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleOpenDialog(workflow)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(workflow.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {t('no_workflows', 'No approval workflows found')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWorkflow ? t('edit_workflow', 'Edit Workflow') : t('create_workflow', 'Create Workflow')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('workflow_name', 'Workflow Name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('workflow_name_ar', 'Workflow Name (Arabic)')}
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('description', 'Description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('priority', 'Priority')}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label={t('active', 'Active')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                  }
                  label={t('default_workflow', 'Default Workflow')}
                />
              </Grid>
            </Grid>

            {/* Approval Steps */}
            <Box sx={{ mt: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {t('approval_steps', 'Approval Steps')}
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addStep}>
                  {t('add_step', 'Add Step')}
                </Button>
              </Box>

              {steps.map((step, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={1}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <IconButton size="small" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption">{index + 1}</Typography>
                        <IconButton size="small" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                    <Grid item xs={11}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t('step_name', 'Step Name')}
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label={t('approver_type', 'Approver Type')}
                            value={step.approver_type}
                            onChange={(e) => updateStep(index, 'approver_type', e.target.value)}
                          >
                            {APPROVER_TYPES.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        {step.approver_type === 'custom' && (
                          <Grid item xs={12} sm={3}>
                            <Autocomplete
                              size="small"
                              options={users}
                              getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                              value={users.find(u => u.id === step.approver_id) || null}
                              onChange={(_, value) => updateStep(index, 'approver_id', value?.id || null)}
                              renderInput={(params) => (
                                <TextField {...params} label={t('select_approver', 'Select Approver')} />
                              )}
                            />
                          </Grid>
                        )}
                        {step.approver_type === 'employee' && (
                          <Grid item xs={12} sm={3}>
                            <Autocomplete
                              size="small"
                              options={employees}
                              getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.code})`}
                              value={employees.find(e => e.id === step.approver_employee_id) || null}
                              onChange={(_, value) => updateStep(index, 'approver_employee_id', value?.id || null)}
                              renderInput={(params) => (
                                <TextField {...params} label={t('select_employee', 'Select Employee')} />
                              )}
                            />
                          </Grid>
                        )}
                        <Grid item xs={12} sm={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={step.auto_assign}
                                onChange={(e) => updateStep(index, 'auto_assign', e.target.checked)}
                              />
                            }
                            label={t('auto_assign', 'Auto Assign')}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <IconButton color="error" onClick={() => removeStep(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                      <Typography variant="caption" color="text.secondary">
                        {t('current_approver', 'Current Approver')}: {getApproverName(step)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              {steps.length === 0 && (
                <Alert severity="info">
                  {t('no_steps', 'No approval steps defined. Click "Add Step" to add one.')}
                </Alert>
              )}
            </Box>

            {/* Employee Groups */}
            <Box sx={{ mt: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {t('employee_groups', 'Employee Groups')}
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addEmployeeGroup}>
                  {t('add_group', 'Add Group')}
                </Button>
              </Box>

              {employeeGroups.map((group, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('group', 'Group')} {index + 1}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={employees}
                        getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.code})`}
                        value={employees.filter(e => group.employee_ids.includes(e.id))}
                        onChange={(_, value) => updateEmployeeGroup(index, 'employee_ids', value.map(v => v.id))}
                        renderInput={(params) => (
                          <TextField {...params} label={t('employees', 'Employees')} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={departments}
                        getOptionLabel={(option) => option.name}
                        value={departments.filter(d => group.department_ids.includes(d.id))}
                        onChange={(_, value) => updateEmployeeGroup(index, 'department_ids', value.map(v => v.id))}
                        renderInput={(params) => (
                          <TextField {...params} label={t('departments', 'Departments')} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={EMPLOYEE_LEVELS}
                        getOptionLabel={(option) => option.label}
                        value={EMPLOYEE_LEVELS.filter(l => group.employee_levels.includes(l.value))}
                        onChange={(_, value) => updateEmployeeGroup(index, 'employee_levels', value.map(v => v.value))}
                        renderInput={(params) => (
                          <TextField {...params} label={t('employee_levels', 'Employee Levels')} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <IconButton color="error" onClick={() => removeEmployeeGroup(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              {employeeGroups.length === 0 && (
                <Alert severity="info">
                  {t('no_groups', 'No employee groups defined. Employees will use the default workflow.')}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel', 'Cancel')}</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving || !formData.name}
          >
            {saving ? <CircularProgress size={20} /> : t('save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
