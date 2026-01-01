import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  Card,
  CardContent,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Business,
  Work,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Badge
} from '@mui/icons-material';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  hire_date?: string;
  employee_id?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  language?: string;
  manager_id?: string;
  // HR fields from EmployeePersonalInfo
  company?: string;
  personal_email?: string;
  personal_phone?: string;
  mobile_primary?: string;
  mobile_secondary?: string;
  date_of_birth?: string;
  nationality?: string;
  gender?: string;
  national_id?: string;
  passport_number?: string;
  passport_expiry?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  marital_status?: string;
  spouse_name?: string;
  spouse_employment?: string;
  number_of_children?: number;
  blood_type?: string;
  medical_conditions?: string;
  allergies?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Position {
  id: string;
  title: string;
  department_id: string;
  level?: string;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<string[]>(['admin', 'manager', 'finance', 'user', 'viewer']);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    position: '',
    hire_date: '',
    employee_id: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, deptsRes, posRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/departments'),
        api.get('/positions')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data || []);
      setPositions(posRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorLoadingData'));
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      setError(t('fillRequiredFields'));
      return;
    }
    try {
      const response = await api.post('/auth/register', newUser);
      setUsers([...users, response.data]);
      setOpenDialog(false);
      resetForm();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorCreatingUser'));
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await api.put(`/hr/employees/${editingUser.id}`, editingUser);
      setUsers(users.map(u => u.id === editingUser.id ? response.data : u));
      setOpenDialog(false);
      setEditingUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorUpdatingUser'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('confirmDeleteUser'))) return;
    try {
      await api.delete(`/hr/employees`, { data: [userId] });
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorDeletingUser'));
    }
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
      position: '',
      hire_date: '',
      employee_id: '',
      phone: '',
      address: ''
    });
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'finance': return 'success';
      case 'user': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Person color="primary" />
        {t('userManagement')}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={t('allUsers')} />
          <Tab label={t('byDepartment')} />
          <Tab label={t('byRole')} />
        </Tabs>
      </Box>

      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('users')}</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              {t('addUser')}
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('user')}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('role')}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('department')}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('position')}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('status')}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          {user.employee_id && (
                            <Typography variant="caption" color="text.secondary">
                              <Badge sx={{ fontSize: 12, mr: 0.5 }} />
                              {user.employee_id}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business fontSize="small" color="action" />
                        {user.department || t('notAssigned')}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Work fontSize="small" color="action" />
                        {user.position || t('notAssigned')}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? t('active') : t('inactive')}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => openEditDialog(user)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={openDialog} onClose={() => { setOpenDialog(false); setEditingUser(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? t('editUser') : t('addNewUser')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('fullName')}
                value={editingUser?.name || newUser.name}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, name: e.target.value})
                  : setNewUser({...newUser, name: e.target.value})
                }
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('email')}
                type="email"
                value={editingUser?.email || newUser.email}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, email: e.target.value})
                  : setNewUser({...newUser, email: e.target.value})
                }
                fullWidth
                required
              />
            </Grid>
            {!editingUser && (
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('password')}
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  fullWidth
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('role')}</InputLabel>
                <Select
                  value={editingUser?.role || newUser.role}
                  label={t('role')}
                  onChange={(e) => editingUser
                    ? setEditingUser({...editingUser, role: e.target.value})
                    : setNewUser({...newUser, role: e.target.value})
                  }
                >
                  {roles.map(role => (
                    <MenuItem key={role} value={role}>
                      {t(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('department')}</InputLabel>
                <Select
                  value={editingUser?.department || newUser.department}
                  label={t('department')}
                  onChange={(e) => editingUser
                    ? setEditingUser({...editingUser, department: e.target.value})
                    : setNewUser({...newUser, department: e.target.value})
                  }
                >
                  <MenuItem value="">{t('selectDepartment')}</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('position')}</InputLabel>
                <Select
                  value={editingUser?.position || newUser.position}
                  label={t('position')}
                  onChange={(e) => editingUser
                    ? setEditingUser({...editingUser, position: e.target.value})
                    : setNewUser({...newUser, position: e.target.value})
                  }
                >
                  <MenuItem value="">{t('selectPosition')}</MenuItem>
                  {positions.map(pos => (
                    <MenuItem key={pos.id} value={pos.title}>
                      {pos.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('employeeId')}
                value={editingUser?.employee_id || newUser.employee_id}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, employee_id: e.target.value})
                  : setNewUser({...newUser, employee_id: e.target.value})
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('hireDate')}
                type="date"
                value={editingUser?.hire_date || newUser.hire_date}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, hire_date: e.target.value})
                  : setNewUser({...newUser, hire_date: e.target.value})
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('phone')}
                value={editingUser?.phone || newUser.phone}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, phone: e.target.value})
                  : setNewUser({...newUser, phone: e.target.value})
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('address')}
                value={editingUser?.address || newUser.address}
                onChange={(e) => editingUser
                  ? setEditingUser({...editingUser, address: e.target.value})
                  : setNewUser({...newUser, address: e.target.value})
                }
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDialog(false); setEditingUser(null); }}>
            {t('cancel')}
          </Button>
          <Button
            onClick={editingUser ? handleUpdateUser : handleCreateUser}
            variant="contained"
          >
            {editingUser ? t('update') : t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;