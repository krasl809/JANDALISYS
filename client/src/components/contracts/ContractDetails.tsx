import React from 'react';
import { 
  Card, CardContent, TextField, CircularProgress, Button, 
  RadioGroup, FormControlLabel, Radio, Typography, MenuItem, 
  InputAdornment, TableContainer, Table, TableHead, TableRow, 
  TableCell, TableBody, Box, alpha, Theme, SxProps
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Description, ReceiptLong, Add, Delete, History, Groups, LocalShipping, AccountBalanceWallet } from '@mui/icons-material';
import SectionHeader from '../common/SectionHeader';
import FieldLabel from '../common/FieldLabel';
import AutocompleteWithAdd from './AutocompleteWithAdd';
import CharterDetails from './CharterPartyDetails';
// test comment to trigger re-parse

interface ContractDetailsProps {
  formData: any;
  mode: 'export' | 'import';
  isGeneratingNo: boolean;
  isShipmentDate: boolean;
  items: any[];
  charterItems: any[];
  lists: any;
  totalAmount: number;
  isFixedPrice: boolean;
  handleInputChange: (field: string, value: any) => void;
  handleItemChange: (id: string, field: string, value: string) => void;
  handleAddItem: () => void;
  handleRemoveItem: (itemId: string) => void;
  handleGenerateNumber: (sellerId: string) => void;
  handleAddEntity: (entityType: any) => void;
  setIsShipmentDate: (val: boolean) => void;
  setCharterItems: React.Dispatch<React.SetStateAction<any[]>>;
  t: any;
  theme: Theme;
  palette: any;
  boxShadows: any;
  headerSx: SxProps<Theme>;
  cellSx: SxProps<Theme>;
  inputTableSx: SxProps<Theme>;
}

const ContractDetails: React.FC<ContractDetailsProps> = React.memo(({ 
    formData, mode, isGeneratingNo, isShipmentDate, items, charterItems, lists, 
    totalAmount, isFixedPrice, handleInputChange, handleItemChange, 
    handleAddItem, handleRemoveItem, handleGenerateNumber, handleAddEntity, 
    setIsShipmentDate, setCharterItems, t, theme, palette, boxShadows, headerSx, cellSx, inputTableSx
}) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
          
          {/* 1. General Info */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
              <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t("General Information")} icon={<Description fontSize="small" />} />
              <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Contract Reference No.")} />
                      <TextField 
                        fullWidth 
                        size="small" 
                        value={formData.contract_no} 
                        disabled={isGeneratingNo} 
                        placeholder={t("examples.contractNo")} 
                        slotProps={{ 
                          input: {
                            sx: { bgcolor: alpha(palette.primary.main, 0.02), borderRadius: '8px' }, 
                            endAdornment: (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isGeneratingNo && <CircularProgress size={20}/>}
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  disabled={isGeneratingNo || !formData.seller_id || formData.seller_id === 'NA'}
                                  onClick={() => handleGenerateNumber(formData.seller_id)}
                                  sx={{ minWidth: 'auto', px: 1.5, py: 0.5, borderRadius: '6px', textTransform: 'none', fontWeight: 600 }}
                                >
                                  {t("Generate")}
                                </Button>
                              </Box>
                            )
                          }
                        }} 
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Issue Date")} required />
                      <TextField type="date" fullWidth size="small" value={formData.issue_date || ''} onChange={e => handleInputChange('issue_date', e.target.value || new Date().toISOString().split('T')[0])} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Currency")} />
                      <TextField select fullWidth size="small" value={formData.contract_currency} onChange={e => handleInputChange('contract_currency', e.target.value)}>
                          {['USD', 'EUR', 'SAR', 'GBP'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </TextField>
                  </Grid>

                  {mode === 'import' && (
                      <Grid size={{ xs: 12, md: 4 }}>
                          <FieldLabel label={t("Pricing Model")} />
                          <RadioGroup row value={formData.contract_type} onChange={e => { handleInputChange('contract_type', e.target.value); }}>
                              <FormControlLabel value="fixed_price" control={<Radio size="small"/>} label={<Typography variant="body2">{t("Fixed price")}</Typography>} />
                              <FormControlLabel value="stock_market" control={<Radio size="small"/>} label={<Typography variant="body2">{t("Stock/exchange market")}</Typography>} />
                          </RadioGroup>
                      </Grid>
                  )}
                  
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Seller Contract Reference No.")} />
                      <TextField fullWidth size="small" value={formData.seller_contract_ref_no} onChange={e => handleInputChange('seller_contract_ref_no', e.target.value)} placeholder={t("examples.sellerRef")} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Seller Contract Date")} />
                      <TextField type="date" fullWidth size="small" value={formData.seller_contract_date || ''} onChange={e => handleInputChange('seller_contract_date', e.target.value || null)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Actual Shipped Quantity")} />
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        placeholder="0.00"
                        value={formData.actual_shipped_quantity}
                        onChange={e => handleInputChange('actual_shipped_quantity', e.target.value)}
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="600">{t("MT")}</Typography></InputAdornment>
                          }
                        }}
                      />
                  </Grid>
              </Grid>
              </CardContent>
          </Card>

          {/* 2. Contract Parties */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
              <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t("Contract Parties")} icon={<Groups fontSize="small" />} />
              <Grid container spacing={3}>
                  {/* Row 1: The Main Parties */}
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Seller")} required />
                      <AutocompleteWithAdd 
                          options={lists.sellers} 
                          value={lists.sellers.find((s: any) => s.id === formData.seller_id) || null} 
                          onChange={(_, val) => handleInputChange('seller_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt ? `${opt.contact_name} (${opt.seller_code})` : ''} 
                          entityType="seller"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Seller")} />}
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Buyer")} required />
                      <AutocompleteWithAdd 
                          options={lists.buyers} 
                          value={lists.buyers.find((b: any) => b.id === formData.buyer_id) || null} 
                          onChange={(_, val) => handleInputChange('buyer_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.contact_name || ''} 
                          entityType="buyer"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Buyer")} />}
                      />
                  </Grid>

                  {/* Row 2: Intermediaries & Agents */}
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Broker")} />
                      <AutocompleteWithAdd 
                          options={lists.brokers} 
                          value={lists.brokers.find((b: any) => b.id === formData.broker_id) || null} 
                          onChange={(_, val) => handleInputChange('broker_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.contact_name || ''} 
                          entityType="broker"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Broker")} />}
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Agent")} />
                      <AutocompleteWithAdd 
                          options={lists.agents} 
                          value={lists.agents.find((a: any) => a.id === formData.agent_id) || null} 
                          onChange={(_, val) => handleInputChange('agent_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.contact_name || ''} 
                          entityType="agent"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Agent")} />}
                      />
                  </Grid>

                  {/* Row 3: Logistics & Destination */}
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Shipper")} />
                      <AutocompleteWithAdd 
                          options={lists.shippers} 
                          value={lists.shippers.find((s: any) => s.id === formData.shipper_id) || null} 
                          onChange={(_, val) => handleInputChange('shipper_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.contact_name || ''} 
                          entityType="shipper"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Shipper")} />}
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Conveyor")} />
                      <AutocompleteWithAdd 
                          options={lists.conveyors} 
                          value={lists.conveyors.find((c: any) => c.id === formData.conveyor_id) || null} 
                          onChange={(_, val) => handleInputChange('conveyor_id', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.contact_name || ''} 
                          entityType="conveyor"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Conveyor")} />}
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Consignee")} />
                      <TextField 
                        fullWidth 
                        size="small" 
                        value={formData.consignee} 
                        onChange={e => handleInputChange('consignee', e.target.value)} 
                        placeholder={t("examples.consignee")} 
                      />
                  </Grid>
              </Grid>
              </CardContent>
          </Card>

          {/* 3. Product Details Table */}
          <Card elevation={0} sx={{ mb: 3, overflow: 'hidden', borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <SectionHeader title={t("Product Specifications")} icon={<ReceiptLong fontSize="small" />} />
              </Box>
              <TableContainer>
                  <Table size="small" sx={{ minWidth: 800 }}>
                      <TableHead>
                          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}> 
                              <TableCell width="25%" sx={{ ...headerSx, color: theme.palette.primary.dark, py: 1.5, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Article")}</TableCell>
                              {mode === 'import' && <TableCell sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Qty (Lot)")}</TableCell>}
                              <TableCell sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{mode === 'export' ? t('Quantity (MT)') : t('Qty (Ton)')}</TableCell>
                              <TableCell sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Packing")}</TableCell>
                              {mode === 'import' && !isFixedPrice ? (
                                  <TableCell sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Premium")}</TableCell>
                              ) : (
                                  <TableCell sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Price")}</TableCell>
                              )}
                              {isFixedPrice && <TableCell align="right" sx={{ ...headerSx, color: theme.palette.primary.dark, borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>{t("Total")}</TableCell>}
                              <TableCell width="40px" sx={headerSx}></TableCell>
                          </TableRow>
                      </TableHead>
                      <TableBody>
                          {items.map((item, index) => (
                              <TableRow 
                                key={item.id} 
                                sx={{ 
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                                  bgcolor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.3),
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                  <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                      <AutocompleteWithAdd 
                                          options={lists.articles} 
                                          value={lists.articles.find((a: any) => a.id === item.article_id) || null} 
                                          onChange={(_, val) => handleItemChange(item.id, 'article_id', val?.id || '')} 
                                          getOptionLabel={(opt) => opt?.article_name || ''} 
                                          entityType="article"
                                          onAddClick={handleAddEntity}
                                          renderInput={(params) => (
                                            <TextField 
                                              {...params} 
                                              variant="standard" 
                                              placeholder={t("examples.article")} 
                                              sx={inputTableSx} 
                                            />
                                          )}
                                      />
                                  </TableCell>
                                  {mode === 'import' && (
                                    <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                      <TextField 
                                        variant="standard" 
                                        type="number" 
                                        value={item.qty_lot} 
                                        onChange={e => handleItemChange(item.id, 'qty_lot', e.target.value)} 
                                        sx={inputTableSx} 
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                    <TextField 
                                      variant="standard" 
                                      type="number" 
                                      value={item.qty_ton} 
                                      onChange={e => handleItemChange(item.id, 'qty_ton', e.target.value)} 
                                      sx={inputTableSx} 
                                      slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="600" color="primary">{t("MT")}</Typography></InputAdornment> } }} 
                                    />
                                  </TableCell>
                                  <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                    <TextField 
                                      fullWidth 
                                      variant="standard" 
                                      value={item.packing} 
                                      onChange={e => handleItemChange(item.id, 'packing', e.target.value)} 
                                      sx={inputTableSx} 
                                      placeholder={t("examples.packing")}
                                    />
                                  </TableCell>
                                  {mode === 'import' && !isFixedPrice ? (
                                      <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                          <TextField 
                                            fullWidth 
                                            variant="standard" 
                                            type="number" 
                                            value={item.premium} 
                                            onChange={e => handleItemChange(item.id, 'premium', e.target.value)} 
                                            sx={inputTableSx} 
                                            slotProps={{ formHelperText: { sx: { fontSize: '0.65rem', fontStyle: 'italic', color: 'info.main' } } }}
                                          />
                                      </TableCell>
                                  ) : (
                                      <TableCell sx={{ ...cellSx, borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                          <TextField 
                                            fullWidth 
                                            variant="standard" 
                                            type="number" 
                                            value={item.price} 
                                            onChange={e => handleItemChange(item.id, 'price', e.target.value)} 
                                            sx={inputTableSx} 
                                            slotProps={{ formHelperText: { sx: { fontSize: '0.65rem', fontStyle: 'italic', color: 'info.main' } } }}
                                          />
                                      </TableCell>
                                  )}
                                  {isFixedPrice && (
                                      <TableCell align="right" sx={{ ...cellSx, fontWeight: 'bold', color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.01), borderRight: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                                          {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </TableCell>
                                  )}
                                  <TableCell sx={cellSx}>
                                      <Button size="small" color="error" onClick={() => handleRemoveItem(item.id)} disabled={items.length <= 1} sx={{ minWidth: 'auto', p: 0.5, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}>
                                          <Delete fontSize="small" />
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </TableContainer>
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: alpha(theme.palette.background.default, 0.5),
                borderTop: `1px solid ${theme.palette.divider}`
              }}>
                  <Button 
                    startIcon={<Add />} 
                    variant="contained" 
                    size="small" 
                    onClick={handleAddItem} 
                    sx={{ 
                      fontWeight: 700, 
                      borderRadius: '8px',
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 'none' }
                    }}
                  >
                    {t("Add Item")}
                  </Button>
                  {isFixedPrice && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'baseline', 
                        gap: 1.5,
                        px: 3,
                        py: 1,
                        borderRadius: '10px',
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`
                      }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>
                              {t("Total Amount")}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>
                              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              {formData.contract_currency}
                          </Typography>
                      </Box>
                  )}
              </Box>
          </Card>

          {/* 3. Charter/Vessel Info */}
          <CharterDetails 
            mode={mode}
            charterItems={charterItems}
            setCharterItems={setCharterItems}
            t={t}
            theme={theme}
            palette={palette}
            boxShadows={boxShadows}
            headerSx={headerSx}
            cellSx={cellSx}
            inputTableSx={inputTableSx}
            formData={formData}
            handleInputChange={handleInputChange}
          />


          {/* 5. Shipping & Logistics */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
              <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t("shippingAndLogistics")} icon={<LocalShipping fontSize="small" />} />
              <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("incoterms")} />
                      <AutocompleteWithAdd 
                          options={lists.incoterms} 
                          value={lists.incoterms.find((i: any) => i.id === formData.incoterms) || null} 
                          onChange={(_, val) => handleInputChange('incoterms', val?.id || '')} 
                          getOptionLabel={(opt) => opt?.code || ''} 
                          entityType="incoterm"
                          onAddClick={handleAddEntity}
                          renderInput={(params) => <TextField {...params} size="small" placeholder={t("Select Incoterm")} />}
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Port of Loading")} />
                      <TextField fullWidth size="small" value={formData.port_of_loading} onChange={e => handleInputChange('port_of_loading', e.target.value)} placeholder={t("examples.port")} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                      <FieldLabel label={t("Destination")} />
                      <TextField fullWidth size="small" value={formData.destination} onChange={e => handleInputChange('destination', e.target.value)} placeholder={t("examples.destination")} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Marks")} />
                      <TextField fullWidth size="small" value={formData.marks} onChange={e => handleInputChange('marks', e.target.value)} placeholder={t("examples.marks")} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <FieldLabel label={isShipmentDate ? t("Shipment Date") : t("Shipment Period")} required />
                          <Button size="small" onClick={() => setIsShipmentDate(!isShipmentDate)} sx={{ fontSize: '0.65rem', textTransform: 'none' }}>
                              {isShipmentDate ? t("Switch to Period") : t("Switch to Date")}
                          </Button>
                      </Box>
                      {isShipmentDate ? (
                          <TextField type="date" fullWidth size="small" value={formData.shipment_date || ''} onChange={e => handleInputChange('shipment_date', e.target.value || null)} />
                      ) : (
                          <TextField fullWidth size="small" value={formData.shipment_period} onChange={e => handleInputChange('shipment_period', e.target.value)} placeholder={t("examples.shipmentPeriod")} />
                      )}
                  </Grid>
              </Grid>
              </CardContent>
          </Card>

          {/* 6. Financial Terms */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
              <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t("financialTerms")} icon={<AccountBalanceWallet fontSize="small" />} />
              <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Payment Terms")} />
                      <TextField 
                        fullWidth 
                        size="small" 
                        multiline 
                        rows={3} 
                        value={formData.payment_terms} 
                        onChange={e => handleInputChange('payment_terms', e.target.value)} 
                        placeholder={t("examples.paymentTerms")} 
                      />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                      <FieldLabel label={t("Beneficiary Bank Details")} />
                      <TextField 
                        fullWidth 
                        size="small" 
                        multiline 
                        rows={3} 
                        value={formData.bank_details} 
                        onChange={e => handleInputChange('bank_details', e.target.value)} 
                        placeholder={t("examples.bankDetails")} 
                      />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                      <FieldLabel label={t("Insurance")} />
                      <TextField 
                        fullWidth 
                        size="small" 
                        value={formData.insurance} 
                        onChange={e => handleInputChange('insurance', e.target.value)} 
                        placeholder={t("examples.insurance")} 
                      />
                  </Grid>
              </Grid>
              </CardContent>
          </Card>
      </Grid>

      {/* Footer Audit Info */}
      <Grid size={{ xs: 12 }}>
          <Box sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: '12px', 
              bgcolor: alpha(theme.palette.info.main, 0.04),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: 'center'
          }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History fontSize="small" color="info" />
                  <Typography variant="caption" color="text.secondary" fontWeight="600">{t("Posted by")}:</Typography>
                  <Typography variant="caption" fontWeight="700">{formData.posted_by_name || t("User")}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">{t("Finance Notified by")}:</Typography>
                  <Typography variant="caption" fontWeight="700">{formData.finance_notified_by_name || t("User")}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">{t("Posted Date")}:</Typography>
                  <Typography variant="caption" fontWeight="700">{formData.posted_date ? new Date(formData.posted_date).toLocaleString() : '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">{t("Modified Date")}:</Typography>
                  <Typography variant="caption" fontWeight="700">{formData.modified_date ? new Date(formData.modified_date).toLocaleString() : '-'}</Typography>
              </Box>
          </Box>
      </Grid>
    </Grid>
  );
});

export default ContractDetails;
