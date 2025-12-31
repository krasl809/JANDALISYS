import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert
} from '@mui/material';
import { Add } from '@mui/icons-material';
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Add color="primary" />
        {config.title}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {config.fields.map((field) => (
            <Grid item xs={12} sm={field.name === 'seller_code' || field.name === 'item_code' || field.name === 'code' ? 6 : 12} key={field.name}>
              <TextField
                label={field.label}
                value={formData[field.name] || ''}
                onChange={(e) => {
                  let value = e.target.value;
                  // Auto-uppercase for codes
                  if (field.name === 'seller_code' || field.name === 'item_code' || field.name === 'code') {
                    value = value.toUpperCase();
                  }
                  handleFieldChange(field.name, value);
                }}
                fullWidth
                required={field.required}
                size="small"
                inputProps={{ maxLength: field.maxLength || 255 }}
                helperText={field.required ? t('entities.required') : t('entities.optional')}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('entities.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={<Add />}
        >
          {loading ? t('entities.adding') : t('entities.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEntityDialog;