import React, { useState, useEffect } from 'react';
import { Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Chip, LinearProgress } from '@mui/material';
import { Add, Edit, Delete, Business } from '@mui/icons-material';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';

import { useTranslation } from 'react-i18next';

interface Agent {
  id: string;
  contact_name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const AgentsList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, alert } = useConfirm();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent>({ id: '', contact_name: '', code: '', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await api.get('agents/');
      setAgents(res.data);
    } catch (err) { 
      console.error('Failed to fetch agents', err); 
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (agent?: Agent) => {
    if (agent) {
      setCurrentAgent(agent);
      setEditMode(true);
    } else {
      setCurrentAgent({ id: '', contact_name: '', code: '', email: '', phone: '', address: '' });
      setEditMode(false);
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setCurrentAgent({ id: '', contact_name: '', code: '', email: '', phone: '', address: '' }); };

  const handleSave = async () => {
    try {
      if (editMode) {
        await api.put(`agents/${currentAgent.id}`, currentAgent);
        alert(t('Agent updated successfully'), t('Success'), 'success');
      } else {
        await api.post('agents/', currentAgent);
        alert(t('Agent added successfully'), t('Success'), 'success');
      }
      fetchAgents();
      handleClose();
    } catch (err) { 
      console.error('Failed to save agent', err);
      alert(t('Failed to save agent'), t('Error'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ message: t('confirmDelete') })) {
      try {
        await api.delete(`agents/${id}`);
        fetchAgents();
        alert(t('Agent deleted successfully'), t('Success'), 'success');
      } catch (err) { 
        console.error('Failed to delete agent', err);
        alert(t('Failed to delete agent'), t('Error'), 'error');
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Business color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">{t('Agents Management')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('Manage customs clearance and shipping agents')}</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>{t('Add Agent')}</Button>
      </Box>

      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>{t('Code')}</strong></TableCell>
              <TableCell><strong>{t('Name')}</strong></TableCell>
              <TableCell><strong>{t('Email')}</strong></TableCell>
              <TableCell><strong>{t('Phone')}</strong></TableCell>
              <TableCell><strong>{t('Address')}</strong></TableCell>
              <TableCell align="right"><strong>{t('Actions')}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id} hover>
                <TableCell><Chip label={agent.code || t('N/A')} size="small" /></TableCell>
                <TableCell>{agent.contact_name}</TableCell>
                <TableCell>{agent.email || '-'}</TableCell>
                <TableCell>{agent.phone || '-'}</TableCell>
                <TableCell>{agent.address || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpen(agent)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(agent.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editMode ? t('Edit Agent') : t('Add Agent')}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label={t('Agent Code')} fullWidth value={currentAgent.code} onChange={(e) => setCurrentAgent({ ...currentAgent, code: e.target.value })} />
            <TextField label={t('Name')} fullWidth value={currentAgent.contact_name} onChange={(e) => setCurrentAgent({ ...currentAgent, contact_name: e.target.value })} />
            <TextField label={t('Email')} fullWidth value={currentAgent.email} onChange={(e) => setCurrentAgent({ ...currentAgent, email: e.target.value })} />
            <TextField label={t('Phone')} fullWidth value={currentAgent.phone} onChange={(e) => setCurrentAgent({ ...currentAgent, phone: e.target.value })} />
            <TextField label={t('Address')} fullWidth multiline rows={2} value={currentAgent.address} onChange={(e) => setCurrentAgent({ ...currentAgent, address: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave} variant="contained" color="primary">{t('Save')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AgentsList;
