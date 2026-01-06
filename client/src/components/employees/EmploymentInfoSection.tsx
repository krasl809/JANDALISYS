import React from 'react';
import {
  Card, CardContent, Grid, TextField, MenuItem, Box, Button,
  IconButton, InputAdornment, Autocomplete, Divider, Chip, Paper
} from '@mui/material';
import {
  Person, Add, Delete, Business, Event,
  TrendingUp, LocationOn, Schedule
} from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

interface EmploymentInfoSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  onNestedInputChange: (parent: string, field: string, value: any) => void;
  onGenerateEmployeeId: () => void;
  isGeneratingId: boolean;
  emergencyContacts: any[];
  onAddEmergencyContact: () => void;
  onRemoveEmergencyContact: (index: number) => void;
  onUpdateEmergencyContact: (index: number, field: string, value: any) => void;
}

const EmploymentInfoSection: React.FC<EmploymentInfoSectionProps> = ({
  formData,
  onInputChange,
  onNestedInputChange,
  onGenerateEmployeeId,
  isGeneratingId,
  emergencyContacts,
  onAddEmergencyContact,
  onRemoveEmergencyContact,
  onUpdateEmergencyContact
}) => {
  const handleSalaryInfoChange = (field: string, value: any) => {
    onNestedInputChange('salary_info', field, value);
  };

  const handleBankInfoChange = (field: string, value: any) => {
    onNestedInputChange('bank_info', field, value);
  };

  const departments = [
    'Human Resources', 'Finance', 'Marketing', 'Sales', 'IT', 'Operations',
    'Legal', 'Administration', 'Customer Service', 'Research & Development',
    'Quality Assurance', 'Procurement', 'Engineering', 'Design'
  ];

  const positions = [
    'Manager', 'Senior Manager', 'Director', 'Vice President', 'CEO',
    'Senior Developer', 'Developer', 'Junior Developer', 'Team Lead',
    'Analyst', 'Senior Analyst', 'Coordinator', 'Specialist', 'Assistant',
    'Executive Assistant', 'Administrator', 'Consultant', 'Advisor'
  ];

  const employmentTypes = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
    { value: 'temporary', label: 'Temporary' }
  ];

  const workSchedules = [
    '9:00 AM - 5:00 PM', '8:00 AM - 4:00 PM', '10:00 AM - 6:00 PM',
    'Flexible Hours', 'Remote Work', 'Shift Work', 'Rotating Shifts'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'SYP', 'SAR', 'AED', 'LBP'];

  const relationships = [
    'Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter',
    'Brother', 'Sister', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother',
    'Friend', 'Guardian', 'Other'
  ];

  return (
    <Grid container spacing={3}>
      {/* Employment Details */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible' }}>
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
              Employment Details
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Employee ID (Required) *
                </MDTypography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={formData.employee_id || ''}
                    onChange={(e) => onInputChange('employee_id', e.target.value)}
                    placeholder="EMP-XXXXX"
                    size="small"
                    required
                  />
                  <Button
                    variant="outlined"
                    onClick={onGenerateEmployeeId}
                    disabled={isGeneratingId}
                    sx={{ minWidth: 100, borderRadius: 1 }}
                  >
                    {isGeneratingId ? '...' : 'Auto'}
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Joining Date (Required) *
                </MDTypography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.joining_date || ''}
                  onChange={(e) => onInputChange('joining_date', e.target.value)}
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}><Event fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Department
                </MDTypography>
                <Autocomplete
                  options={departments}
                  value={formData.department || ''}
                  onChange={(_, value) => onInputChange('department', value)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      placeholder="Select department"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start" sx={{ color: 'text.disabled' }}><Business fontSize="small" /></InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Position / Job Title
                </MDTypography>
                <Autocomplete
                  options={positions}
                  value={formData.position || ''}
                  onChange={(_, value) => onInputChange('position', value)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      placeholder="Select position"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start" sx={{ color: 'text.disabled' }}><TrendingUp fontSize="small" /></InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Employment Type
                </MDTypography>
                <TextField
                  select
                  fullWidth
                  value={formData.employment_type || ''}
                  onChange={(e) => onInputChange('employment_type', e.target.value)}
                  size="small"
                >
                  {employmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Work Location
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.work_location || ''}
                  onChange={(e) => onInputChange('work_location', e.target.value)}
                  placeholder="Office or remote"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}><LocationOn fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Work Schedule
                </MDTypography>
                <Autocomplete
                  options={workSchedules}
                  value={formData.work_schedule || ''}
                  onChange={(_, value) => onInputChange('work_schedule', value)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      placeholder="Select schedule"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start" sx={{ color: 'text.disabled' }}><Schedule fontSize="small" /></InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Status
                </MDTypography>
                <TextField
                  select
                  fullWidth
                  value={formData.status || 'active'}
                  onChange={(e) => onInputChange('status', e.target.value)}
                  size="small"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="probation">Probation</MenuItem>
                  <MenuItem value="resigned">Resigned</MenuItem>
                  <MenuItem value="terminated">Terminated</MenuItem>
                  <MenuItem value="on_leave">On Leave</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Salary Information */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
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
              Salary Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Basic Salary (Required) *
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.basic_salary || ''}
                  onChange={(e) => handleSalaryInfoChange('basic_salary', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Currency
                </MDTypography>
                <TextField
                  select
                  fullWidth
                  value={formData.salary_info?.currency || 'USD'}
                  onChange={(e) => handleSalaryInfoChange('currency', e.target.value)}
                  size="small"
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency} value={currency}>
                      {currency}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Effective Date
                </MDTypography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.salary_info?.effective_date || ''}
                  onChange={(e) => handleSalaryInfoChange('effective_date', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4, opacity: 0.6 }} />

            <MDTypography variant="subtitle2" fontWeight="bold" sx={{ mb: 3, color: 'text.primary' }}>
              Monthly Allowances
            </MDTypography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Housing Allowance
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.housing_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('housing_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Transport Allowance
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.transport_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('transport_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Food Allowance
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.food_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('food_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Medical Allowance
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.medical_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('medical_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Other Allowances
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.other_allowances || 0}
                  onChange={(e) => handleSalaryInfoChange('other_allowances', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4, opacity: 0.6 }} />

            <MDTypography variant="subtitle2" fontWeight="bold" sx={{ mb: 3, color: 'text.primary' }}>
              Monthly Deductions
            </MDTypography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Tax Deduction
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.tax_deduction || 0}
                  onChange={(e) => handleSalaryInfoChange('tax_deduction', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Insurance Deduction
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.insurance_deduction || 0}
                  onChange={(e) => handleSalaryInfoChange('insurance_deduction', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Other Deductions
                </MDTypography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.other_deductions || 0}
                  onChange={(e) => handleSalaryInfoChange('other_deductions', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'text.disabled' }}>$</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Bank Information */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
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
              Bank Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Bank Name
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.bank_name || ''}
                  onChange={(e) => handleBankInfoChange('bank_name', e.target.value)}
                  placeholder="Enter bank name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Bank Account Number
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.bank_account || ''}
                  onChange={(e) => handleBankInfoChange('bank_account', e.target.value)}
                  placeholder="Enter account number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  IBAN
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.iban || ''}
                  onChange={(e) => handleBankInfoChange('iban', e.target.value)}
                  placeholder="Enter IBAN number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  SWIFT Code
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.swift_code || ''}
                  onChange={(e) => handleBankInfoChange('swift_code', e.target.value)}
                  placeholder="Enter SWIFT code"
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Emergency Contacts */}
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
              Emergency Contacts
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <MDBox sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Add />}
                onClick={onAddEmergencyContact}
                sx={{ borderRadius: 2 }}
              >
                Add Contact
              </Button>
            </MDBox>

            {emergencyContacts.length === 0 ? (
              <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Person sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                <MDTypography variant="body1" color="text" fontWeight="medium">
                  No emergency contacts added yet
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Click the button above to add your first contact
                </MDTypography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {emergencyContacts.map((contact, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 3, 
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MDTypography variant="subtitle2" fontWeight="bold">
                            Contact #{index + 1}
                          </MDTypography>
                          {index === 0 && (
                            <Chip 
                              label="Primary" 
                              size="small" 
                              color="primary" 
                              sx={{ fontWeight: 'bold', borderRadius: 1 }} 
                            />
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => onRemoveEmergencyContact(index)}
                          color="error"
                          sx={{ bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>

                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Full Name
                          </MDTypography>
                          <TextField
                            fullWidth
                            value={contact.full_name || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'full_name', e.target.value)}
                            placeholder="Enter full name"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Relationship
                          </MDTypography>
                          <TextField
                            fullWidth
                            select
                            value={contact.relationship || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'relationship', e.target.value)}
                            size="small"
                          >
                            {relationships.map((rel) => (
                              <MenuItem key={rel} value={rel}>
                                {rel}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Primary Phone
                          </MDTypography>
                          <TextField
                            fullWidth
                            value={contact.phone_primary || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'phone_primary', e.target.value)}
                            placeholder="Enter phone number"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Secondary Phone
                          </MDTypography>
                          <TextField
                            fullWidth
                            value={contact.phone_secondary || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'phone_secondary', e.target.value)}
                            placeholder="Optional"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Email
                          </MDTypography>
                          <TextField
                            fullWidth
                            type="email"
                            value={contact.email || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'email', e.target.value)}
                            placeholder="email@example.com"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                            Address
                          </MDTypography>
                          <TextField
                            fullWidth
                            value={contact.address || ''}
                            onChange={(e) => onUpdateEmergencyContact(index, 'address', e.target.value)}
                            placeholder="City, Street, Building"
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EmploymentInfoSection;