import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, CircularProgress, Chip
} from '@mui/material';
import {
  CheckCircle, Person, Email, Business, Security
} from '@mui/icons-material';

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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'success.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}
          >
            <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" color="success.main">
            Employee Created Successfully!
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to the team, {employeeName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The employee account has been created and system access has been configured.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
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
        </Box>

        <Box sx={{ 
          p: 3, 
          bgcolor: 'success.light', 
          opacity: 0.1, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'success.light'
        }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Next Steps:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • An email notification has been sent to the employee's email address<br />
            • The employee can now login to the system using their credentials<br />
            • System access has been configured according to their role<br />
            • HR team can now manage their attendance and payroll
          </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body2" color="text.secondary" component="span">
            Redirecting to employee details page...
          </Typography>
        </Box>
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