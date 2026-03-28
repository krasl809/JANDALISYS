import React from 'react';
import {
  Card, CardContent, Grid, TextField, Typography, Divider, Box
} from '@mui/material';
import {
  Person, Business, SupervisorAccount, Work, AccountBalance, EventAvailable
} from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

interface ManagersAndLeaveSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const ManagersAndLeaveSection: React.FC<ManagersAndLeaveSectionProps> = ({
  formData,
  onInputChange
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <MDTypography variant="h6" fontWeight="bold" mb={3}>
          المدراء ورصيد الإجازات
        </MDTypography>

        {/* قسم المدراء */}
        <Box mb={4}>
          <MDTypography variant="subtitle1" fontWeight="bold" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupervisorAccount color="primary" />
            المدراء المسؤولون
          </MDTypography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المسؤول المباشر"
                value={formData.direct_manager || ''}
                onChange={(e) => onInputChange('direct_manager', e.target.value)}
                InputProps={{
                  startAdornment: <Person color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مدير المنشأة"
                value={formData.facility_manager || ''}
                onChange={(e) => onInputChange('facility_manager', e.target.value)}
                InputProps={{
                  startAdornment: <Business color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المدير المركزي"
                value={formData.central_manager || ''}
                onChange={(e) => onInputChange('central_manager', e.target.value)}
                InputProps={{
                  startAdornment: <Work color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مدير الموارد البشرية"
                value={formData.hr_manager || ''}
                onChange={(e) => onInputChange('hr_manager', e.target.value)}
                InputProps={{
                  startAdornment: <AccountBalance color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المدير التنفيذي"
                value={formData.ceo || ''}
                onChange={(e) => onInputChange('ceo', e.target.value)}
                InputProps={{
                  startAdornment: <Person color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* قسم رصيد الإجازات */}
        <Box>
          <MDTypography variant="subtitle1" fontWeight="bold" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventAvailable color="primary" />
            رصيد الإجازات
          </MDTypography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="رصيد الإجازات أول السنة"
                value={formData.beginning_year_leave_balance || 0}
                onChange={(e) => onInputChange('beginning_year_leave_balance', parseInt(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <EventAvailable color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="رصيد الإجازات المتبقي"
                value={formData.remaining_leave_balance || 0}
                onChange={(e) => onInputChange('remaining_leave_balance', parseInt(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <EventAvailable color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ManagersAndLeaveSection;
