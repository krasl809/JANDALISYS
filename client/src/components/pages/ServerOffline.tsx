import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { WifiOff as WifiOffIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const ServerOffline: React.FC = () => {
  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 4,
            width: '100%',
          }}
        >
          <WifiOffIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            الخادم لا يعمل
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
            Server is Offline
          </Typography>

          <Box sx={{ mt: 3, mb: 4 }}>
            <Typography variant="body1" paragraph>
              عذراً، يبدو أن خادم النظام متوقف حالياً أو لا يمكن الاتصال به. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم الفني.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sorry, it seems the system server is currently down or unreachable. Please try again later or contact technical support.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem'
            }}
          >
            إعادة المحاولة / Retry
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ServerOffline;
