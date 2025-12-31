import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Button, IconButton, TextField,
  MenuItem, Chip, Avatar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, InputAdornment, Grid, Card,
  CardContent, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, useTheme
} from '@mui/material';
import {
  Add, Search, Edit, Delete, Visibility, Person, Business,
  Email, Phone, FilterList, Refresh, CloudUpload
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

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (Array.isArray(res.data)) {
          setDepartments(res.data.map((d: any) => d.name));
        }
      } catch (error) {
        console.error("Failed to fetch departments", error);
      }
    };
    fetchDepartments();
  }, []);

  const statusOptions = [
    { value: 'active', label: t('Active'), color: 'success' },
    { value: 'inactive', label: t('Inactive'), color: 'error' },
    { value: 'probation', label: t('Probation'), color: 'warning' },
    { value: 'resigned', label: t('Resigned'), color: 'error' },
    { value: 'terminated', label: t('Terminated'), color: 'error' },
    { value: 'on_leave', label: t('On Leave'), color: 'info' }
  ];

  useEffect(() => {
    loadEmployees();
  }, [page, rowsPerPage, searchTerm, departmentFilter, statusFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/hr/employees?${params}`);
      setEmployees(response.data.employees || []);
      setTotalEmployees(response.data.total || 0);
      setActiveEmployees(response.data.active_total || 0);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    setPage(0);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
      await api.delete(`/hr/employees/${employeeToDelete.id}`);
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
        selectedEmployees.map(id => api.delete(`/hr/employees/${id}`))
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
    return (
      <Chip
        label={isActive ? t('Active').toUpperCase() : t(statusInfo?.label || status).toUpperCase()}
        color={isActive ? 'success' : (statusInfo?.color as any) || 'default'}
        size="small"
        variant={isActive ? 'filled' : 'outlined'}
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
      const res = await api.post('/employees/import', formData, {
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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {totalEmployees}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('Total Employees')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {activeEmployees}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('Active Employees')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <FilterList />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {departments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('Departments')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Refresh />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {new Set(employees.map(emp => emp.department).filter(Boolean)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('Active Departments')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.msg}
        </Alert>
      )}

      {uploading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={t('Search employees by name, email, or ID...')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
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
      <Paper elevation={0}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees(employees.map(emp => emp.id));
                      } else {
                        setSelectedEmployees([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{t('Employee')}</TableCell>
                <TableCell>{t('Company')}</TableCell>
                <TableCell>{t('Employee ID')}</TableCell>
                <TableCell>{t('Contact')}</TableCell>
                <TableCell>{t('Department')}</TableCell>
                <TableCell>{t('Position')}</TableCell>
                <TableCell>{t('Status')}</TableCell>
                <TableCell>{t('Hire Date')}</TableCell>
                <TableCell align="center">{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 40, height: 40 }}>
                        {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {employee.name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {employee.company || t('Not assigned')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {employee.employee_id || t('Not assigned')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 14 }} />
                        {employee.email}
                      </Typography>
                      {employee.phone && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone sx={{ fontSize: 14 }} />
                          {employee.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {employee.department || t('Not assigned')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {employee.position || t('Not assigned')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {getStatusChip(employee.status, employee.is_active)}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {employee.hire_date
                        ? new Date(employee.hire_date).toLocaleDateString(theme.direction === 'rtl' ? 'ar-EG' : 'en-US')
                        : t('Not set')
                      }
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewEmployee(employee.id)}
                        color="primary"
                        title={t('view')}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditEmployee(employee.id)}
                        color="info"
                        title={t('edit')}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(employee)}
                        color="error"
                        title={t('delete')}
                      >
                        <Delete />
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
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('Rows per page:')}
          labelDisplayedRows={({ from, to, count }) => 
            t('Showing {{start}} to {{end}} of {{total}} employees', { start: from, end: to, total: count })
          }
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