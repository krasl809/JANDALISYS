import React from 'react';
import {
  Card, CardContent, Grid, Typography, Box, Avatar, Chip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Alert, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton
} from '@mui/material';
import {
  Person, Work, AccountBalance, Phone, Email, LocationOn, Business,
  Security, Folder, Edit, CheckCircle, Warning, Info
} from '@mui/icons-material';

interface PreviewSectionProps {
  formData: any;
}

const PreviewSection: React.FC<PreviewSectionProps> = ({ formData }) => {
  const calculateTotalSalary = () => {
    const salary = formData.salary_info;
    if (!salary) return 0;
    
    const totalAllowances = (salary.housing_allowance || 0) + 
                           (salary.transport_allowance || 0) + 
                           (salary.food_allowance || 0) + 
                           (salary.medical_allowance || 0) + 
                           (salary.other_allowances || 0);
    
    const totalDeductions = (salary.tax_deduction || 0) + 
                           (salary.insurance_deduction || 0) + 
                           (salary.other_deductions || 0);
    
    return (salary.basic_salary || 0) + totalAllowances - totalDeductions;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      'active': 'success',
      'inactive': 'error',
      'probation': 'warning',
      'resigned': 'error',
      'terminated': 'error',
      'on_leave': 'info'
    };
    return colors[status] || 'default';
  };

  const getEmploymentTypeColor = (type: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'info' } = {
      'full_time': 'primary',
      'part_time': 'info',
      'contract': 'warning',
      'intern': 'secondary',
      'temporary': 'success'
    };
    return colors[type] || 'default';
  };

  const validateForm = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!formData.name?.trim()) errors.push('Employee name is required');
    if (!formData.email?.trim()) errors.push('Email address is required');
    if (!formData.department) warnings.push('Department not specified');
    if (!formData.position) warnings.push('Position not specified');
    if (!formData.hire_date) warnings.push('Hire date not specified');
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Invalid email format');
    }

    // Personal info validation
    if (formData.personal_info?.date_of_birth) {
      const birthDate = new Date(formData.personal_info.date_of_birth);
      const today = new Date();
      const age = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (birthDate > today) {
        errors.push('Date of birth cannot be in the future');
      } else if (age < 16) {
        warnings.push('Employee is under 16 years old');
      }
    }

    // Salary validation
    if (formData.salary_info?.basic_salary <= 0) {
      errors.push('Basic salary must be greater than 0');
    }

    // Emergency contacts validation
    if (formData.emergency_contacts?.length === 0) {
      warnings.push('No emergency contacts added');
    }

    // Documents validation
    if (formData.documents?.length === 0) {
      warnings.push('No documents uploaded');
    }

    return { errors, warnings };
  };

  const { errors, warnings } = validateForm();

  return (
    <Grid container spacing={3}>
      {/* Form Validation Status */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: errors.length > 0 ? 'error.main' : warnings.length > 0 ? 'warning.main' : 'success.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: errors.length > 0 ? 'error.light' : warnings.length > 0 ? 'warning.light' : 'success.light', 
                opacity: 0.1 
              }}>
                {errors.length > 0 ? <Warning /> : warnings.length > 0 ? <Info /> : <CheckCircle />}
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Form Validation Status
              </Typography>
            </Box>

            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Please fix the following errors before submitting:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Recommendations:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {warnings.map((warning, index) => (
                    <li key={index}>
                      <Typography variant="body2">{warning}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {errors.length === 0 && warnings.length === 0 && (
              <Alert severity="success">
                <Typography variant="body2">
                  All required fields are completed and validated. The form is ready for submission.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Employee Profile Summary */}
      <Grid item xs={12} md={4}>
        <Card elevation={0}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{ 
                width: 120, 
                height: 120, 
                mx: 'auto', 
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '3rem'
              }}
            >
              {formData.name?.charAt(0)?.toUpperCase() || 'E'}
            </Avatar>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {formData.name || 'Employee Name'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formData.employee_id || 'Employee ID not set'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
              <Chip 
                label={formData.status?.toUpperCase() || 'STATUS'} 
                color={getStatusColor(formData.status)} 
                size="small"
              />
              <Chip 
                label={formData.employment_type?.toUpperCase().replace('_', ' ') || 'EMPLOYMENT TYPE'} 
                color={getEmploymentTypeColor(formData.employment_type)} 
                size="small"
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              <Email sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              {formData.email || 'Email not provided'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Phone sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              {formData.phone || 'Phone not provided'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Basic Information */}
      <Grid item xs={12} md={8}>
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
                <Person />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Basic Information
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Department</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.department || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Position</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.position || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Job Title</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.job_title || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Hire Date</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.hire_date ? new Date(formData.hire_date).toLocaleDateString() : 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Work Location</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.work_location || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Reporting To</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.reporting_to || 'Not specified'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Salary Information */}
      <Grid item xs={12} md={6}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'success.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'success.light', 
                opacity: 0.1 
              }}>
                <AccountBalance />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Salary Information
              </Typography>
            </Box>

            {formData.salary_info ? (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><Typography variant="caption" fontWeight="bold">Basic Salary</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="bold">
                          {formData.salary_info.currency || 'USD'} {formData.salary_info.basic_salary?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {(formData.salary_info.housing_allowance > 0) && (
                      <TableRow>
                        <TableCell><Typography variant="caption">Housing Allowance</Typography></TableCell>
                        <TableCell align="right">{formData.salary_info.currency} {formData.salary_info.housing_allowance?.toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                    {(formData.salary_info.transport_allowance > 0) && (
                      <TableRow>
                        <TableCell><Typography variant="caption">Transport Allowance</Typography></TableCell>
                        <TableCell align="right">{formData.salary_info.currency} {formData.salary_info.transport_allowance?.toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                    {(formData.salary_info.food_allowance > 0) && (
                      <TableRow>
                        <TableCell><Typography variant="caption">Food Allowance</Typography></TableCell>
                        <TableCell align="right">{formData.salary_info.currency} {formData.salary_info.food_allowance?.toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><Typography variant="subtitle2" fontWeight="bold">Net Salary</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {formData.salary_info.currency} {calculateTotalSalary().toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No salary information provided
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* System Access */}
      <Grid item xs={12} md={6}>
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
                <Security />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                System Access
              </Typography>
            </Box>

            {formData.system_access ? (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Role: {formData.system_access.system_role?.replace('_', ' ').toUpperCase() || 'Not assigned'}
                </Typography>
                
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Chip 
                      label="HR Access" 
                      color={formData.system_access.can_access_hr ? 'success' : 'default'} 
                      size="small"
                      variant={formData.system_access.can_access_hr ? 'filled' : 'outlined'}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="Finance Access" 
                      color={formData.system_access.can_access_finance ? 'success' : 'default'} 
                      size="small"
                      variant={formData.system_access.can_access_finance ? 'filled' : 'outlined'}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="Inventory Access" 
                      color={formData.system_access.can_access_inventory ? 'success' : 'default'} 
                      size="small"
                      variant={formData.system_access.can_access_inventory ? 'filled' : 'outlined'}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="Contracts Access" 
                      color={formData.system_access.can_access_contracts ? 'success' : 'default'} 
                      size="small"
                      variant={formData.system_access.can_access_contracts ? 'filled' : 'outlined'}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No system access configured
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Personal Information */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'info.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'info.light', 
                opacity: 0.1 
              }}>
                <Person />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Personal Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Arabic Names
                </Typography>
                <Typography variant="body2">
                  {formData.personal_info?.full_name_arabic || 'Not provided'}
                </Typography>
                {formData.personal_info?.national_id && (
                  <Typography variant="caption" color="text.secondary">
                    National ID: {formData.personal_info.national_id}
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  English Names
                </Typography>
                <Typography variant="body2">
                  {formData.personal_info?.full_name_english || 'Not provided'}
                </Typography>
                {formData.personal_info?.passport_number && (
                  <Typography variant="caption" color="text.secondary">
                    Passport: {formData.personal_info.passport_number}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                <Typography variant="body2">
                  {formData.personal_info?.date_of_birth 
                    ? new Date(formData.personal_info.date_of_birth).toLocaleDateString()
                    : 'Not provided'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">Gender</Typography>
                <Typography variant="body2">
                  {formData.personal_info?.gender || 'Not specified'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">Nationality</Typography>
                <Typography variant="body2">
                  {formData.personal_info?.nationality || 'Not specified'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Address</Typography>
                <Typography variant="body2">
                  {formData.personal_info?.address_line1 || 'Not provided'}
                  {formData.personal_info?.city && `, ${formData.personal_info.city}`}
                  {formData.personal_info?.country && `, ${formData.personal_info.country}`}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Emergency Contacts */}
      <Grid item xs={12} md={6}>
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
                <Phone />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Emergency Contacts
              </Typography>
            </Box>

            {formData.emergency_contacts && formData.emergency_contacts.length > 0 ? (
              <List dense>
                {formData.emergency_contacts.map((contact: any, index: number) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {contact.full_name || 'Unnamed Contact'}
                          </Typography>
                          {contact.primary_contact && (
                            <Chip label="Primary" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {contact.relationship} • {contact.phone_primary}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No emergency contacts added
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Documents */}
      <Grid item xs={12} md={6}>
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
                <Folder />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Documents
              </Typography>
            </Box>

            {formData.documents && formData.documents.length > 0 ? (
              <List dense>
                {formData.documents.map((doc: any, index: number) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Folder />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {doc.document_name}
                          </Typography>
                          <Chip 
                            label={doc.document_type?.replace('_', ' ')} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Submission Notice */}
      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Ready for Submission:</strong> Please review all information above before submitting. 
            You can go back to previous tabs to make any necessary changes. Once submitted, the employee 
            account will be created and system access will be configured according to the selected role.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};

export default PreviewSection;