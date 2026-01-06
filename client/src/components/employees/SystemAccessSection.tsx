import React from 'react';
import {
  Card, CardContent, Grid, Switch, Alert, Chip, Paper
} from '@mui/material';
import {
  Security, Business, Description, Inventory, 
  AccountBalance, Assessment, Lock
} from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

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
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="primary"
            borderRadius="lg"
            coloredShadow="primary"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              System Role & Permissions
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Alert 
              severity="info" 
              icon={<Security />}
              sx={{ 
                mb: 4, 
                borderRadius: 1,
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <MDTypography variant="body2" fontWeight="medium" color="info">
                Select a system role to automatically assign appropriate permissions. You can customize permissions after selecting a role.
              </MDTypography>
            </Alert>

            <Grid container spacing={2}>
              {systemRoles.map((role) => (
                <Grid item xs={12} md={4} key={role.value}>
                  <Paper
                    elevation={0}
                    onClick={() => handleRoleChange(role.value)}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: formData.system_access?.system_role === role.value ? 'primary.main' : 'divider',
                      bgcolor: formData.system_access?.system_role === role.value ? 'primary.light' : 'background.paper',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: formData.system_access?.system_role === role.value ? 1 : 0.8,
                      '&:hover': {
                        borderColor: 'primary.main',
                        opacity: 1,
                        bgcolor: formData.system_access?.system_role === role.value ? 'primary.light' : 'action.hover',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    {formData.system_access?.system_role === role.value && (
                      <MDBox sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12,
                        color: 'primary.main'
                      }}>
                        <Security fontSize="small" />
                      </MDBox>
                    )}
                    <MDTypography 
                      variant="subtitle2" 
                      fontWeight="bold" 
                      color={formData.system_access?.system_role === role.value ? 'primary' : 'dark'} 
                      sx={{ mb: 0.5 }}
                    >
                      {role.label}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" sx={{ display: 'block', lineHeight: 1.3 }}>
                      {role.description}
                    </MDTypography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {selectedRole && (
              <MDBox sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: 'uppercase' }}>
                  Currently Active:
                </MDTypography>
                <Chip 
                  label={selectedRole.label} 
                  color="primary" 
                  size="small" 
                  sx={{ fontWeight: 'bold' }}
                />
              </MDBox>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Module Access */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="secondary"
            borderRadius="lg"
            coloredShadow="secondary"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Module Access Control
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={2}>
              {[
                { field: 'can_access_hr', label: 'HR Management', icon: <Business />, color: 'primary', desc: 'Employee data, attendance, payroll' },
                { field: 'can_access_finance', label: 'Finance', icon: <AccountBalance />, color: 'success', desc: 'Financial records, payments, pricing' },
                { field: 'can_access_inventory', label: 'Inventory', icon: <Inventory />, color: 'warning', desc: 'Stock, warehouses, delivery notes' },
                { field: 'can_access_contracts', label: 'Contracts', icon: <Description />, color: 'info', desc: 'Creation, editing, approval' },
                { field: 'can_access_reports', label: 'Reports', icon: <Assessment />, color: 'secondary', desc: 'Dashboards, analytics, data export' }
              ].map((module) => (
                <Grid item xs={12} md={6} key={module.field}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: formData.system_access?.[module.field] ? `${module.color}.light` : 'background.paper',
                      border: '1px solid',
                      borderColor: formData.system_access?.[module.field] ? `${module.color}.main` : 'divider',
                      transition: 'all 0.2s',
                      opacity: !formData.system_access?.system_role ? 0.5 : 1
                    }}
                  >
                    <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MDBox sx={{ 
                          color: `${module.color}.main`,
                          display: 'flex',
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>
                          {React.cloneElement(module.icon as React.ReactElement, { fontSize: 'small' })}
                        </MDBox>
                        <MDBox>
                          <MDTypography variant="subtitle2" fontWeight="bold">
                            {module.label}
                          </MDTypography>
                          <MDTypography variant="caption" color="text">
                            {module.desc}
                          </MDTypography>
                        </MDBox>
                      </MDBox>
                      <Switch
                        size="small"
                        checked={formData.system_access?.[module.field] || false}
                        onChange={(e) => handleSystemAccessChange(module.field, e.target.checked)}
                        disabled={!formData.system_access?.system_role}
                        color={module.color as any}
                      />
                    </MDBox>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Permissions */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="warning"
            borderRadius="lg"
            coloredShadow="warning"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Detailed Permissions
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {formData.system_access?.permissions ? (
              <MDBox sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider'
              }}>
                {JSON.parse(formData.system_access.permissions).map((permission: string, index: number) => (
                  <Chip
                    key={index}
                    icon={<Lock sx={{ fontSize: '12px !important' }} />}
                    label={formatPermissionName(permission)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      '& .MuiChip-label': { fontSize: '0.7rem', fontWeight: 600 }
                    }}
                  />
                ))}
              </MDBox>
            ) : (
              <MDBox sx={{ 
                textAlign: 'center', 
                py: 4, 
                bgcolor: 'background.default', 
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider'
              }}>
                <Security sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                <MDTypography variant="body2" color="text" fontWeight="medium">
                  No permissions assigned yet
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Select a system role to view permissions
                </MDTypography>
              </MDBox>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Security Settings */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="error"
            borderRadius="lg"
            coloredShadow="error"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Account Security
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <MDBox>
                      <MDTypography variant="subtitle2" fontWeight="bold">Account Status</MDTypography>
                      <MDTypography variant="caption" color="text">Enable or disable overall login access</MDTypography>
                    </MDBox>
                    <Switch
                      checked={formData.is_active !== false}
                      onChange={(e) => onInputChange('is_active', e.target.checked)}
                      color="success"
                    />
                  </MDBox>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <MDBox>
                      <MDTypography variant="subtitle2" fontWeight="bold">System Access</MDTypography>
                      <MDTypography variant="caption" color="text">Enable or disable system-specific features</MDTypography>
                    </MDBox>
                    <Switch
                      checked={formData.system_access?.is_active !== false}
                      onChange={(e) => handleSystemAccessChange('is_active', e.target.checked)}
                      color="primary"
                    />
                  </MDBox>
                </Paper>
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

export default SystemAccessSection;