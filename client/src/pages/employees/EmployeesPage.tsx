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

  const getStatusChip = (status: string, isActive: boolean) => {
    const statusInfo = statusOptions.find(opt => opt.value === status);
    
    // Using Monday colors from theme
    const getMondayColor = (status: string) => {
      switch(status) {
        case 'active': return theme.palette.success.main;
        case 'probation': return theme.palette.warning.main;
        case 'inactive':
        case 'resigned':
        case 'terminated': return theme.palette.error.main;
        case 'on_leave': return theme.palette.info.main;
        default: return theme.palette.grey[500];
      }
    };

    const color = getMondayColor(status);

    return (
      <Chip
        label={isActive ? t('Active').toUpperCase() : t(statusInfo?.label || status).toUpperCase()}
        sx={{
          borderRadius: '4px',
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
      <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <BackButton />
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              {t('Employee Management')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
          >
            {t('Advanced Import')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={handleImportClick}
            disabled={uploading}
          >
            {uploading ? t('Importing...') : t('Quick Import')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/employees/add')}
            sx={{ minWidth: 140 }}
          >
            {t('Add Employee')}
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: t('Total Employees'), value: totalEmployees, icon: <Person />, color: theme.palette.primary.main },
          { title: t('Active Employees'), value: activeEmployees, icon: <Business />, color: theme.palette.success.main },
          { title: t('Departments'), value: departments.length, icon: <FilterList />, color: theme.palette.secondary.main },
          { title: t('Active Departments'), value: new Set(employees.map(emp => emp.department).filter(Boolean)).size, icon: <Refresh />, color: theme.palette.info.main }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: stat.color,
                  boxShadow: `0 4px 12px ${alpha(stat.color, 0.08)}`,
                  transform: 'translateY(-2px)',
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: alpha(stat.color as string, 0.1),
                  color: stat.color,
                }}
              >
                {React.cloneElement(stat.icon as React.ReactElement, { fontSize: 'small' })}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="500">
                  {stat.title}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.msg}
        </Alert>
      )}

      {uploading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filters */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 2,
          bgcolor: 'background.paper'
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
                    <Search color="action" fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
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
              InputProps={{ sx: { borderRadius: 2 } }}
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
              InputProps={{ sx: { borderRadius: 2 } }}
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
              sx={{ borderRadius: 2, height: 40 }}
            >
              {t('Clear Filters')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('{{count}} employee(s) selected.', { count: selectedEmployees.length })}
            <Button
              size="small"
              onClick={handleBulkDelete}
              sx={{ ml: 2 }}
            >
              {t('Delete Selected')}
            </Button>
          </Typography>
        </Alert>
      )}

      {/* Employees Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'light' ? '#F5F6F8' : 'rgba(255,255,255,0.02)' }}>
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
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('Employee')}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('ID')}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('Department')}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('Position')}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('Status')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow 
                  key={employee.id} 
                  hover
                  sx={{ 
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                    transition: 'background-color 0.2s'
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
                    />
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        fontSize: '0.875rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                      }}>
                        {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
                          {employee.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {employee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {employee.employee_id || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {employee.department || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {employee.position || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {getStatusChip(employee.status, employee.is_active)}
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewEmployee(employee.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditEmployee(employee.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05) } }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(employee)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) } }}
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
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('Delete Employee')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('Are you sure you want to delete employee "{{name}}"?', { name: employeeToDelete?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('Cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">{t('Delete')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeesPage;