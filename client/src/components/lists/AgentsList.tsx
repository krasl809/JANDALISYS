import React, { useState, useEffect } from 'react';
import { Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Chip } from '@mui/material';
import { Add, Edit, Delete, Business } from '@mui/icons-material';
import api from '../../services/api';

interface Agent {
  id: string;
  contact_name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const AgentsList: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent>({ id: '', contact_name: '', code: '', email: '', phone: '', address: '' });

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents/');
      setAgents(res.data);
    } catch (err) { console.error('Failed to fetch agents', err); }
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
        await api.put(`/agents/${currentAgent.id}`, currentAgent);
      } else {
        await api.post('/agents/', currentAgent);
      }
      fetchAgents();
      handleClose();
    } catch (err) { console.error('Failed to save agent', err); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this agent?')) {
      try {
        await api.delete(`/agents/${id}`);
        fetchAgents();
      } catch (err) { console.error('Failed to delete agent', err); }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Business color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Agents Management</Typography>
            <Typography variant="body2" color="text.secondary">Manage customs clearance and shipping agents</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Add Agent</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>Address</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id} hover>
                <TableCell><Chip label={agent.code || 'N/A'} size="small" /></TableCell>
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

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
        <DialogContent>
          <TextField label="Agent Code" fullWidth margin="normal" value={currentAgent.code} onChange={(e) => setCurrentAgent({ ...currentAgent, code: e.target.value })} />
          <TextField label="Agent Name" fullWidth margin="normal" required value={currentAgent.contact_name} onChange={(e) => setCurrentAgent({ ...currentAgent, contact_name: e.target.value })} />
          <TextField label="Email" fullWidth margin="normal" type="email" value={currentAgent.email} onChange={(e) => setCurrentAgent({ ...currentAgent, email: e.target.value })} />
          <TextField label="Phone" fullWidth margin="normal" value={currentAgent.phone} onChange={(e) => setCurrentAgent({ ...currentAgent, phone: e.target.value })} />
          <TextField label="Address" fullWidth margin="normal" multiline rows={2} value={currentAgent.address} onChange={(e) => setCurrentAgent({ ...currentAgent, address: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AgentsList;
