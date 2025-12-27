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
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getEntityConfig = () => {
    switch (entityType) {
      case 'seller':
        return {
          title: 'Add New Seller',
          endpoint: '/sellers/',
          fields: [
            { name: 'seller_code', label: 'Seller Code', required: true, maxLength: 4 },
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'buyer':
        return {
          title: 'Add New Buyer',
          endpoint: '/buyers/',
          fields: [
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'shipper':
        return {
          title: 'Add New Shipper',
          endpoint: '/shippers/',
          fields: [
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'broker':
        return {
          title: 'Add New Broker',
          endpoint: '/brokers/',
          fields: [
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'agent':
        return {
          title: 'Add New Agent',
          endpoint: '/agents/',
          fields: [
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'conveyor':
        return {
          title: 'Add New Conveyor',
          endpoint: '/conveyors/',
          fields: [
            { name: 'contact_name', label: 'Contact Name', required: true },
            { name: 'address', label: 'Address', required: false },
            { name: 'post_box', label: 'Post Box', required: false },
            { name: 'tel', label: 'Telephone', required: false },
            { name: 'fax', label: 'Fax', required: false },
            { name: 'email', label: 'Email', required: false }
          ]
        };
      case 'article':
        return {
          title: 'Add New Article',
          endpoint: '/articles/',
          fields: [
            { name: 'article_name', label: 'Article Name', required: true },
            { name: 'item_code', label: 'Item Code', required: true },
            { name: 'uom', label: 'Unit of Measure', required: true }
          ]
        };
      case 'warehouse':
        return {
          title: 'Add New Warehouse',
          endpoint: '/inventory/warehouses/',
          fields: [
            { name: 'name', label: 'Warehouse Name', required: true },
            { name: 'location', label: 'Location', required: false }
          ]
        };
      case 'incoterm':
        return {
          title: 'Add New Incoterm',
          endpoint: '/incoterms/',
          fields: [
            { name: 'code', label: 'Incoterm Code', required: true, maxLength: 3 },
            { name: 'name', label: 'Incoterm Name', required: true },
            { name: 'description', label: 'Description', required: false }
          ]
        };
      default:
        return { title: 'Add New Item', endpoint: '', fields: [] };
    }
  };

  const config = getEntityConfig();

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = config.fields.filter(field => 
      field.required && (!formData[field.name] || formData[field.name].trim() === '')
    );

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
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
      setError(typeof detail === 'string' ? detail : 'Failed to add item. Please try again.');
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
                helperText={field.required ? 'Required' : 'Optional'}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={<Add />}
        >
          {loading ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEntityDialog;