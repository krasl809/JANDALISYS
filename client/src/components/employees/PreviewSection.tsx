import React from 'react';
import {
  Card, CardContent, Grid, Avatar, Chip, Divider,
  Alert,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Paper, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import { MDBox, MDTypography } from '../common/MDComponents';
import {
  Phone, Email, Folder
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
        <Card sx={{ overflow: 'visible' }}>
          <MDBox
            variant="gradient"
            bgColor={errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success"}
            borderRadius="lg"
            coloredShadow={errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success"}
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Form Validation Status
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 2 }}>
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom color="error">
                  Please fix the following errors before submitting:
                </MDTypography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>
                      <MDTypography variant="body2">{error}</MDTypography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom color="warning">
                  Recommendations:
                </MDTypography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {warnings.map((warning, index) => (
                    <li key={index}>
                      <MDTypography variant="body2">{warning}</MDTypography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {errors.length === 0 && warnings.length === 0 && (
              <Alert severity="success">
                <MDTypography variant="body2" color="success">
                  All required fields are completed and validated. The form is ready for submission.
                </MDTypography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Employee Profile Summary */}
      <Grid item xs={12} md={4}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
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
            <Avatar
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                bgcolor: 'white',
                color: 'primary.main',
                fontSize: '2rem',
                border: '4px solid white',
                boxShadow: (theme: any) => theme.shadows[3]
              }}
            >
              {formData.name?.charAt(0)?.toUpperCase() || 'E'}
            </Avatar>
          </MDBox>
          <CardContent sx={{ textAlign: 'center', pt: 2 }}>
            <MDTypography variant="h5" fontWeight="bold" gutterBottom>
              {formData.name || 'Employee Name'}
            </MDTypography>
            <MDTypography variant="body2" color="text" gutterBottom>
              {formData.employee_id || 'Employee ID not set'}
            </MDTypography>
            <MDBox sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
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
            </MDBox>
            <Divider sx={{ my: 2 }} />
            <MDTypography variant="body2" color="text">
              <Email sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              {formData.email || 'Email not provided'}
            </MDTypography>
            <MDTypography variant="body2" color="text">
              <Phone sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              {formData.phone || 'Phone not provided'}
            </MDTypography>
          </CardContent>
        </Card>
      </Grid>

      {/* Basic Information */}
      <Grid item xs={12} md={8}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
          <MDBox
            variant="gradient"
            bgColor="info"
            borderRadius="lg"
            coloredShadow="info"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Employment Details
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Department</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.department || 'Not specified'}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Position</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.position || 'Not specified'}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Job Title</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.job_title || 'Not specified'}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Hire Date</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.hire_date ? new Date(formData.hire_date).toLocaleDateString() : 'Not specified'}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Work Location</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.work_location || 'Not specified'}
                </MDTypography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Reporting To</MDTypography>
                <MDTypography variant="body1" fontWeight="medium">
                  {formData.reporting_to || 'Not specified'}
                </MDTypography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Salary Information */}
      <Grid item xs={12} md={6}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
          <MDBox
            variant="gradient"
            bgColor="success"
            borderRadius="lg"
            coloredShadow="success"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Salary Details
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {formData.salary_info ? (
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 'none', py: 1 }}>
                        <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: 'uppercase' }}>Basic Salary</MDTypography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 'none', py: 1 }}>
                        <MDTypography variant="body1" fontWeight="bold">
                          {formData.salary_info.currency || 'USD'} {formData.salary_info.basic_salary?.toLocaleString() || '0'}
                        </MDTypography>
                      </TableCell>
                    </TableRow>
                    {(formData.salary_info.housing_allowance > 0) && (
                      <TableRow>
                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="caption" color="text">Housing Allowance</MDTypography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="body2">{formData.salary_info.currency} {formData.salary_info.housing_allowance?.toLocaleString()}</MDTypography>
                        </TableCell>
                      </TableRow>
                    )}
                    {(formData.salary_info.transport_allowance > 0) && (
                      <TableRow>
                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="caption" color="text">Transport Allowance</MDTypography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="body2">{formData.salary_info.currency} {formData.salary_info.transport_allowance?.toLocaleString()}</MDTypography>
                        </TableCell>
                      </TableRow>
                    )}
                    {(formData.salary_info.food_allowance > 0) && (
                      <TableRow>
                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="caption" color="text">Food Allowance</MDTypography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', py: 0.5 }}>
                          <MDTypography variant="body2">{formData.salary_info.currency} {formData.salary_info.food_allowance?.toLocaleString()}</MDTypography>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={2} sx={{ py: 1 }}>
                        <Divider sx={{ my: 1 }} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 'none', py: 1 }}>
                        <MDTypography variant="subtitle2" fontWeight="bold">Net Salary</MDTypography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 'none', py: 1 }}>
                        <MDTypography variant="h6" fontWeight="bold" color="success">
                          {formData.salary_info.currency} {calculateTotalSalary().toLocaleString()}
                        </MDTypography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <MDTypography variant="body2" color="text">
                No salary information provided
              </MDTypography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* System Access */}
      <Grid item xs={12} md={6}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
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
              System Access
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {formData.system_access ? (
              <MDBox>
                <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Role: {formData.system_access.system_role?.replace('_', ' ').toUpperCase() || 'Not assigned'}
                </MDTypography>
                
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {[
                    { label: 'HR Access', active: formData.system_access.can_access_hr },
                    { label: 'Finance Access', active: formData.system_access.can_access_finance },
                    { label: 'Inventory Access', active: formData.system_access.can_access_inventory },
                    { label: 'Contracts Access', active: formData.system_access.can_access_contracts }
                  ].map((access, idx) => (
                    <Grid item xs={6} key={idx}>
                      <Chip 
                        label={access.label} 
                        color={access.active ? 'success' : 'default'} 
                        size="small"
                        variant={access.active ? 'filled' : 'outlined'}
                        sx={{ width: '100%', justifyContent: 'flex-start', px: 1 }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </MDBox>
            ) : (
              <MDTypography variant="body2" color="text">
                No system access configured
              </MDTypography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Personal Information */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible' }}>
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
              Personal Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Arabic Names
                </MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.full_name_arabic || 'Not provided'}
                </MDTypography>
                {formData.personal_info?.national_id && (
                  <MDTypography variant="caption" color="text">
                    National ID: {formData.personal_info.national_id}
                  </MDTypography>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom>
                  English Names
                </MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.full_name_english || 'Not provided'}
                </MDTypography>
                {formData.personal_info?.passport_number && (
                  <MDTypography variant="caption" color="text">
                    Passport: {formData.personal_info.passport_number}
                  </MDTypography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Date of Birth</MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.date_of_birth 
                    ? new Date(formData.personal_info.date_of_birth).toLocaleDateString()
                    : 'Not provided'}
                </MDTypography>
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Gender</MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.gender || 'Not specified'}
                </MDTypography>
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Nationality</MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.nationality || 'Not specified'}
                </MDTypography>
              </Grid>

              <Grid item xs={12}>
                <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Address</MDTypography>
                <MDTypography variant="body2">
                  {formData.personal_info?.address_line1 || 'Not provided'}
                  {formData.personal_info?.city && `, ${formData.personal_info.city}`}
                  {formData.personal_info?.country && `, ${formData.personal_info.country}`}
                </MDTypography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Emergency Contacts */}
      <Grid item xs={12} md={6}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
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
              Emergency Contacts
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {formData.emergency_contacts?.length > 0 ? (
              <List sx={{ p: 0 }}>
                {formData.emergency_contacts.map((contact: any, index: number) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <MDBox sx={{ 
                          color: 'error.main', 
                          display: 'flex', 
                          p: 1, 
                          borderRadius: 1, 
                          bgcolor: 'error.light', 
                          opacity: 0.2 
                        }}>
                          <Phone fontSize="small" />
                        </MDBox>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MDTypography variant="subtitle2" fontWeight="bold">
                              {contact.full_name || 'Unnamed Contact'}
                            </MDTypography>
                            {contact.primary_contact && (
                              <Chip label="Primary" size="small" color="primary" />
                            )}
                          </MDBox>
                        }
                        secondary={
                          <MDTypography variant="body2" color="text">
                            {contact.relationship} • {contact.phone_primary}
                          </MDTypography>
                        }
                      />
                    </ListItem>
                    {index < formData.emergency_contacts.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <MDTypography variant="body2" color="text">
                No emergency contacts added
              </MDTypography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Documents */}
      <Grid item xs={12} md={6}>
        <Card sx={{ overflow: 'visible', height: '100%' }}>
          <MDBox
            variant="gradient"
            bgColor="dark"
            borderRadius="lg"
            coloredShadow="dark"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Uploaded Documents
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {formData.documents?.length > 0 ? (
              <List sx={{ p: 0 }}>
                {formData.documents.map((doc: any, index: number) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <MDBox sx={{ 
                          color: 'dark.main', 
                          display: 'flex', 
                          p: 1, 
                          borderRadius: 1, 
                          bgcolor: 'grey.200'
                        }}>
                          <Folder fontSize="small" />
                        </MDBox>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MDTypography variant="subtitle2" fontWeight="bold">
                              {doc.document_name}
                            </MDTypography>
                            <Chip 
                              label={doc.document_type?.replace('_', ' ')} 
                              size="small" 
                              variant="outlined"
                            />
                          </MDBox>
                        }
                        secondary={
                          <MDTypography variant="caption" color="text">
                            {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                          </MDTypography>
                        }
                      />
                    </ListItem>
                    {index < formData.documents.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <MDTypography variant="body2" color="text">
                No documents uploaded
              </MDTypography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Submission Notice */}
      <Grid item xs={12}>
        <Alert severity="info">
          <MDTypography variant="body2">
            <strong>Ready for Submission:</strong> Please review all information above before submitting. 
            You can go back to previous tabs to make any necessary changes. Once submitted, the employee 
            account will be created and system access will be configured according to the selected role.
          </MDTypography>
        </Alert>
      </Grid>
    </Grid>
  );
};

export default PreviewSection;