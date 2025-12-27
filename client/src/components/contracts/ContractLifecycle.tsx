import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Divider, Chip, 
  Stepper, Step, StepLabel, StepConnector, Button, IconButton, Stack,
  CircularProgress, Alert
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { 
  Description, LocalShipping, AccountBalance, CheckCircle, ArrowBack, 
  Download, Warning, Edit 
} from '@mui/icons-material';
import { stepConnectorClasses } from '@mui/material/StepConnector';
import api from '../../services/api';

// Custom Styles for Pipeline
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(56, 189, 248) 0%,rgb(74, 222, 128) 50%,rgb(34, 197, 94) 100%)' },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(56, 189, 248) 0%,rgb(74, 222, 128) 50%,rgb(34, 197, 94) 100%)' },
  },
  [`& .${stepConnectorClasses.line}`]: { height: 3, border: 0, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0', borderRadius: 1 },
}));

const ColorlibStepIconRoot = styled('div')<{ ownerState: { completed?: boolean; active?: boolean } }>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1, color: '#fff', width: 50, height: 50, display: 'flex', borderRadius: '50%', justifyContent: 'center', alignItems: 'center',
  ...(ownerState.active && { backgroundImage: 'linear-gradient( 136deg, rgb(56, 189, 248) 0%, rgb(37, 99, 235) 100%)', boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)' }),
  ...(ownerState.completed && { backgroundImage: 'linear-gradient( 136deg, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 100%)' }),
}));

function ColorlibStepIcon(props: any) {
  const icons: { [index: string]: React.ReactElement } = { 1: <Description />, 2: <LocalShipping />, 3: <AccountBalance /> };
  return <ColorlibStepIconRoot ownerState={{ completed: props.completed, active: props.active }}>{icons[String(props.icon)]}</ColorlibStepIconRoot>;
}

const ContractLifecycle = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<FinancialTransaction[]>([]);

  const steps = ['Contract Signed', 'Shipping / Transit', 'Clearance & Payment'];

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        
        // Fetch Contract Data
        const contractResponse = await api.get(`/contracts/${id}`);
        const contractData = contractResponse.data;
        
        // Fetch Ledger Data
        try {
          const ledgerResponse = await api.get(`/contracts/${id}/ledger`);
          setLedger(ledgerResponse.data);
        } catch (ledgerErr) {
          console.warn('Failed to fetch ledger, continuing without it:', ledgerErr);
          setLedger([]);
        }
        
        setContract(contractData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching contract:', err);
        
        let errorMessage = 'Failed to fetch contract data';
        
        if (err.response?.status === 404) {
          errorMessage = 'Contract not found';
        } else if (err.response?.status === 401) {
          errorMessage = 'Please login first';
        } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
          errorMessage = 'Failed to connect to server. Make sure server is running';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
        fetchContract();
    }
  }, [id]);

  if (loading) {
    return (
      <Container sx={{ mt: 10, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading contract data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 10 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/contracts')}
          >
            Back to Contracts
          </Button>
        </Box>
      </Container>
    );
  }

  if (!contract) {
    return (
      <Container sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="h5">Contract Not Found</Typography>
        <Button onClick={() => navigate('/contracts')}>Back</Button>
      </Container>
    );
  }

  // حساب القيم المالية
  const totalValue = contract.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
  const currentStep = contract.status === 'draft' ? 0 : contract.status === 'confirmed' ? 1 : 2;

  return (
    <Container maxWidth={false} sx={{ mt: 4 }}>
      <Box display="flex" alignItems="center" mb={4} gap={2}>
        <IconButton onClick={() => navigate(-1)} sx={{ border: `1px solid ${theme.palette.divider}` }}><ArrowBack /></IconButton>
        <Box>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" fontWeight="800">{contract.contract_no || 'Draft'}</Typography>
                <Chip label={contract.status} color="primary" sx={{ fontWeight: 'bold' }} />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {contract.direction === 'import' ? 'Import' : 'Export'} — 
              {contract.items?.[0]?.article_name || 'Not specified'}
            </Typography>
        </Box>
        <Box flexGrow={1} />
        <Button variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/contracts/${id}/edit`)}>Edit</Button>
      </Box>

      <Card sx={{ mb: 4, py: 5, borderRadius: 4 }}>
        <Stepper alternativeLabel activeStep={currentStep} connector={<ColorlibConnector />}>
          {steps.map((label) => (<Step key={label}><StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel></Step>))}
        </Stepper>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%', borderRadius: 4, p: 3 }}>
                <Typography variant="h6" fontWeight="bold" mb={3}>Financial Summary</Typography>
                <Box display="flex" justifyContent="space-around" textAlign="center">
                    <Box>
                      <Typography color="text.secondary">Average Price</Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${contract.items?.[0]?.price || 0} / MT
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography color="text.secondary">Total Value</Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${totalValue.toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography color="text.secondary">Currency</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">
                        {contract.contract_currency || 'USD'}
                      </Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
        <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 4, p: 3 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>Contract Details</Typography>
                <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                      <Typography>{contract.issue_date || 'Not specified'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Shipment Date</Typography>
                      <Typography>{contract.shipment_date || 'Not specified'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Payment Terms</Typography>
                      <Typography>{contract.payment_terms || 'Not specified'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Destination</Typography>
                      <Typography>{contract.destination || 'Not specified'}</Typography>
                    </Box>
                </Stack>
            </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

const DocItem = ({ label, status }: { label: string, status: boolean }) => (
    <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} border="1px solid #eee" borderRadius={2}>
        <Box display="flex" gap={1}>{status ? <CheckCircle color="success" fontSize="small"/> : <Warning color="warning" fontSize="small"/>}<Typography>{label}</Typography></Box>
        <Chip label={status?"OK":"Pending"} size="small" color={status?"success":"warning"} />
    </Box>
);

export default ContractLifecycle;