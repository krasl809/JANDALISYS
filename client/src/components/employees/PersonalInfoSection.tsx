import React from 'react';
import {
  Card, CardContent, Grid, TextField, MenuItem,
  FormControl, RadioGroup, FormControlLabel, Radio,
  InputAdornment, Autocomplete
} from '@mui/material';
import { LocationOn, Phone, Email } from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

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
        <Card sx={{ overflow: 'visible' }}>
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
              Basic Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Employee Name (Required) *
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Email Address (Required) *
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Phone Number
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Address
                </MDTypography>
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
              Arabic Names
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  First Name (Arabic)
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Middle Name (Arabic)
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Last Name (Arabic)
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Full Name (Arabic)
                </MDTypography>
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
              English Names
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  First Name (English)
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.first_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('first_name_english', e.target.value)}
                  placeholder="First Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Middle Name (English)
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.middle_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('middle_name_english', e.target.value)}
                  placeholder="Middle Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Last Name (English)
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.last_name_english || ''}
                  onChange={(e) => handlePersonalInfoChange('last_name_english', e.target.value)}
                  placeholder="Last Name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Full Name (English)
                </MDTypography>
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
              Personal Details
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Date of Birth
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Gender
                </MDTypography>
                <FormControl component="fieldset">
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

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Nationality
                </MDTypography>
                <Autocomplete
                  options={countries}
                  value={formData.personal_info?.nationality || null}
                  onChange={(_, newValue) => handlePersonalInfoChange('nationality', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Select country" size="small" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Marital Status
                </MDTypography>
                <TextField
                  select
                  fullWidth
                  value={formData.personal_info?.marital_status || ''}
                  onChange={(e) => handlePersonalInfoChange('marital_status', e.target.value)}
                  size="small"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married">Married</MenuItem>
                  <MenuItem value="divorced">Divorced</MenuItem>
                  <MenuItem value="widowed">Widowed</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Blood Type
                </MDTypography>
                <TextField
                  select
                  fullWidth
                  value={formData.personal_info?.blood_type || ''}
                  onChange={(e) => handlePersonalInfoChange('blood_type', e.target.value)}
                  size="small"
                >
                  {bloodTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Contact Information */}
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
              Contact Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Emergency Contact Name
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.emergency_contact_name || ''}
                  onChange={(e) => handlePersonalInfoChange('emergency_contact_name', e.target.value)}
                  placeholder="Enter contact name"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Emergency Contact Phone
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.emergency_contact_phone || ''}
                  onChange={(e) => handlePersonalInfoChange('emergency_contact_phone', e.target.value)}
                  placeholder="Enter contact phone"
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Identity Information */}
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
            mb="1"
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Identity Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  ID Number
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.id_number || ''}
                  onChange={(e) => handlePersonalInfoChange('id_number', e.target.value)}
                  placeholder="Enter ID number"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Passport Number
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.passport_number || ''}
                  onChange={(e) => handlePersonalInfoChange('passport_number', e.target.value)}
                  placeholder="Enter passport number"
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Communication Channels */}
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
              Communication Channels
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Personal Email
                </MDTypography>
                <TextField
                  fullWidth
                  type="email"
                  value={formData.personal_info?.personal_email || ''}
                  onChange={(e) => handlePersonalInfoChange('personal_email', e.target.value)}
                  placeholder="personal@email.com"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Alternative Phone
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.alternative_phone || ''}
                  onChange={(e) => handlePersonalInfoChange('alternative_phone', e.target.value)}
                  placeholder="Enter alternative phone"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Personal Phone
                </MDTypography>
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

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Mobile Primary
                </MDTypography>
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

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Mobile Secondary
                </MDTypography>
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

      {/* Detailed Address Information */}
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
              Detailed Address Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Address Line 1
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Address Line 2
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  City
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.city || ''}
                  onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                  placeholder="Enter city"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  State/Province
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.state_province || ''}
                  onChange={(e) => handlePersonalInfoChange('state_province', e.target.value)}
                  placeholder="Enter state or province"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Postal Code
                </MDTypography>
                <TextField
                  fullWidth
                  value={formData.personal_info?.postal_code || ''}
                  onChange={(e) => handlePersonalInfoChange('postal_code', e.target.value)}
                  placeholder="Enter postal code"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Country
                </MDTypography>
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

      {/* Family & Medical Information */}
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
              Family & Medical Information
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Marital Status
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Number of Children
                </MDTypography>
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
                    <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                      Spouse Name
                    </MDTypography>
                    <TextField
                      fullWidth
                      value={formData.personal_info?.spouse_name || ''}
                      onChange={(e) => handlePersonalInfoChange('spouse_name', e.target.value)}
                      placeholder="Enter spouse name"
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                      Spouse Employment
                    </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Medical Conditions
                </MDTypography>
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
                <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ mb: 1, display: 'block' }}>
                  Allergies
                </MDTypography>
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