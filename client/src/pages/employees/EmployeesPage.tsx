import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Button, IconButton, TextField,
  MenuItem, Chip, Avatar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, InputAdornment, Grid,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, useTheme, Checkbox, alpha
} from '@mui/material';
import {
  Add, Search, Edit, Delete, Visibility, Person, Business,
  FilterList, Refresh, CloudUpload
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import api from '../../services/api';
import BackButton from '../../components/common/BackButton';

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  company?: string;
  department?: string;
  position?: string;
  status: string;
  hire_date?: string;
  phone?: string;
  is_active: boolean;
}

const EmployeesPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<string[]>([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('departments');
      if (Array.isArray(res.data)) {
        setDepartments(res.data.map((d: any) => d.name));
      }
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const statusOptions = useMemo(() => [
    { value: 'active', label: t('Active'), color: 'success' },
    { value: 'inactive', label: t('Inactive'), color: 'error' },
    { value: 'probation', label: t('Probation'), color: 'warning' },
    { value: 'resigned', label: t('Resigned'), color: 'error' },
    { value: 'terminated', label: t('Terminated'), color: 'error' },
    { value: 'on_leave', label: t('On Leave'), color: 'info' }
  ], [t]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`hr/employees?${params}`);
      setEmployees(response.data.employees || []);
      setTotalEmployees(response.data.total || 0);
      setActiveEmployees(response.data.active_total || 0);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, departmentFilter, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(0);
  }, []);

  const handleDepartmentFilter = useCallback((value: string) => {
    setDepartmentFilter(value);
    setPage(0);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(0);
  }, []);

  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleEditEmployee = (employeeId: string) => {
    navigate(`/employees/edit/${employeeId}`);
  };

  const handleViewEmployee = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      await api.delete(`hr/employees/${employeeToDelete.id}`);
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
      setTotalEmployees(prev => prev - 1);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedEmployees.map(id => api.delete(`hr/employees/${id}`))
      );
      setEmployees(employees.filter(emp => !selectedEmployees.includes(emp.id)));
      setTotalEmployees(prev => prev - selectedEmployees.length);
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Failed to delete employees:', error);
    }
  };

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
  };

  const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
  };

  const getStatusChip = (status: string, isActive: boolean) => {
    const statusInfo = statusOptions.find(opt => opt.value === status);
    
    const getStatusColor = (status: string) => {
      switch(status) {
        case 'active': return COLORS.success;
        case 'probation': return COLORS.warning;
        case 'inactive':
        case 'resigned':
        case 'terminated': return COLORS.error;
        case 'on_leave': return COLORS.info;
        default: return COLORS.secondary;
      }
    };

    const color = getStatusColor(status);

    return (
      <Chip
        label={isActive ? t('Active').toUpperCase() : t(statusInfo?.label || status).toUpperCase()}
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
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setFeedback(null);

    try {
      const res = await api.post('employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFeedback({
        type: 'success',
        msg: t('Import successful') + `: ${res.data.imported_count}` + (res.data.errors.length > 0 ? ` Errors: ${res.data.errors.length}` : '')
      });
      loadEmployees();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        msg: error.response?.data?.detail || t('Import failed')
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && employees.length === 0) {
    return (
      <Box sx={{ bgcolor: COLORS.bg, minHeight: '100vh', pt: 4 }}>
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress sx={{ color: COLORS.primary }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <BackButton />
            <Box>
              <Typography variant="h4" fontWeight="700" color={COLORS.dark} sx={{ fontFamily: 'Roboto' }}>
                {t('Employee Management')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                {t('Manage employee records, profiles, and system access')}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx"
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/hr/employees/import')}
              sx={{ 
                borderRadius: '8px', 
                borderColor: COLORS.secondary, 
                color: COLORS.secondary,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: COLORS.dark, color: COLORS.dark }
              }}
            >
              {t('Advanced Import')}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/employees/add')}
              sx={{ 
                minWidth: 140, 
                borderRadius: '8px', 
                bgcolor: COLORS.primary,
                boxShadow: SHADOWS.sm,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: COLORS.primary, boxShadow: SHADOWS.md }
              }}
            >
              {t('Add Employee')}
            </Button>
          </Box>
        </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: t('Total Employees'), value: totalEmployees, icon: <Person />, gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)' },
          { title: t('Active Employees'), value: activeEmployees, icon: <Business />, gradient: 'linear-gradient(135deg, #2DCE89 0%, #2DCECC 100%)' },
          { title: t('Departments'), value: departments.length, icon: <FilterList />, gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)' },
          { title: t('Active Departments'), value: new Set(employees.map(emp => emp.department).filter(Boolean)).size, icon: <Refresh />, gradient: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)' }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                background: stat.gradient,
                color: COLORS.white,
                boxShadow: SHADOWS.md,
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: SHADOWS.lg,
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: COLORS.white,
                }}
              >
                {React.cloneElement(stat.icon as React.ReactElement, { fontSize: 'medium' })}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="700" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, fontSize: '0.85rem' }}>
                  {stat.title}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {feedback && (
        <Alert 
          severity={feedback.type} 
          sx={{ mb: 3, borderRadius: '8px', boxShadow: SHADOWS.xs }} 
          onClose={() => setFeedback(null)}
        >
          {feedback.msg}
        </Alert>
      )}

      {uploading && <LinearProgress sx={{ mb: 3, borderRadius: 2, height: 6, bgcolor: COLORS.light, '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary } }} />}

      {/* Filters */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: '12px',
          bgcolor: COLORS.white,
          boxShadow: SHADOWS.sm,
          border: 'none'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={t('Search employees by name, email, or ID...')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: COLORS.secondary }} fontSize="small" />
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: '8px',
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: '#e9ecef' },
                  '&:hover fieldset': { borderColor: COLORS.primary },
                }
              }}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label={t('Department')}
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilter(e.target.value)}
              size="small"
              InputProps={{ 
                sx: { 
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#e9ecef' }
                } 
              }}
            >
              <MenuItem value="">{t('All Departments')}</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label={t('Status')}
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              size="small"
              InputProps={{ 
                sx: { 
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#e9ecef' }
                } 
              }}
            >
              <MenuItem value="">{t('All Statuses')}</MenuItem>
              {statusOptions.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              startIcon={<FilterList />}
              sx={{ 
                borderRadius: '8px', 
                height: 40,
                borderColor: COLORS.light,
                color: COLORS.secondary,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: COLORS.secondary,
                  bgcolor: COLORS.light
                }
              }}
            >
              {t('Clear Filters')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            borderRadius: '8px',
            bgcolor: alpha(COLORS.info, 0.1),
            color: COLORS.dark,
            border: 'none',
            boxShadow: SHADOWS.xs,
            '& .MuiAlert-icon': { color: COLORS.info }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="body2" fontWeight="600">
              {t('{{count}} employee(s) selected.', { count: selectedEmployees.length })}
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={handleBulkDelete}
              startIcon={<Delete />}
              sx={{ 
                ml: 2,
                bgcolor: COLORS.error,
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: COLORS.error, opacity: 0.9 }
              }}
            >
              {t('Delete Selected')}
            </Button>
          </Box>
        </Alert>
      )}

      {/* Employees Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: COLORS.white,
          boxShadow: SHADOWS.sm,
          border: 'none'
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: COLORS.bg }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < employees.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees(employees.map(emp => emp.id));
                      } else {
                        setSelectedEmployees([]);
                      }
                    }}
                    sx={{ color: COLORS.secondary, '&.Mui-checked': { color: COLORS.primary } }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('Employee')}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('ID')}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('Department')}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('Position')}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('Status')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: COLORS.secondary, py: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow 
                  key={employee.id} 
                  hover
                  sx={{ 
                    '&:hover': { bgcolor: alpha(COLORS.primary, 0.04) },
                    transition: 'background-color 0.2s',
                    '& td': { py: 1.5, borderBottom: '1px solid #f0f2f5' }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, employee.id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                        }
                      }}
                      sx={{ color: COLORS.secondary, '&.Mui-checked': { color: COLORS.primary } }}
                    />
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ 
                        width: 36, 
                        height: 36, 
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        bgcolor: alpha(COLORS.primary, 0.1),
                        color: COLORS.primary,
                        border: 'none'
                      }}>
                        {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="700" color={COLORS.dark} sx={{ fontSize: '0.85rem' }}>
                          {employee.name}
                        </Typography>
                        <Typography variant="caption" color={COLORS.secondary} sx={{ fontSize: '0.75rem' }}>
                          {employee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: COLORS.secondary, fontWeight: 600 }}>
                      {employee.employee_id || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: COLORS.dark, fontWeight: 500 }}>
                      {employee.department || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: COLORS.dark, fontWeight: 500 }}>
                      {employee.position || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {getStatusChip(employee.status, employee.is_active)}
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewEmployee(employee.id)}
                        sx={{ color: COLORS.secondary, '&:hover': { color: COLORS.primary, bgcolor: alpha(COLORS.primary, 0.1) } }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditEmployee(employee.id)}
                        sx={{ color: COLORS.secondary, '&:hover': { color: COLORS.info, bgcolor: alpha(COLORS.info, 0.1) } }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(employee)}
                        sx={{ color: COLORS.secondary, '&:hover': { color: COLORS.error, bgcolor: alpha(COLORS.error, 0.1) } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalEmployees}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('Rows per page')}
          sx={{ 
            borderTop: '1px solid #f0f2f5',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: COLORS.secondary,
              fontSize: '0.75rem',
              fontWeight: 600
            }
          }}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: COLORS.dark }}>{t('Delete Employee')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: COLORS.secondary }}>
            {t('Are you sure you want to delete employee "{{name}}"?', { name: employeeToDelete?.name })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: COLORS.secondary, textTransform: 'none', fontWeight: 600 }}
          >
            {t('Cancel')}
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            sx={{ 
              bgcolor: COLORS.error, 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 600,
              boxShadow: SHADOWS.xs,
              '&:hover': { bgcolor: COLORS.error, boxShadow: SHADOWS.sm }
            }}
          >
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default EmployeesPage;