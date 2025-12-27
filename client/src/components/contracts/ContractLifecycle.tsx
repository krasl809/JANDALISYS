import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Divider, Chip, 
  Stepper, Step, StepLabel, StepConnector, Button, IconButton, Stack,
  CircularProgress, Alert, Table, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { 
  Description, LocalShipping, AccountBalance, CheckCircle, ArrowBack, 
  Warning, Edit, ReceiptLong, History
} from '@mui/icons-material';
import { stepConnectorClasses } from '@mui/material/StepConnector';
import api from '../../services/api';
import { Contract, FinancialTransaction } from '../../types/contracts';
import SectionHeader from '../common/SectionHeader';

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

interface ColorlibStepIconProps {
  active?: boolean;
  completed?: boolean;
  icon: React.ReactNode;
}

function ColorlibStepIcon(props: ColorlibStepIconProps) {
  const icons: { [index: string]: React.ReactElement } = { 
    1: <Description />, 
    2: <LocalShipping />, 
    3: <AccountBalance /> 
  };
  
  return (
    <ColorlibStepIconRoot ownerState={{ completed: props.completed, active: props.active }}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
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

  // Calculate financial values
  const totalValue = contract.items?.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0) || 0;
  const avgPrice = contract.items?.length > 0 
    ? contract.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0) / contract.items.length 
    : 0;

  const getStep = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'draft':
      case 'pending':
        return 0;
      case 'active':
      case 'posted':
        return 1;
      case 'completed':
        return 2;
      case 'cancelled':
        return -1; // Special case for cancelled
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'active':
      case 'posted': return 'info';
      case 'draft':
      case 'pending': return 'warning';
      default: return 'primary';
    }
  };

  const currentStep = getStep(contract.status);

  return (
    <Container maxWidth={false} sx={{ mt: 4, pb: 4 }}>
      <Box display="flex" alignItems="center" mb={4} gap={2}>
        <IconButton onClick={() => navigate(-1)} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" fontWeight="800" color="primary.main">
                  {contract.contract_no || 'Draft Contract'}
                </Typography>
                <Chip 
                  label={contract.status.toUpperCase()} 
                  color={getStatusColor(contract.status) as any} 
                  sx={{ fontWeight: 'bold', borderRadius: 1.5 }} 
                />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {contract.direction === 'import' ? 'Import Operation' : 'Export Operation'} — 
              {contract.items?.[0]?.article_name || 'Generic Commodity'}
            </Typography>
        </Box>
        <Box flexGrow={1} />
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<Edit />} 
            onClick={() => navigate(`/contracts/${id}/edit`)}
            sx={{ borderRadius: 2 }}
          >
            Edit Contract
          </Button>
        </Stack>
      </Box>

      <Card elevation={0} sx={{ 
        mb: 4, py: 5, borderRadius: 4, 
        border: `1px solid ${contract.status === 'cancelled' ? theme.palette.error.light : theme.palette.divider}`,
        bgcolor: contract.status === 'cancelled' ? alpha(theme.palette.error.main, 0.02) : 'transparent'
      }}>
        {contract.status === 'cancelled' ? (
          <Box textAlign="center">
            <Warning color="error" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" color="error.main" fontWeight="700">This contract has been cancelled</Typography>
          </Box>
        ) : (
          <Stepper alternativeLabel activeStep={currentStep} connector={<ColorlibConnector />}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 4, p: 3, border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeader title="Financial Summary" icon={<AccountBalance fontSize="small" />} />
                <Box display="flex" justifyContent="space-around" textAlign="center" py={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Average Price</Typography>
                      <Typography variant="h5" fontWeight="800" sx={{ mt: 1 }}>
                        {avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} <Typography component="span" variant="body2" color="text.secondary">/ MT</Typography>
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Total Value</Typography>
                      <Typography variant="h5" fontWeight="800" color="primary.main" sx={{ mt: 1 }}>
                        {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Currency</Typography>
                      <Typography variant="h5" fontWeight="800" color="success.main" sx={{ mt: 1 }}>
                        {contract.contract_currency || 'USD'}
                      </Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
        <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 4, p: 3, border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeader title="Key Milestones" icon={<Description fontSize="small" />} />
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">Issue Date</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.issue_date || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">Shipment Date</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.shipment_date || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">Payment Terms</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.payment_terms || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">Destination</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.destination || '—'}</Typography>
                    </Box>
                </Stack>
            </Card>
        </Grid>
      </Grid>

      {/* 4. Financial Ledger Section */}
      <Card elevation={0} sx={{ mt: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 3 }}>
          <SectionHeader title="Transaction History & Ledger" icon={<History fontSize="small" />} />
          {ledger.length === 0 ? (
            <Box textAlign="center" py={6}>
              <ReceiptLong sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No financial transactions recorded for this contract yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Reference</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Debit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Credit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>{tx.transaction_date}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">{tx.description}</Typography>
                        <Typography variant="caption" color="text.secondary">{tx.type}</Typography>
                      </TableCell>
                      <TableCell>{tx.reference || '—'}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {tx.debit ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {tx.credit ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {tx.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    '& td': { borderTop: `2px solid ${theme.palette.primary.main}` }
                  }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 'bold', textAlign: 'right', py: 2, fontSize: '0.85rem' }}>
                      SUMMARY TOTALS ({contract.contract_currency})
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: '800', color: 'error.main', fontSize: '0.9rem' }}>
                      {ledger.reduce((sum, tx) => sum + (tx.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: '800', color: 'success.main', fontSize: '0.9rem' }}>
                      {ledger.reduce((sum, tx) => sum + (tx.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ 
                      fontWeight: '900', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.dark,
                      fontSize: '1rem'
                    }}>
                      {ledger.length > 0 ? (ledger[ledger.length - 1].balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Card>
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