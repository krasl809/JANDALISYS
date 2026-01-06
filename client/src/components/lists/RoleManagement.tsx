import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
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
  CardContent
} from '@mui/material';
import { useConfirm } from '../../context/ConfirmContext';
import { Add, Edit, Delete, Security, People } from '@mui/icons-material';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  // Additional fields that might be returned
  department?: string;
  position?: string;
  employee_id?: string;
  is_active?: boolean;
}

const RoleManagement: React.FC = () => {
  const { t } = useTranslation();
  const { alert } = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false); // New state for Add User dialog
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: '' }); // New state for new user data
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const archivePermissions = [
    'archive_read',
    'archive_upload',
    'archive_download',
    'archive_delete',
    'archive_write'
  ];

  const departmentPermissions = [
    'view_dashboard',
    'read_contracts',
    'read_pricing',
    'read_payments',
    'view_reports',
    'view_inventory',
    'view_hr',
    'view_settings'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [rolesRes, usersRes] = await Promise.all([
          api.get('rbac/roles'),
          api.get('hr/employees')
        ]);
      setRoles(rolesRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorLoadingData'));
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await api.post('rbac/roles', {
        name: newRole.name,
        description: newRole.description,
        permissions: selectedPermissions
      });
      setRoles([...roles, response.data]);
      setOpenDialog(false);
      setNewRole({ name: '', description: '' });
      setSelectedPermissions([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorCreatingRole'));
    }
  };

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      await api.post('rbac/assign-role', { user_id: userId, role_name: roleName });
      setUsers(users.map(u => u.id === userId ? { ...u, role: roleName } : u));
      alert(t('roleAssignedSuccessfully'), t('Success'), 'success');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errorAssigningRole'));
    }
  };

  // New function to handle adding a new user
  const handleAddUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.password || !newUserData.role) {
      setError(t('fillRequiredFields'));
      return;
    }
    try {
      const response = await api.post('auth/register', newUserData);
      setUsers([...users, { ...response.data, role: newUserData.role }]); // Assuming response.data contains user details, add role from newUserData
      setOpenAddUserDialog(false);
      setNewUserData({ name: '', email: '', password: '', role: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding user:', err);
      setError(err.response?.data?.detail || t('errorAddingUser'));
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Security color="primary" />
        {t('roleManagement')}
      </Typography>

      {/* محتوى الصفحة */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* بطاقة إدارة الأدوار */}
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('roles')}</Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
              >
                {t('addRole')}
              </Button>
            </Box>

            {/* New section for User Management */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 4 }}>
              <Typography variant="h6">{t('users')}</Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={() => setOpenAddUserDialog(true)}
              >
                {t('addUser')}
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('roleName')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('description')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('permissions')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell>
                        <Chip 
                          label={role.name} 
                          color={
                            role.name === 'admin' ? 'error' : 
                            role.name === 'pricing_manager' ? 'warning' : 
                            'primary'
                          }
                        />
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(role.permissions ?? []).slice(0, 3).map(perm => (
                            <Chip key={perm} label={perm} size="small" variant="outlined" />
                          ))}
                          {(role.permissions ?? []).length > 3 && (
                            <Chip label={`+${role.permissions.length - 3}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error">
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

        {/* بطاقة تعيين الأدوار للمستخدمين */}
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <People color="primary" />
              {t('userRoleAssignment')}
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('user')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('currentRole')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('assignRole')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>{t('selectRole')}</InputLabel>
                          <Select
                            value=""
                            label={t('selectRole')}
                            onChange={(e) => handleAssignRole(user.id, e.target.value)}
                          >
                            {roles.map(role => (
                              <MenuItem key={role.id} value={role.name}>
                                {role.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* نافذة إنشاء دور جديد */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('createNewRole')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label={t('roleName')}
              value={newRole.name}
              onChange={(e) => setNewRole({...newRole, name: e.target.value})}
              fullWidth
            />
            <TextField
              label={t('description')}
              value={newRole.description}
              onChange={(e) => setNewRole({...newRole, description: e.target.value})}
              fullWidth
              multiline
              rows={2}
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>{t('Archive Permissions')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {archivePermissions.map(perm => (
                <Chip
                  key={perm}
                  label={t(perm)}
                  clickable
                  color={selectedPermissions.includes(perm) ? 'secondary' : 'default'}
                  onClick={() => {
                    setSelectedPermissions(prev =>
                      prev.includes(perm) 
                        ? prev.filter(p => p !== perm)
                        : [...prev, perm]
                    );
                  }}
                />
              ))}
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>{t('Departmental Access')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {departmentPermissions.map(perm => (
                <Chip
                  key={perm}
                  label={t(perm)}
                  clickable
                  color={selectedPermissions.includes(perm) ? 'success' : 'default'}
                  onClick={() => {
                    setSelectedPermissions(prev =>
                      prev.includes(perm) 
                        ? prev.filter(p => p !== perm)
                        : [...prev, perm]
                    );
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('cancel')}</Button>
          <Button onClick={handleCreateRole} variant="contained">{t('create')}</Button>
        </DialogActions>
      </Dialog>

      {/* New Dialog for Add New User */}
      <Dialog open={openAddUserDialog} onClose={() => setOpenAddUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addNewUser')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label={t('userName')}
              value={newUserData.name}
              onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
              fullWidth
            />
            <TextField
              label={t('userEmail')}
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
              fullWidth
            />
            <TextField
              label={t('userPassword')}
              type="password"
              value={newUserData.password}
              onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>{t('userRole')}</InputLabel>
              <Select
                value={newUserData.role}
                label={t('userRole')}
                onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
              >
                {roles.map(role => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddUserDialog(false)}>{t('cancel')}</Button>
          <Button onClick={handleAddUser} variant="contained">{t('addUser')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleManagement;