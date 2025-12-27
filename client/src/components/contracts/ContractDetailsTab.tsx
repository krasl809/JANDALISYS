import React from 'react';
import { Box, Card, CardContent, Grid, Typography, useTheme, alpha, Chip, Stepper, Step, StepLabel, CircularProgress, InputAdornment, RadioGroup, FormControlLabel, Radio, Tooltip, IconButton, Divider, Stack, Button, TextField } from '@mui/material';
import { ArrowForward, ImportExport, Event, EditCalendar, Map, Business, AttachMoney, Description, PriceCheck, LocalShipping, Receipt, Payment, AccountBalanceWallet, Folder, Print, Save, Send, Delete, AddCircleOutline, Remove } from '@mui/icons-material';
import FormField from '../common/FormField';
import DataTable, { Column } from '../common/DataTable';
import SectionHeader from '../common/SectionHeader';
import { v4 as uuidv4 } from 'uuid';
import { ContractDetailsTabProps, Article } from '../../types/contracts';

const ContractDetailsTab: React.FC<ContractDetailsTabProps> = ({
  formData,
  items,
  mode,
  isShipmentDate,
  lists,
  isFixedPrice,
  totalAmount,
  handleInputChange,
  handleItemChange,
  handleAddItem,
  handleRemoveItem,
  setIsShipmentDate,
  canEditContract,
  handleSave,
  handleGenerateNumber,
  isGeneratingNo,
  id,
  navigate,
  setDeleteDialogOpen,
}) => {
  const theme = useTheme();

  const headerSx = {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    color: theme.palette.text.secondary,
    fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase',
    borderBottom: `1px solid ${theme.palette.divider}`, padding: '12px 16px',
  };

  const cellSx = {
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '8px 12px',
    color: theme.palette.text.primary
  };

  const inputTableSx = {
    '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: theme.palette.divider },
    fontSize: '0.9rem'
  };

  const itemColumns: Column[] = [
    {
      key: 'article_id',
      label: 'Article',
      type: 'autocomplete' as const,
      width: '25%',
      options: lists.articles,
      getOptionLabel: (opt: Article) => opt?.article_name || '',
    },
    ...(mode === 'import' ? [{
      key: 'qty_lot',
      label: 'Qty (Lot)',
      type: 'number' as const,
    }] : []),
    {
      key: 'qty_ton',
      label: mode === 'export' ? 'Quantity (MT)' : 'Qty (Ton)',
      type: 'number' as const,
      endAdornment: <Typography variant="caption">MT</Typography>,
    },
    {
      key: 'packing',
      label: 'Packing',
      type: 'text' as const,
    },
    ...(mode === 'import' && !isFixedPrice ? [{
      key: 'premium',
      label: 'Premium',
      type: 'number' as const,
    }] : [{
      key: 'price',
      label: 'Price',
      type: 'number' as const,
    }]),
    {
      key: 'total',
      label: 'Total',
      type: 'text' as const,
      align: 'right',
      renderCell: (value: number) => (
        <Typography sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      {/* LEFT COLUMN */}
      <Grid xs={12} lg={8}>
        {/* 1. General Info */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <CardContent>
            <SectionHeader title="General Information" icon={<Description fontSize="small" />} />
            <Grid container spacing={3}>
              <FormField
                label="Contract Reference No."
                type="text"
                value={formData.contract_no}
                disabled
                gridSize={{ xs: 12, md: 6 }}
                inputProps={{
                  sx: { bgcolor: theme.palette.action.hover },
                  endAdornment: isGeneratingNo && <CircularProgress size={20}/>,
                }}
              />
              {mode === 'import' && (
                <Grid xs={12} md={6}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Pricing Model
                    </span>
                  </div>
                  <RadioGroup
                    row
                    value={formData.contract_type}
                    onChange={(e) => {
                      handleInputChange('contract_type', e.target.value);
                      handleItemChange('all', 'price', '0');
                      handleItemChange('all', 'premium', '0');
                      handleItemChange('all', 'total', 0);
                    }}
                  >
                    <FormControlLabel value="fixed_price" control={<Radio size="small"/>} label={<Typography variant="body2">Fixed Price</Typography>} />
                    <FormControlLabel value="stock_market" control={<Radio size="small"/>} label={<Typography variant="body2">Stock Market</Typography>} />
                  </RadioGroup>
                </Grid>
              )}
              <FormField
                label="Currency"
                type="select"
                value={formData.contract_currency}
                onChange={(value: string) => handleInputChange('contract_currency', value)}
                options={['USD', 'EUR', 'SAR', 'GBP'].map(c => ({ value: c, label: c }))}
                gridSize={{ xs: 12, md: 6 }}
              />
              <FormField
                label="Issue Date"
                type="date"
                value={formData.issue_date}
                onChange={(value: string) => handleInputChange('issue_date', value)}
                required
                gridSize={{ xs: 12, md: 6 }}
              />
              <FormField
                label="Actual Shipped Quantity"
                type="number"
                value={formData.actual_shipped_quantity}
                onChange={(value: string) => handleInputChange('actual_shipped_quantity', value)}
                gridSize={{ xs: 12, md: 6 }}
                inputProps={{
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="600">MT</Typography></InputAdornment>,
                }}
              />
            </Grid>
          </CardContent>
        </Card>

        {/* 2. Product Details Table */}
        <Card elevation={0} sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <SectionHeader title="Product Specifications" icon={<Receipt fontSize="small" />} />
          </Box>
          <DataTable
            columns={itemColumns}
            data={items}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
            onChange={handleItemChange}
            keyField="id"
            headerSx={headerSx}
            cellSx={cellSx}
            inputTableSx={inputTableSx}
          />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Button startIcon={<AddCircleOutline />} onClick={handleAddItem} size="small" variant="text">Add Line Item</Button>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">GRAND TOTAL ({formData.contract_currency})</Typography>
              <Typography variant="h5" fontWeight="800" color="primary.main">
                {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* 3. Charter Party (Import Only) */}
        {mode === 'import' && (
          <Card elevation={0} sx={{ mb: 3 }}>
            <CardContent>
              <SectionHeader title="Charter Party" icon={<LocalShipping fontSize="small" />} />
              <Grid container spacing={3}>
                <FormField
                  label="Vessel Name"
                  type="text"
                  value={formData.vessel_name}
                  onChange={(value: string) => handleInputChange('vessel_name', value)}
                  gridSize={{ xs: 12 }}
                  placeholder="Enter vessel name"
                />
                <FormField
                  label="Demurrage Rate"
                  type="number"
                  value={formData.demurrage_rate}
                  onChange={(value: string) => handleInputChange('demurrage_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end">{formData.contract_currency}/WWD</InputAdornment>,
                  }}
                />
                <FormField
                  label="Discharge Rate"
                  type="number"
                  value={formData.discharge_rate}
                  onChange={(value: string) => handleInputChange('discharge_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end">MT/WWD</InputAdornment>,
                  }}
                />
                <FormField
                  label="Dispatch Rate"
                  type="select"
                  value={formData.dispatch_rate}
                  onChange={(value: string) => handleInputChange('dispatch_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end">{formData.contract_currency}/WWD</InputAdornment>,
                  }}
                  selectProps={{
                    displayEmpty: true,
                    renderValue: (): React.ReactNode => formData.dispatch_rate || 'Select Option',
                  }}
                  options={[
                    { value: "free", label: "Free" },
                    { value: "half", label: "Half Demurrage Rate" }
                  ]}
                />
                <FormField
                  label="Laycan Date (From)"
                  type="date"
                  value={formData.laycan_date_from}
                  onChange={(value: string) => handleInputChange('laycan_date_from', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
                <FormField
                  label="Laycan Date (To)"
                  type="date"
                  value={formData.laycan_date_to}
                  onChange={(value: string) => handleInputChange('laycan_date_to', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
              </Grid>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* RIGHT COLUMN: Parties & Terms */}
      <Grid xs={12} lg={4}>
        <Stack spacing={3}>
          {/* 4. Parties */}
          <Card elevation={0}>
            <CardContent>
              <SectionHeader title="Business Parties" icon={<Business fontSize="small" />} />
              <Stack spacing={2}>
                <FormField
                  label="Seller"
                  type="autocomplete"
                  value={formData.seller_id}
                  onChange={(value: string) => {
                    handleInputChange('seller_id', value);
                    handleGenerateNumber(value);
                  }}
                  autocompleteOptions={lists.sellers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                  required
                />
                <FormField
                  label="Buyer"
                  type="autocomplete"
                  value={formData.buyer_id}
                  onChange={(value: string) => handleInputChange('buyer_id', value)}
                  autocompleteOptions={lists.buyers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                  required
                />
                <FormField
                  label="Shipper"
                  type="autocomplete"
                  value={formData.shipper_id}
                  onChange={(value: string) => handleInputChange('shipper_id', value)}
                  autocompleteOptions={lists.shippers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                />
                {mode === 'import' && (
                  <>
                    <FormField
                      label="Broker"
                      type="autocomplete"
                      value={formData.broker_id}
                      onChange={(value: string) => handleInputChange('broker_id', value)}
                      autocompleteOptions={lists.brokers}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                    <FormField
                      label="Agent"
                      type="autocomplete"
                      value={formData.agent_id}
                      onChange={(value: string) => handleInputChange('agent_id', value)}
                      autocompleteOptions={lists.agents}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                    <FormField
                      label="Conveyor"
                      type="autocomplete"
                      value={formData.conveyor_id}
                      onChange={(value: string) => handleInputChange('conveyor_id', value)}
                      autocompleteOptions={lists.conveyors}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0}>
            <CardContent>
              <SectionHeader title="Commercial Terms" icon={<AttachMoney fontSize="small" />} />
              <Grid container spacing={2}>
                <FormField
                  label="Payment Terms"
                  type="text"
                  value={formData.payment_terms}
                  onChange={(value: string) => handleInputChange('payment_terms', value)}
                  gridSize={{ xs: 12 }}
                />
                <FormField
                  label="Incoterms"
                  type="text"
                  value={formData.incoterms}
                  onChange={(value: string) => handleInputChange('incoterms', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
                <Grid xs={12} md={6}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {mode === 'export' ? "Shipment Date *" : (isShipmentDate ? "Shipment Date *" : "Shipment Period (FTA) *")}
                    </span>
                  </div>
                  {mode === 'export' ? (
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      value={formData.shipment_date || ''}
                      onChange={(e) => handleInputChange('shipment_date', e.target.value)}
                    />
                  ) : isShipmentDate ? (
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      value={formData.shipment_date || ''}
                      onChange={(e) => {
                        handleInputChange('shipment_date', e.target.value);
                        handleInputChange('shipment_period', '');
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Switch to FTA">
                              <IconButton
                                size="small"
                                onClick={() => setIsShipmentDate(false)}
                                sx={{ color: 'primary.main' }}
                              >
                                <EditCalendar fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <TextField
                      type="text"
                      fullWidth
                      size="small"
                      placeholder="e.g. Prompt Shipment"
                      value={formData.shipment_period || ''}
                      onChange={(e) => {
                        handleInputChange('shipment_period', e.target.value);
                        handleInputChange('shipment_date', null);
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.info.main, 0.03) } }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Switch to Date">
                              <IconButton
                                size="small"
                                onClick={() => setIsShipmentDate(true)}
                                sx={{ color: 'primary.main' }}
                              >
                                <Event fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                </Grid>
                {mode === 'export' ? (
                  <FormField
                    label="Destination"
                    type="text"
                    value={formData.destination}
                    onChange={(value: string) => handleInputChange('destination', value)}
                    gridSize={{ xs: 12 }}
                  />
                ) : (
                  <Grid xs={12}>
                    <Box sx={{
                      mt: 1,
                      mb: 1,
                      p: 2,
                      bgcolor: alpha(theme.palette.info.main, 0.05),
                      borderRadius: 2,
                      border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`
                    }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Map fontSize="small" color="info" />
                        <Typography variant="subtitle2" fontWeight="700" color="info.main">Logistics Route</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <FormField
                          label="Port of Loading (POL)"
                          type="text"
                          value={formData.port_of_loading}
                          onChange={(value: string) => handleInputChange('port_of_loading', value)}
                          gridSize={{ xs: 12, md: 6 }}
                        />
                        <FormField
                          label="Port of Discharge (POD)"
                          type="text"
                          value={formData.destination}
                          onChange={(value: string) => handleInputChange('destination', value)}
                          gridSize={{ xs: 12, md: 6 }}
                        />
                        <FormField
                          label="Place of Origin"
                          type="text"
                          value={formData.place_of_origin}
                          onChange={(value: string) => handleInputChange('place_of_origin', value)}
                          gridSize={{ xs: 12, md: 6 }}
                        />
                        <FormField
                          label="Place of Delivery"
                          type="text"
                          value={formData.place_of_delivery}
                          onChange={(value: string) => handleInputChange('place_of_delivery', value)}
                          gridSize={{ xs: 12, md: 6 }}
                        />
                      </Grid>
                    </Box>
                  </Grid>
                )}
                <FormField
                  label="Bank Details"
                  type="text"
                  value={formData.bank_details}
                  onChange={(value: string) => handleInputChange('bank_details', value)}
                  gridSize={{ xs: 12 }}
                  inputProps={{
                    multiline: true,
                    rows: 2,
                  }}
                />
              </Grid>
            </CardContent>
          </Card>

          {/* Audit Info */}
          {id && (
            <Card elevation={0} sx={{ bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
              <CardContent>
                <SectionHeader title="Contract Info" icon={<Description fontSize="small" />} />
                <Stack spacing={1.5}>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">Posted by:</Typography><Typography variant="body2">{formData.posted_by || 'N/A'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">Finance Notified by:</Typography><Typography variant="body2">{formData.finance_notified_by || 'N/A'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">Posted Date:</Typography><Typography variant="body2">{formData.posted_date || 'N/A'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">Modified Date:</Typography><Typography variant="body2">{formData.modified_date || 'N/A'}</Typography></Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
};

export default ContractDetailsTab;