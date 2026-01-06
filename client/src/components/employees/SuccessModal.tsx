import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  CircularProgress, Chip
} from '@mui/material';
import {
  CheckCircle, Person, Email, Business, Security
} from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  employeeName: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  employeeName
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <MDBox sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <MDBox
            variant="gradient"
            bgColor="success"
            coloredShadow="success"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}
          >
            <CheckCircle sx={{ fontSize: 48, color: 'white' }} />
          </MDBox>
          <MDTypography variant="h4" fontWeight="bold" color="success">
            Employee Created Successfully!
          </MDTypography>
        </MDBox>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center' }}>
        <MDBox sx={{ mb: 3 }}>
          <MDTypography variant="h6" gutterBottom>
            Welcome to the team, {employeeName}!
          </MDTypography>
          <MDTypography variant="body1" color="text">
            The employee account has been created and system access has been configured.
          </MDTypography>
        </MDBox>

        <MDBox sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
          <Chip 
            icon={<Person />} 
            label="Account Created" 
            color="success" 
            variant="outlined"
          />
          <Chip 
            icon={<Email />} 
            label="Email Setup" 
            color="success" 
            variant="outlined"
          />
          <Chip 
            icon={<Business />} 
            label="Department Assigned" 
            color="success" 
            variant="outlined"
          />
          <Chip 
            icon={<Security />} 
            label="Access Configured" 
            color="success" 
            variant="outlined"
          />
        </MDBox>

        <MDBox 
          variant="gradient"
          bgColor="light"
          sx={{ 
            p: 3, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.300'
          }}
        >
          <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom display="block">
            Next Steps:
          </MDTypography>
          <MDTypography variant="body2" color="text">
            • An email notification has been sent to the employee's email address<br />
            • The employee can now login to the system using their credentials<br />
            • System access has been configured according to their role<br />
            • HR team can now manage their attendance and payroll
          </MDTypography>
        </MDBox>

        <MDBox sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <MDTypography variant="body2" color="text">
            Redirecting to employee details page...
          </MDTypography>
        </MDBox>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={onClose}
          sx={{ minWidth: 120 }}
        >
          View Details
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessModal;