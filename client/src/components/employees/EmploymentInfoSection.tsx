import React from 'react';
import {
  Card, CardContent, Grid, TextField, MenuItem, Typography, Box, Button,
  IconButton, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  InputAdornment, Autocomplete, Divider, List, ListItem, ListItemText,
  ListItemSecondaryAction, Chip
} from '@mui/material';
import {
  Work, AccountBalance, Person, Add, Delete, Business, Event,
  TrendingUp, LocationOn, Schedule, AttachMoney
} from '@mui/icons-material';

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
                <Work />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Employment Details
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Employee ID
                </Typography>
                <TextField
                  fullWidth
                  value={formData.employee_id || ''}
                  onChange={(e) => onInputChange('employee_id', e.target.value)}
                  placeholder="Enter or generate employee ID"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={onGenerateEmployeeId}
                          disabled={isGeneratingId}
                          variant="outlined"
                        >
                          {isGeneratingId ? 'Generating...' : 'Generate'}
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Company
                </Typography>
                <TextField
                  fullWidth
                  value={formData.company || ''}
                  onChange={(e) => onInputChange('company', e.target.value)}
                  placeholder="Enter company name"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Business fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Department
                </Typography>
                <Autocomplete
                  options={departments}
                  value={formData.department || ''}
                  onChange={(_, value) => onInputChange('department', value)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select department" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Position
                </Typography>
                <Autocomplete
                  options={positions}
                  value={formData.position || ''}
                  onChange={(_, value) => onInputChange('position', value)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select position" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Job Title
                </Typography>
                <TextField
                  fullWidth
                  value={formData.job_title || ''}
                  onChange={(e) => onInputChange('job_title', e.target.value)}
                  placeholder="Specific job title"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Employment Type
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={formData.employment_type || 'full_time'}
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

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Hire Date
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.hire_date || ''}
                  onChange={(e) => onInputChange('hire_date', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Event fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Reporting To
                </Typography>
                <TextField
                  fullWidth
                  value={formData.reporting_to || ''}
                  onChange={(e) => onInputChange('reporting_to', e.target.value)}
                  placeholder="Manager or supervisor name"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Work Location
                </Typography>
                <TextField
                  fullWidth
                  value={formData.work_location || ''}
                  onChange={(e) => onInputChange('work_location', e.target.value)}
                  placeholder="Office location or remote"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Work Schedule
                </Typography>
                <Autocomplete
                  options={workSchedules}
                  value={formData.work_schedule || ''}
                  onChange={(_, value) => onInputChange('work_schedule', value)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select work schedule" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Status
                </Typography>
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
                <AttachMoney />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Salary Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Basic Salary (Required) *
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.basic_salary || ''}
                  onChange={(e) => handleSalaryInfoChange('basic_salary', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Currency
                </Typography>
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
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Effective Date
                </Typography>
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

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'text.secondary' }}>
              Allowances
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Housing Allowance
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.housing_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('housing_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Transport Allowance
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.transport_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('transport_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Food Allowance
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.food_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('food_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Medical Allowance
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.medical_allowance || 0}
                  onChange={(e) => handleSalaryInfoChange('medical_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Other Allowances
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.other_allowances || 0}
                  onChange={(e) => handleSalaryInfoChange('other_allowances', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'text.secondary' }}>
              Deductions
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Tax Deduction
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.tax_deduction || 0}
                  onChange={(e) => handleSalaryInfoChange('tax_deduction', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Insurance Deduction
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.insurance_deduction || 0}
                  onChange={(e) => handleSalaryInfoChange('insurance_deduction', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Other Deductions
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.salary_info?.other_deductions || 0}
                  onChange={(e) => handleSalaryInfoChange('other_deductions', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Bank Information */}
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
                <AccountBalance />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Bank Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Bank Name
                </Typography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.bank_name || ''}
                  onChange={(e) => handleBankInfoChange('bank_name', e.target.value)}
                  placeholder="Enter bank name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Bank Account Number
                </Typography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.bank_account || ''}
                  onChange={(e) => handleBankInfoChange('bank_account', e.target.value)}
                  placeholder="Enter account number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  IBAN
                </Typography>
                <TextField
                  fullWidth
                  value={formData.bank_info?.iban || ''}
                  onChange={(e) => handleBankInfoChange('iban', e.target.value)}
                  placeholder="Enter IBAN number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  SWIFT Code
                </Typography>
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
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  color: 'warning.main', 
                  display: 'flex', 
                  p: 0.5, 
                  borderRadius: 1, 
                  bgcolor: 'warning.light', 
                  opacity: 0.1 
                }}>
                  <Person />
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  Emergency Contacts
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={onAddEmergencyContact}
                size="small"
              >
                Add Contact
              </Button>
            </Box>

            {emergencyContacts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No emergency contacts added yet. Click "Add Contact" to add one.
              </Typography>
            ) : (
              <List>
                {emergencyContacts.map((contact, index) => (
                  <ListItem key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {contact.full_name || 'Unnamed Contact'}
                          </Typography>
                          {contact.primary_contact && (
                            <Chip label="Primary" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {contact.relationship} • {contact.phone_primary}
                          </Typography>
                          {contact.email && (
                            <Typography variant="body2" color="text.secondary">
                              {contact.email}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => onRemoveEmergencyContact(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {emergencyContacts.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'text.secondary' }}>
                  Contact Details
                </Typography>
                <Grid container spacing={3}>
                  {emergencyContacts.map((contact, index) => (
                    <Grid item xs={12} key={index}>
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            Contact {index + 1}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label="Full Name"
                                value={contact.full_name || ''}
                                onChange={(e) => onUpdateEmergencyContact(index, 'full_name', e.target.value)}
                                size="small"
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                select
                                label="Relationship"
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
                              <TextField
                                fullWidth
                                label="Primary Phone"
                                value={contact.phone_primary || ''}
                                onChange={(e) => onUpdateEmergencyContact(index, 'phone_primary', e.target.value)}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label="Secondary Phone"
                                value={contact.phone_secondary || ''}
                                onChange={(e) => onUpdateEmergencyContact(index, 'phone_secondary', e.target.value)}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                type="email"
                                label="Email"
                                value={contact.email || ''}
                                onChange={(e) => onUpdateEmergencyContact(index, 'email', e.target.value)}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label="Address"
                                value={contact.address || ''}
                                onChange={(e) => onUpdateEmergencyContact(index, 'address', e.target.value)}
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EmploymentInfoSection;