import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
  useTheme,
  alpha,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { EntityType } from '../../types/contracts';

interface AddEntityDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  onEntityAdded: (entity: any) => void;
}

const AddEntityDialog: React.FC<AddEntityDialogProps> = ({
  open,
  onClose,
  entityType,
  onEntityAdded
}) => {
  const theme = useTheme();
  const { palette, boxShadows } = theme as any;
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getEntityConfig = () => {
    switch (entityType) {
      case 'seller':
        return {
          title: t('entities.add_new', { type: t('entities.seller') }),
          endpoint: '/sellers/',
          fields: [
            { name: 'seller_code', label: t('entities.seller_code'), required: true, maxLength: 4 },
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'buyer':
        return {
          title: t('entities.add_new', { type: t('entities.buyer') }),
          endpoint: '/buyers/',
          fields: [
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'shipper':
        return {
          title: t('entities.add_new', { type: t('entities.shipper') }),
          endpoint: '/shippers/',
          fields: [
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'broker':
        return {
          title: t('entities.add_new', { type: t('entities.broker') }),
          endpoint: '/brokers/',
          fields: [
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'agent':
        return {
          title: t('entities.add_new', { type: t('entities.agent') }),
          endpoint: '/agents/',
          fields: [
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'conveyor':
        return {
          title: t('entities.add_new', { type: t('entities.conveyor') }),
          endpoint: '/conveyors/',
          fields: [
            { name: 'contact_name', label: t('entities.contact_name'), required: true },
            { name: 'address', label: t('entities.address'), required: false },
            { name: 'post_box', label: t('entities.post_box'), required: false },
            { name: 'tel', label: t('entities.telephone'), required: false },
            { name: 'fax', label: t('entities.fax'), required: false },
            { name: 'email', label: t('entities.email'), required: false }
          ]
        };
      case 'article':
        return {
          title: t('entities.add_new', { type: t('entities.article') }),
          endpoint: '/articles/',
          fields: [
            { name: 'article_name', label: t('entities.article_name'), required: true },
            { name: 'item_code', label: t('entities.item_code'), required: true },
            { name: 'uom', label: t('entities.uom'), required: true }
          ]
        };
      case 'warehouse':
        return {
          title: t('entities.add_new', { type: t('entities.warehouse') }),
          endpoint: '/inventory/warehouses/',
          fields: [
            { name: 'name', label: t('entities.warehouse_name'), required: true },
            { name: 'location', label: t('entities.location'), required: false }
          ]
        };
      case 'incoterm':
        return {
          title: t('entities.add_new', { type: t('entities.incoterm') }),
          endpoint: '/incoterms/',
          fields: [
            { name: 'code', label: t('entities.incoterm_code'), required: true, maxLength: 3 },
            { name: 'name', label: t('entities.incoterm_name'), required: true },
            { name: 'description', label: t('entities.description'), required: false }
          ]
        };
      default:
        return { title: t('entities.add_new', { type: t('entities.item') }), endpoint: '', fields: [] };
    }
  };

  const config = getEntityConfig();

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = config.fields.filter(field => 
      field.required && (!formData[field.name] || formData[field.name].trim() === '')
    );

    if (missingFields.length > 0) {
      setError(t('entities.fill_required', { fields: missingFields.map(f => f.label).join(', ') }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(config.endpoint, formData);
      onEntityAdded(response.data);
      setFormData({});
      onClose();
    } catch (err: any) {
      console.error('Error adding entity:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('entities.failed_add'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    if (error) setError(null);
  };

  const handleClose = () => {
    setFormData({});
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: boxShadows.xxl,
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `1px solid ${palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: alpha(palette.primary.main, 0.1),
            color: palette.primary.main
          }}>
            <Add fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="700">
            {config.title}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: palette.text.secondary,
            '&:hover': { bgcolor: alpha(palette.primary.main, 0.05), color: palette.primary.main }
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, mt: 1 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '8px',
              fontWeight: 500
            }}
          >
            {error}
          </Alert>
        )}
        <Grid container spacing={2.5}>
          {config.fields.map((field) => (
            <Grid item xs={12} sm={field.name === 'seller_code' || field.name === 'item_code' || field.name === 'code' ? 6 : 12} key={field.name}>
              <TextField
                label={field.label}
                value={formData[field.name] || ''}
                onChange={(e) => {
                  let value = e.target.value;
                  if (field.name === 'seller_code' || field.name === 'item_code' || field.name === 'code') {
                    value = value.toUpperCase();
                  }
                  handleFieldChange(field.name, value);
                }}
                fullWidth
                required={field.required}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    bgcolor: alpha(palette.background.default, 0.4),
                    '&:hover': {
                      bgcolor: alpha(palette.background.default, 0.8),
                    }
                  }
                }}
                inputProps={{ maxLength: field.maxLength || 255 }}
                helperText={field.required ? t('entities.required') : t('entities.optional')}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: `1px solid ${palette.divider}`, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ 
            textTransform: 'none', 
            fontWeight: 600,
            borderRadius: '8px',
            px: 3,
            color: palette.text.secondary
          }}
        >
          {t('entities.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={!loading && <Add />}
          sx={{ 
            textTransform: 'none', 
            fontWeight: 700,
            borderRadius: '8px',
            px: 3,
            boxShadow: boxShadows.primary,
            background: palette.gradients.primary.main,
            '&:hover': {
              boxShadow: boxShadows.primary_hover,
            }
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : t('entities.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEntityDialog;