import React, { useState, useRef } from 'react';
import {
  Card, CardContent, Grid, TextField, Button, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Alert,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Paper
} from '@mui/material';
import {
  Folder, Upload, Delete, Visibility, Description, Badge, Person,
  School, Work, Security, CheckCircle
} from '@mui/icons-material';
import { MDBox, MDTypography } from '../common/MDComponents';

interface DocumentsSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  formData,
  onInputChange
}) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: 'profile_picture', label: 'Profile Picture', icon: <Person />, color: 'primary' },
    { value: 'national_id', label: 'National ID', icon: <Badge />, color: 'secondary' },
    { value: 'passport', label: 'Passport', icon: <Security />, color: 'success' },
    { value: 'resume', label: 'Resume/CV', icon: <Description />, color: 'info' },
    { value: 'contract', label: 'Employment Contract', icon: <Work />, color: 'warning' },
    { value: 'certificate', label: 'Certificates', icon: <School />, color: 'error' },
    { value: 'other', label: 'Other Documents', icon: <Folder />, color: 'default' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          addDocumentToList();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const addDocumentToList = () => {
    const newDocument = {
      document_type: 'other',
      document_name: selectedFile?.name || 'Document',
      file_path: URL.createObjectURL(selectedFile!),
      file_size: selectedFile?.size || 0,
      mime_type: selectedFile?.type || '',
      issue_date: new Date().toISOString().split('T')[0]
    };

    const updatedDocuments = [...(formData.documents || []), newDocument];
    onInputChange('documents', updatedDocuments);

    // Reset states
    setSelectedFile(null);
    setUploadDialogOpen(false);
    setUploadProgress(0);
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = formData.documents.filter((_: any, i: number) => i !== index);
    onInputChange('documents', updatedDocuments);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (type: string) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.icon || <Description />;
  };

  const getDocumentColor = (type: string) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.color || 'default';
  };

  return (
    <Grid container spacing={3}>
      {/* Upload Area */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="primary"
            borderRadius="lg"
            coloredShadow="primary"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Upload Documents
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <MDBox
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'divider',
                borderRadius: 3,
                p: 6,
                textAlign: 'center',
                bgcolor: dragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.7 }} />
              <MDTypography variant="h6" fontWeight="bold" gutterBottom>
                Drag and drop files here
              </MDTypography>
              <MDTypography variant="button" color="text" sx={{ mb: 3, display: 'block' }}>
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </MDTypography>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<Upload />}
                sx={{ borderRadius: 2, px: 4 }}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </MDBox>
          </CardContent>
        </Card>
      </Grid>

      {/* Document Types Guide */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="info"
            borderRadius="lg"
            coloredShadow="info"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Document Types
            </MDTypography>
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            <Grid container spacing={2}>
              {documentTypes.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.value}>
                  <MDBox sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}>
                    <MDBox sx={{ 
                      color: `${type.color === 'default' ? 'dark' : type.color}.main`,
                      display: 'flex',
                      p: 1,
                      borderRadius: 1,
                      bgcolor: `${type.color === 'default' ? 'dark' : type.color}.light`,
                      opacity: 0.8
                    }}>
                      {type.icon}
                    </MDBox>
                    <MDTypography variant="body2" fontWeight="medium">
                      {type.label}
                    </MDTypography>
                  </MDBox>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Document List */}
      <Grid item xs={12}>
        <Card sx={{ overflow: 'visible', mt: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="secondary"
            borderRadius="lg"
            coloredShadow="secondary"
            mx={2}
            mt={-3}
            p={2}
            mb={1}
            textAlign="center"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <MDTypography variant="h6" fontWeight="medium" color="white">
              Uploaded Documents
            </MDTypography>
            <Chip 
              label={`${formData.documents?.length || 0} files`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.2)', 
                color: 'white',
                fontWeight: 'bold',
                borderRadius: 1
              }}
            />
          </MDBox>
          <CardContent sx={{ pt: 4 }}>
            {!formData.documents || formData.documents.length === 0 ? (
              <MDBox sx={{ 
                textAlign: 'center', 
                py: 6, 
                bgcolor: 'action.hover', 
                borderRadius: 3,
                border: '1px dashed',
                borderColor: 'divider'
              }}>
                <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                <MDTypography variant="body1" color="text" fontWeight="medium">
                  No documents uploaded yet
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Uploaded files will appear here
                </MDTypography>
              </MDBox>
            ) : (
              <List sx={{ p: 0 }}>
                {formData.documents.map((doc: any, index: number) => (
                  <Paper 
                    key={index}
                    variant="outlined"
                    sx={{ 
                      mb: 2, 
                      borderRadius: 2,
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <ListItem sx={{ p: 2 }}>
                      <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <MDBox sx={{ 
                          color: `${getDocumentColor(doc.document_type) === 'default' ? 'dark' : getDocumentColor(doc.document_type)}.main`,
                          display: 'flex',
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: `${getDocumentColor(doc.document_type) === 'default' ? 'dark' : getDocumentColor(doc.document_type)}.light`,
                          opacity: 0.8
                        }}>
                          {getDocumentIcon(doc.document_type)}
                        </MDBox>
                        <ListItemText
                          primary={
                            <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <MDTypography variant="subtitle2" fontWeight="bold">
                                {doc.document_name}
                              </MDTypography>
                              <Chip 
                                label={documentTypes.find(dt => dt.value === doc.document_type)?.label || 'Other'}
                                size="small"
                                color={getDocumentColor(doc.document_type) === 'default' ? 'default' : getDocumentColor(doc.document_type) as any}
                                sx={{ borderRadius: 1, fontWeight: 'medium' }}
                              />
                            </MDBox>
                          }
                          secondary={
                            <MDBox sx={{ mt: 0.5 }}>
                              <MDTypography variant="caption" color="text">
                                {formatFileSize(doc.file_size || 0)} • {doc.mime_type} • Uploaded {new Date(doc.issue_date).toLocaleDateString()}
                              </MDTypography>
                            </MDBox>
                          }
                        />
                        <ListItemSecondaryAction>
                          <MDBox sx={{ display: 'flex', gap: 1 }}>
                            {doc.file_path && (
                              <IconButton
                                size="small"
                                onClick={() => window.open(doc.file_path, '_blank')}
                                sx={{ bgcolor: 'info.lighter', color: 'info.main', '&:hover': { bgcolor: 'info.light' } }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => removeDocument(index)}
                              sx={{ bgcolor: 'error.lighter', color: 'error.main', '&:hover': { bgcolor: 'error.light' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </MDBox>
                        </ListItemSecondaryAction>
                      </MDBox>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Requirements Alert */}
      <Grid item xs={12}>
        <Alert 
          severity="warning" 
          icon={<CheckCircle />}
          sx={{ 
            borderRadius: 3,
            p: 2,
            '& .MuiAlert-icon': { fontSize: 28, alignItems: 'center' }
          }}
        >
          <MDTypography variant="subtitle2" fontWeight="bold" gutterBottom>
            Important Notice
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Required documents: Profile Picture, National ID/Passport, Resume, and Contract.
            All files are securely stored and encrypted.
          </MDTypography>
        </Alert>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <MDBox sx={{ mb: 3 }}>
              <MDTypography variant="subtitle2" gutterBottom display="block">
                File: {selectedFile.name}
              </MDTypography>
              <MDTypography variant="body2" color="text" gutterBottom display="block">
                Size: {formatFileSize(selectedFile.size)}
              </MDTypography>
              <MDTypography variant="body2" color="text" gutterBottom display="block">
                Type: {selectedFile.type}
              </MDTypography>
            </MDBox>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>Document Type</FormLabel>
            <RadioGroup
              value={formData.uploadDocumentType || 'other'}
              onChange={(e) => onInputChange('uploadDocumentType', e.target.value)}
            >
              {documentTypes.map((type) => (
                <FormControlLabel
                  key={type.value}
                  value={type.value}
                  control={<Radio />}
                  label={
                    <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      <MDTypography variant="body2">{type.label}</MDTypography>
                    </MDBox>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            label="Document Name"
            value={formData.uploadDocumentName || ''}
            onChange={(e) => onInputChange('uploadDocumentName', e.target.value)}
            placeholder="Enter document name"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="date"
            label="Issue Date"
            value={formData.uploadIssueDate || ''}
            onChange={(e) => onInputChange('uploadIssueDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          {uploadProgress > 0 && uploadProgress < 100 && (
            <MDBox sx={{ mb: 2 }}>
              <MDTypography variant="body2" gutterBottom display="block">
                Uploading... {uploadProgress}%
              </MDTypography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleFileUpload}
            disabled={uploadProgress > 0 && uploadProgress < 100}
          >
            {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DocumentsSection;