import React from 'react';
import {
  Card, CardContent, Grid, TextField, Typography, Box, FormControlLabel,
  Checkbox, Switch, FormControl, FormLabel, RadioGroup, Radio,
  Alert, Chip, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Security, AdminPanelSettings, Business, Description, Inventory, 
  AccountBalance, Assessment, Lock, PersonAdd, Visibility, Edit
} from '@mui/icons-material';

interface SystemAccessSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  onNestedInputChange: (parent: string, field: string, value: any) => void;
}

const SystemAccessSection: React.FC<SystemAccessSectionProps> = ({
  formData,
  onInputChange,
  onNestedInputChange
}) => {
  const handleSystemAccessChange = (field: string, value: any) => {
    onNestedInputChange('system_access', field, value);
  };

  const handleRoleChange = (role: string) => {
    // Auto-assign permissions based on role
    const rolePermissions = getRolePermissions(role);
    handleSystemAccessChange('system_role', role);
    handleSystemAccessChange('permissions', JSON.stringify(rolePermissions.permissions));
    
    // Set access flags
    handleSystemAccessChange('can_access_hr', rolePermissions.can_access_hr);
    handleSystemAccessChange('can_access_finance', rolePermissions.can_access_finance);
    handleSystemAccessChange('can_access_inventory', rolePermissions.can_access_inventory);
    handleSystemAccessChange('can_access_contracts', rolePermissions.can_access_contracts);
    handleSystemAccessChange('can_access_reports', rolePermissions.can_access_reports);
  };

  const getRolePermissions = (role: string) => {
    const roles = {
      admin: {
        permissions: [
          'view_dashboard', 'view_reports', 'view_inventory', 'view_settings', 'view_hr',
          'read_contracts', 'write_contracts', 'post_contracts', 'delete_contracts',
          'manage_users', 'approve_pricing', 'manage_draft_status', 'price_contracts',
          'read_pricing', 'read_payments', 'manage_hr', 'manage_employees',
          'view_financial_data', 'manage_financial_transactions'
        ],
        can_access_hr: true,
        can_access_finance: true,
        can_access_inventory: true,
        can_access_contracts: true,
        can_access_reports: true
      },
      hr_manager: {
        permissions: [
          'view_hr', 'manage_hr', 'view_dashboard', 'view_reports',
          'manage_employees', 'view_employee_details', 'edit_employee_info'
        ],
        can_access_hr: true,
        can_access_finance: false,
        can_access_inventory: false,
        can_access_contracts: false,
        can_access_reports: true
      },
      finance_manager: {
        permissions: [
          'view_dashboard', 'view_reports', 'view_financial_data',
          'read_contracts', 'post_contracts', 'price_contracts', 'review_pricing',
          'read_pricing', 'read_payments', 'manage_financial_transactions'
        ],
        can_access_hr: false,
        can_access_finance: true,
        can_access_inventory: false,
        can_access_contracts: true,
        can_access_reports: true
      },
      manager: {
        permissions: [
          'view_dashboard', 'view_reports', 'view_inventory',
          'read_contracts', 'write_contracts', 'post_contracts',
          'read_pricing', 'read_payments', 'view_employee_details'
        ],
        can_access_hr: false,
        can_access_finance: false,
        can_access_inventory: true,
        can_access_contracts: true,
        can_access_reports: true
      },
      employee: {
        permissions: [
          'view_dashboard', 'view_inventory',
          'read_contracts', 'write_contracts'
        ],
        can_access_hr: false,
        can_access_finance: false,
        can_access_inventory: true,
        can_access_contracts: true,
        can_access_reports: false
      },
      viewer: {
        permissions: [
          'view_dashboard', 'read_contracts'
        ],
        can_access_hr: false,
        can_access_finance: false,
        can_access_inventory: false,
        can_access_contracts: true,
        can_access_reports: false
      }
    };

    return roles[role as keyof typeof roles] || roles.employee;
  };

  const systemRoles = [
    { value: 'admin', label: 'System Administrator', description: 'Full system access' },
    { value: 'hr_manager', label: 'HR Manager', description: 'HR management and employee data' },
    { value: 'finance_manager', label: 'Finance Manager', description: 'Financial data and contracts' },
    { value: 'manager', label: 'Manager', description: 'Department management and contracts' },
    { value: 'employee', label: 'Employee', description: 'Basic employee access' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
  ];

  const getSelectedRoleInfo = () => {
    return systemRoles.find(role => role.value === formData.system_access?.system_role) || null;
  };

  const selectedRole = getSelectedRoleInfo();

  return (
    <Grid container spacing={3}>
      {/* System Role Selection */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'primary.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'primary.light', 
                opacity: 0.1 
              }}>
                <AdminPanelSettings />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                System Role & Permissions
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Select a system role to automatically assign appropriate permissions. You can customize permissions after selecting a role.
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              {systemRoles.map((role) => (
                <Grid item xs={12} md={6} key={role.value}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      border: formData.system_access?.system_role === role.value ? '2px solid' : '1px solid',
                      borderColor: formData.system_access?.system_role === role.value ? 'primary.main' : 'divider',
                      bgcolor: formData.system_access?.system_role === role.value ? 'action.selected' : 'background.paper'
                    }}
                    onClick={() => handleRoleChange(role.value)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Security color={formData.system_access?.system_role === role.value ? 'primary' : 'inherit'} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          {role.label}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {role.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {selectedRole && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Selected Role: {selectedRole.label}
                  </Typography>
                  <Chip label="Active" color="primary" size="small" />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Module Access */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'secondary.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'secondary.light', 
                opacity: 0.1 
              }}>
                <Business />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Module Access Control
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Business color="primary" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        HR Management
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.system_access?.can_access_hr || false}
                          onChange={(e) => handleSystemAccessChange('can_access_hr', e.target.checked)}
                          disabled={!formData.system_access?.system_role}
                        />
                      }
                      label="Allow access to HR module"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Employee management, attendance, payroll
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <AccountBalance color="success" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Finance
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.system_access?.can_access_finance || false}
                          onChange={(e) => handleSystemAccessChange('can_access_finance', e.target.checked)}
                          disabled={!formData.system_access?.system_role}
                        />
                      }
                      label="Allow access to Finance module"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Financial transactions, payments, pricing
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Inventory color="warning" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Inventory
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.system_access?.can_access_inventory || false}
                          onChange={(e) => handleSystemAccessChange('can_access_inventory', e.target.checked)}
                          disabled={!formData.system_access?.system_role}
                        />
                      }
                      label="Allow access to Inventory module"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Stock management, warehouses, delivery notes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Description color="info" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Contracts
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.system_access?.can_access_contracts || false}
                          onChange={(e) => handleSystemAccessChange('can_access_contracts', e.target.checked)}
                          disabled={!formData.system_access?.system_role}
                        />
                      }
                      label="Allow access to Contracts module"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Contract creation, editing, approval
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Assessment color="secondary" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Reports & Analytics
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.system_access?.can_access_reports || false}
                          onChange={(e) => handleSystemAccessChange('can_access_reports', e.target.checked)}
                          disabled={!formData.system_access?.system_role}
                        />
                      }
                      label="Allow access to Reports module"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Dashboards, analytics, data export
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Permissions */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'warning.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'warning.light', 
                opacity: 0.1 
              }}>
                <Lock />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Detailed Permissions
              </Typography>
            </Box>

            {formData.system_access?.permissions ? (
              <List>
                {JSON.parse(formData.system_access.permissions).map((permission: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Lock fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={formatPermissionName(permission)}
                      secondary={getPermissionDescription(permission)}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  Select a system role to view detailed permissions.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Additional Security Settings */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'error.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'error.light', 
                opacity: 0.1 
              }}>
                <PersonAdd />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Account Security Settings
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active !== false}
                      onChange={(e) => onInputChange('is_active', e.target.checked)}
                    />
                  }
                  label="Account Active"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Enable or disable account access
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.system_access?.is_active !== false}
                      onChange={(e) => handleSystemAccessChange('is_active', e.target.checked)}
                    />
                  }
                  label="System Access Active"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Enable or disable system access for this role
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Helper functions
const formatPermissionName = (permission: string): string => {
  return permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPermissionDescription = (permission: string): string => {
  const descriptions: { [key: string]: string } = {
    'view_dashboard': 'Access to main dashboard and overview',
    'view_reports': 'View reports and analytics',
    'view_inventory': 'View inventory and stock information',
    'view_settings': 'Access to system settings',
    'view_hr': 'Access to HR module',
    'read_contracts': 'View and read contracts',
    'write_contracts': 'Create and edit contracts',
    'post_contracts': 'Approve and post contracts',
    'delete_contracts': 'Delete contracts',
    'manage_users': 'User management and administration',
    'approve_pricing': 'Approve pricing changes',
    'manage_draft_status': 'Manage contract draft status',
    'price_contracts': 'Set contract prices',
    'read_pricing': 'View pricing information',
    'read_payments': 'View payment records',
    'manage_hr': 'Full HR management access',
    'manage_employees': 'Employee data management',
    'view_financial_data': 'View financial reports and data',
    'manage_financial_transactions': 'Manage financial transactions'
  };

  return descriptions[permission] || 'System permission';
};

export default SystemAccessSection;