import React, { useState, useRef } from 'react';
import {
  Card, CardContent, Grid, TextField, Typography, Box, Button, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Alert,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Divider
} from '@mui/material';
import {
  Folder, Upload, Delete, Visibility, Description, Badge, Person,
  School, Work, Security, CheckCircle, Error, Warning
} from '@mui/icons-material';

interface DocumentsSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  onNestedInputChange: (parent: string, field: string, value: any) => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  formData,
  onInputChange,
  onNestedInputChange
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
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'primary.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'primary.light', 
                opacity: 0.1 
              }}>
                <Upload />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Upload Documents
              </Typography>
            </Box>

            <Box
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: dragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop files here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to select files from your computer
              </Typography>
              <Button variant="outlined" startIcon={<Upload />}>
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG, GIF. Maximum file size: 10MB
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      {/* Document Types Guide */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Document Types
            </Typography>
            <Grid container spacing={2}>
              {documentTypes.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.value}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    p: 1.5, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1 
                  }}>
                    <Box sx={{ color: `${type.color}.main` }}>
                      {type.icon}
                    </Box>
                    <Typography variant="body2" fontWeight="medium">
                      {type.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Document List */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'secondary.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'secondary.light', 
                opacity: 0.1 
              }}>
                <Folder />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Uploaded Documents
              </Typography>
              <Chip 
                label={`${formData.documents?.length || 0} files`} 
                size="small" 
                color="primary" 
              />
            </Box>

            {!formData.documents || formData.documents.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No documents uploaded yet. Upload documents using the area above.
                </Typography>
              </Alert>
            ) : (
              <List>
                {formData.documents.map((doc: any, index: number) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Box sx={{ color: `${getDocumentColor(doc.document_type)}.main` }}>
                          {getDocumentIcon(doc.document_type)}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {doc.document_name}
                              </Typography>
                              <Chip 
                                label={documentTypes.find(dt => dt.value === doc.document_type)?.label || 'Other'}
                                size="small"
                                color={getDocumentColor(doc.document_type) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatFileSize(doc.file_size || 0)} • {doc.mime_type}
                              </Typography>
                              {doc.issue_date && (
                                <Typography variant="caption" color="text.secondary">
                                  Issued: {new Date(doc.issue_date).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {doc.file_path && (
                              <IconButton
                                size="small"
                                onClick={() => window.open(doc.file_path, '_blank')}
                                color="primary"
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => removeDocument(index)}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </Box>
                    </ListItem>
                    {index < formData.documents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Document Requirements */}
      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                color: 'warning.main', 
                display: 'flex', 
                p: 0.5, 
                borderRadius: 1, 
                bgcolor: 'warning.light', 
                opacity: 0.1 
              }}>
                <Warning />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Document Requirements
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Alert severity="warning" icon={<CheckCircle />}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Required Documents
                  </Typography>
                  <Typography variant="body2">
                    • Profile Picture (JPG/PNG, max 2MB)<br />
                    • National ID or Passport copy<br />
                    • Resume/CV (PDF or DOC)<br />
                    • Employment Contract
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <Alert severity="info" icon={<Description />}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Optional Documents
                  </Typography>
                  <Typography variant="body2">
                    • Educational Certificates<br />
                    • Work Experience Letters<br />
                    • Medical Certificates<br />
                    • Training Certificates
                  </Typography>
                </Alert>
              </Grid>
            </Grid>

            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> All uploaded documents will be securely stored and encrypted. 
                Only authorized personnel will have access to view these documents.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                File: {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Size: {formatFileSize(selectedFile.size)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {selectedFile.type}
              </Typography>
            </Box>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
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
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
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