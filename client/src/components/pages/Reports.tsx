import { useState } from 'react';
import { 
  Box, Container, Typography, Grid, Card, CardContent, Button, 
  Tabs, Tab, MenuItem, Select, FormControl, InputLabel, Stack, 
  Avatar, Chip, LinearProgress, useTheme, Table, 
  TableHead, TableRow, TableCell, TableBody 
} from '@mui/material';
import { 
  Download, FilterList, TrendingUp, TrendingDown, 
  AttachMoney, Inventory, LocalShipping, PieChart as PieIcon, 
  ShowChart, BarChart as BarChartIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

// --- MOCK DATA ---
const monthlyData = [
  { name: 'Jan', revenue: 4000, cost: 2400, profit: 1600 },
  { name: 'Feb', revenue: 3000, cost: 1398, profit: 1602 },
  { name: 'Mar', revenue: 9800, cost: 6800, profit: 3000 },
  { name: 'Apr', revenue: 3908, cost: 2780, profit: 1128 },
  { name: 'May', revenue: 4800, cost: 1890, profit: 2910 },
  { name: 'Jun', revenue: 3800, cost: 2390, profit: 1410 },
  { name: 'Jul', revenue: 4300, cost: 3490, profit: 810 },
];

const commodityData = [
  { name: 'Wheat', value: 4500, color: '#3B82F6' },
  { name: 'Sugar', value: 3200, color: '#10B981' },
  { name: 'Corn', value: 2100, color: '#F59E0B' },
  { name: 'Barley', value: 1500, color: '#EF4444' },
  { name: 'Soybean', value: 900, color: '#8B5CF6' },
];

const kpiData = [
    { title: 'Total Revenue', value: '$12.4M', change: '+12.5%', isPositive: true, icon: <AttachMoney /> },
    { title: 'Gross Profit', value: '$3.2M', change: '+8.2%', isPositive: true, icon: <TrendingUp /> },
    { title: 'Total Volume', value: '45k MT', change: '-2.4%', isPositive: false, icon: <Inventory /> },
    { title: 'Active Shipments', value: '12', change: '+4', isPositive: true, icon: <LocalShipping /> },
];

// --- HELPER COMPONENTS ---

const StatCard = ({ title, value, change, isPositive, icon }: any) => {
    const theme = useTheme();
    return (
        <Card sx={{ height: '100%', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">{title}</Typography>
                        <Typography variant="h4" fontWeight="800" sx={{ my: 1 }}>{value}</Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip 
                                label={change} 
                                size="small" 
                                color={isPositive ? 'success' : 'error'} 
                                icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                                sx={{ borderRadius: 1.5, height: 24, fontWeight: 'bold' }}
                            />
                            <Typography variant="caption" color="text.secondary">vs last month</Typography>
                        </Stack>
                    </Box>
                    <Avatar variant="rounded" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 48, height: 48 }}>
                        {icon}
                    </Avatar>
                </Box>
            </CardContent>
        </Card>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Card sx={{ p: 1.5, borderRadius: 2, boxShadow: 3, border: 'none' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>{label}</Typography>
                {payload.map((entry: any, index: number) => (
                    <Box key={index} display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                        <Typography variant="caption" color="text.secondary">{entry.name}:</Typography>
                        <Typography variant="caption" fontWeight="bold">${entry.value.toLocaleString()}</Typography>
                    </Box>
                ))}
            </Card>
        );
    }
    return null;
};

// --- MAIN PAGE ---

const Reports = () => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [period, setPeriod] = useState('this_year');

  const handleTabChange = (_: any, newValue: number) => setCurrentTab(newValue);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      
      {/* 1. Header & Controls */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={4} gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>Analytics & Reports</Typography>
          <Typography variant="body1" color="text.secondary">
             Comprehensive insights into financial performance and trade operations.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<Download />} sx={{ borderRadius: 2 }}>Export PDF</Button>
            <Button variant="contained" startIcon={<FilterList />} sx={{ borderRadius: 2, px: 3 }}>Filters</Button>
        </Stack>
      </Box>

      {/* 2. Global Filters Bar */}
      <Card sx={{ mb: 4, borderRadius: 3, p: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                    <InputLabel>Time Period</InputLabel>
                    <Select value={period} label="Time Period" onChange={(e) => setPeriod(e.target.value)}>
                        <MenuItem value="this_month">This Month</MenuItem>
                        <MenuItem value="last_quarter">Last Quarter</MenuItem>
                        <MenuItem value="this_year">This Year (YTD)</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                    <InputLabel>Currency</InputLabel>
                    <Select value="USD" label="Currency">
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="EUR">EUR (€)</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
                 <Tabs value={currentTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
                    <Tab icon={<ShowChart fontSize="small" />} iconPosition="start" label="Financial" sx={{ fontWeight: 600 }} />
                    <Tab icon={<PieIcon fontSize="small" />} iconPosition="start" label="Commodities" sx={{ fontWeight: 600 }} />
                    <Tab icon={<BarChartIcon fontSize="small" />} iconPosition="start" label="Operational" sx={{ fontWeight: 600 }} />
                 </Tabs>
            </Grid>
        </Grid>
      </Card>

      {/* 3. Dashboard Content */}
      <Box>
        {/* === TAB 0: FINANCIAL === */}
        {currentTab === 0 && (
            <Grid container spacing={3}>
                {/* KPIs */}
                {kpiData.map((kpi, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <StatCard {...kpi} />
                    </Grid>
                ))}

                {/* Main Revenue Chart */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <Typography variant="h6" fontWeight="bold">Revenue & Profit Trend</Typography>
                            <Chip label="YTD Performance" size="small" variant="outlined" />
                        </Box>
                        <Box sx={{ height: 350, minHeight: 350, width: '100%', position: 'relative', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme.palette.text.secondary}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: theme.palette.text.secondary}} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.palette.text.secondary, strokeDasharray: '5 5' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} fillOpacity={1} fill="url(#colorRev)" name="Revenue" strokeWidth={3} />
                                <Area type="monotone" dataKey="profit" stroke={theme.palette.success.main} fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>

                {/* Cost Distribution */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>Cost Breakdown</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', height: 250, minHeight: 250, width: '100%', position: 'relative', minWidth: 0 }}>
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'COGS', value: 65, color: '#3B82F6' },
                                            { name: 'Logistics', value: 20, color: '#F59E0B' },
                                            { name: 'Overhead', value: 15, color: '#10B981' },
                                        ]}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                                        paddingAngle={5} dataKey="value"
                                    >
                                        {[{color:'#3B82F6'},{color:'#F59E0B'},{color:'#10B981'}].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                             </ResponsiveContainer>
                        </Box>
                        <Stack spacing={2} mt={2}>
                            <Box display="flex" justifyContent="space-between"><Typography variant="body2">Cost of Goods</Typography><Typography variant="body2" fontWeight="bold">65%</Typography></Box>
                            <LinearProgress variant="determinate" value={65} sx={{ height: 6, borderRadius: 5, bgcolor: alpha('#3B82F6', 0.2), '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6' } }} />
                            
                            <Box display="flex" justifyContent="space-between"><Typography variant="body2">Logistics</Typography><Typography variant="body2" fontWeight="bold">20%</Typography></Box>
                            <LinearProgress variant="determinate" value={20} sx={{ height: 6, borderRadius: 5, bgcolor: alpha('#F59E0B', 0.2), '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }} />
                        </Stack>
                    </Card>
                </Grid>
            </Grid>
        )}

        {/* === TAB 1: COMMODITIES === */}
        {currentTab === 1 && (
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>Volume by Commodity</Typography>
                        <Box sx={{ height: 300, minHeight: 300, width: '100%', position: 'relative', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={commodityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fill: theme.palette.text.primary, fontWeight: 500}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {commodityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>Performance Matrix</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Commodity</TableCell>
                                    <TableCell align="right">Revenue</TableCell>
                                    <TableCell align="right">Margin</TableCell>
                                    <TableCell align="right">Trend</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {commodityData.map((row) => (
                                    <TableRow key={row.name}>
                                        <TableCell sx={{fontWeight:'bold'}}>{row.name}</TableCell>
                                        <TableCell align="right">${(row.value * 1.2).toLocaleString()}</TableCell>
                                        <TableCell align="right" sx={{color:'success.main'}}>8.5%</TableCell>
                                        <TableCell align="right"><TrendingUp fontSize="small" color="success" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </Grid>
            </Grid>
        )}
        
        {/* === TAB 2: OPERATIONAL === */}
        {currentTab === 2 && (
             <Grid container spacing={3}>
                <Grid item xs={12}>
                     <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center', border: `1px dashed ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                         <Typography variant="h6" color="text.secondary">Operational metrics are being aggregated...</Typography>
                         <Button variant="outlined" sx={{mt:2}}>Load Data</Button>
                     </Card>
                </Grid>
             </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Reports;