import React from 'react';
import {
  Card, CardContent, Grid, TextField, MenuItem, Typography, Box,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  InputAdornment, Autocomplete
} from '@mui/material';
import { Person, LocationOn, Phone, Email, Event, Badge } from '@mui/icons-material';

interface PersonalInfoSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  onNestedInputChange: (parent: string, field: string, value: any) => void;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  formData,
  onInputChange,
  onNestedInputChange
}) => {
  const handlePersonalInfoChange = (field: string, value: any) => {
    onNestedInputChange('personal_info', field, value);
  };

  const generateFullNameArabic = () => {
    const { first_name_arabic, middle_name_arabic, last_name_arabic } = formData.personal_info || {};
    const fullName = [first_name_arabic, middle_name_arabic, last_name_arabic]
      .filter(name => name?.trim())
      .join(' ');
    handlePersonalInfoChange('full_name_arabic', fullName);
  };

  const generateFullNameEnglish = () => {
    const { first_name_english, middle_name_english, last_name_english } = formData.personal_info || {};
    const fullName = [first_name_english, middle_name_english, last_name_english]
      .filter(name => name?.trim())
      .join(' ');
    handlePersonalInfoChange('full_name_english', fullName);
  };

  // Update full names when individual names change
  React.useEffect(() => {
    generateFullNameArabic();
  }, [formData.personal_info?.first_name_arabic, formData.personal_info?.middle_name_arabic, formData.personal_info?.last_name_arabic]);

  React.useEffect(() => {
    generateFullNameEnglish();
  }, [formData.personal_info?.first_name_english, formData.personal_info?.middle_name_english, formData.personal_info?.last_name_english]);

  const countries = [
    'Syria', 'Lebanon', 'Jordan', 'Egypt', 'Saudi Arabia', 'UAE', 'Kuwait', 
    'Qatar', 'Bahrain', 'Oman', 'Yemen', 'Iraq', 'Palestine', 'Morocco', 
    'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Somalia', 'Djibouti', 'Comoros',
    'Mauritania', 'Turkey', 'Iran', 'Afghanistan', 'Pakistan', 'India', 'Bangladesh'
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <Grid container spacing={3}>
      {/* Basic Information */}
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
                <Person />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Basic Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Employee Name (Required) *
                </Typography>
                <TextField
                  fullWidth
                  value={formData.name || ''}
                  onChange={(e) => onInputChange('name', e.target.value)}
                  placeholder="Enter employee full name"
                  size="small"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Email Address (Required) *
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => onInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  size="small"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Phone Number
                </Typography>
                <TextField
                  fullWidth
                  value={formData.phone || ''}
                  onChange={(e) => onInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Address
                </Typography>
                <TextField
                  fullWidth
                  value={formData.address || ''}
                  onChange={(e) => onInputChange('address', e.target.value)}
                  placeholder="Enter address"
                  size="small"
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Arabic Names */}
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
                <Badge />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Arabic Names
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  First Name (Arabic)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.first_name_arabic || ''}
                  onChange={(e) => handlePersonalInfoChange('first_name_arabic', e.target.value)}
                  placeholder="الاسم الأول"
                  size="small"
                  dir="rtl"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Middle Name (Arabic)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.middle_name_arabic || ''}
                  onChange={(e) => handlePersonalInfoChange('middle_name_arabic', e.target.value)}
                  placeholder="الاسم الأوسط"
                  size="small"
                  dir="rtl"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Last Name (Arabic)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.last_name_arabic || ''}
                  onChange={(e) => handlePersonalInfoChange('last_name_arabic', e.target.value)}
                  placeholder="اسم العائلة"
                  size="small"
                  dir="rtl"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Full Name (Arabic)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.full_name_arabic || ''}
                  onChange={(e) => handlePersonalInfoChange('full_name_arabic', e.target.value)}
                  placeholder="الاسم الكامل"
                  size="small"
                  dir="rtl"
                  disabled
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* English Names */}
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
                <Person />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                English Names
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  First Name (English)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.first_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('first_name_english', e.target.value)}
                  placeholder="First Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Middle Name (English)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.middle_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('middle_name_english', e.target.value)}
                  placeholder="Middle Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Last Name (English)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.last_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('last_name_english', e.target.value)}
                  placeholder="Last Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Full Name (English)
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.full_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('full_name_english', e.target.value)}
                  placeholder="Full Name"
                  size="small"
                  disabled
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Personal Details */}
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
                <Event />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Personal Details
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Date of Birth
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.personal_info?.date_of_birth || ''}
                  onChange={(e) => handlePersonalInfoChange('date_of_birth', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Place of Birth
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.place_of_birth || ''}
                  onChange={(e) => handlePersonalInfoChange('place_of_birth', e.target.value)}
                  placeholder="City, Country"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Nationality
                </Typography>
                <Autocomplete
                  options={countries}
                  value={formData.personal_info?.nationality || ''}
                  onChange={(_, value) => handlePersonalInfoChange('nationality', value)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select nationality" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Gender
                </Typography>
                <FormControl fullWidth size="small">
                  <RadioGroup
                    row
                    value={formData.personal_info?.gender || ''}
                    onChange={(e) => handlePersonalInfoChange('gender', e.target.value)}
                  >
                    <FormControlLabel value="male" control={<Radio size="small" />} label="Male" />
                    <FormControlLabel value="female" control={<Radio size="small" />} label="Female" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Blood Type
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={formData.personal_info?.blood_type || ''}
                  onChange={(e) => handlePersonalInfoChange('blood_type', e.target.value)}
                  size="small"
                  placeholder="Select blood type"
                >
                  {bloodTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Identification Documents */}
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
                <Badge />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Identification Documents
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  National ID Number
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.national_id || ''}
                  onChange={(e) => handlePersonalInfoChange('national_id', e.target.value)}
                  placeholder="Enter national ID number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Passport Number
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.passport_number || ''}
                  onChange={(e) => handlePersonalInfoChange('passport_number', e.target.value)}
                  placeholder="Enter passport number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Passport Expiry Date
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.personal_info?.passport_expiry || ''}
                  onChange={(e) => handlePersonalInfoChange('passport_expiry', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Contact Information */}
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
                <Phone />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Contact Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Personal Email
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={formData.personal_info?.personal_email || ''}
                  onChange={(e) => handlePersonalInfoChange('personal_email', e.target.value)}
                  placeholder="personal@email.com"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Personal Phone
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.personal_phone || ''}
                  onChange={(e) => handlePersonalInfoChange('personal_phone', e.target.value)}
                  placeholder="Enter personal phone"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Mobile Primary
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.mobile_primary || ''}
                  onChange={(e) => handlePersonalInfoChange('mobile_primary', e.target.value)}
                  placeholder="Primary mobile number"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Mobile Secondary
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.mobile_secondary || ''}
                  onChange={(e) => handlePersonalInfoChange('mobile_secondary', e.target.value)}
                  placeholder="Secondary mobile number"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Address Information */}
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
                <LocationOn />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Address Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Address Line 1
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.address_line1 || ''}
                  onChange={(e) => handlePersonalInfoChange('address_line1', e.target.value)}
                  placeholder="Street address, building, etc."
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Address Line 2
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.address_line2 || ''}
                  onChange={(e) => handlePersonalInfoChange('address_line2', e.target.value)}
                  placeholder="Apartment, suite, unit, etc. (optional)"
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  City
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.city || ''}
                  onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                  placeholder="Enter city"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  State/Province
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.state_province || ''}
                  onChange={(e) => handlePersonalInfoChange('state_province', e.target.value)}
                  placeholder="Enter state or province"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Postal Code
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.postal_code || ''}
                  onChange={(e) => handlePersonalInfoChange('postal_code', e.target.value)}
                  placeholder="Enter postal code"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Country
                </Typography>
                <Autocomplete
                  options={countries}
                  value={formData.personal_info?.country || ''}
                  onChange={(_, value) => handlePersonalInfoChange('country', value)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select country" />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Family Information */}
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
                <Person />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Family Information
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Marital Status
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={formData.personal_info?.marital_status || ''}
                  onChange={(e) => handlePersonalInfoChange('marital_status', e.target.value)}
                  size="small"
                  placeholder="Select marital status"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married">Married</MenuItem>
                  <MenuItem value="divorced">Divorced</MenuItem>
                  <MenuItem value="widowed">Widowed</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Number of Children
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.personal_info?.number_of_children || 0}
                  onChange={(e) => handlePersonalInfoChange('number_of_children', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>

              {formData.personal_info?.marital_status === 'married' && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                      Spouse Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.personal_info?.spouse_name || ''}
                      onChange={(e) => handlePersonalInfoChange('spouse_name', e.target.value)}
                      placeholder="Enter spouse name"
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                      Spouse Employment
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.personal_info?.spouse_employment || ''}
                      onChange={(e) => handlePersonalInfoChange('spouse_employment', e.target.value)}
                      placeholder="Spouse occupation/employer"
                      size="small"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Medical Conditions
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.medical_conditions || ''}
                  onChange={(e) => handlePersonalInfoChange('medical_conditions', e.target.value)}
                  placeholder="Any medical conditions to note"
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                  Allergies
                </Typography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.allergies || ''}
                  onChange={(e) => handlePersonalInfoChange('allergies', e.target.value)}
                  placeholder="Any known allergies"
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default PersonalInfoSection;