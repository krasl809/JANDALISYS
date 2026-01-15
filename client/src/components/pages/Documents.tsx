import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  Box, Button, Card, CardContent, Typography,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Alert, Snackbar,
  LinearProgress, Tooltip, Stack, Badge, Checkbox, FormControlLabel,
  CardMedia, CardActions
} from '@mui/material';
import {
  CloudUpload, PictureAsPdf, Image, Delete, Download, Edit, CheckCircle,
  Error, InsertDriveFile, Verified, FolderOpen, OpenInNew, Compress
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import Grid2 from '@mui/material/Grid2';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentsProps { contractId?: string; }

interface Document {
  id: string;
  contract_id: string;
  document_type_id?: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  document_number?: string;
  description?: string;
  expiry_date?: string;
  is_required: boolean;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  uploaded_by: string;
  uploaded_at: string;
  modified_at: string;
}

interface DocumentType {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_required: boolean;
}

const Documents: React.FC<DocumentsProps> = memo(({ contractId }) => {
  const theme = useTheme();
  const { confirm } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    document_type_id: '',
    document_number: '',
    description: '',
    expiry_date: '',
    is_required: false
  });

  // Notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Load documents and document types
  const loadDocuments = useCallback(async () => {
    if (!contractId) return;

    try {
      setLoading(true);
      const response = await api.get(`contracts/${contractId}/documents`);
      setDocuments(response.data);
      // Generate thumbnails after loading documents
      generateThumbnails(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setNotification({
        open: true,
        message: 'Failed to load documents',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const generateThumbnails = useCallback(async (docs: Document[]) => {
    const newThumbnails: { [key: string]: string } = {};

    for (const doc of docs) {
      // Skip if thumbnail already exists
      if (thumbnails[doc.id]) continue;

      try {
        if (doc.mime_type.startsWith('image/')) {
          // For images, use the download URL as thumbnail
          const response = await api.get(`documents/${doc.id}/download`, {
            responseType: 'blob'
          });
          const url = URL.createObjectURL(response.data);
          newThumbnails[doc.id] = url;
        } else if (doc.mime_type === 'application/pdf') {
          // For PDFs, generate thumbnail from first page
          const response = await api.get(`documents/${doc.id}/download`, {
            responseType: 'arraybuffer'
          });
          const pdf = await pdfjsLib.getDocument({ data: response.data }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.3 }); // Smaller scale for thumbnail
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvas, viewport }).promise;
            newThumbnails[doc.id] = canvas.toDataURL('image/jpeg', 0.8); // JPEG with 80% quality
          }
        }
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${doc.original_name}:`, error);
        // Continue with other documents
      }
    }

    if (Object.keys(newThumbnails).length > 0) {
      setThumbnails(prev => ({ ...prev, ...newThumbnails }));
    }
  }, [thumbnails]);

  const loadDocumentTypes = useCallback(async () => {
    try {
      const response = await api.get('document-types');
      setDocumentTypes(response.data);
    } catch (error) {
      console.error('Failed to load document types:', error);
    }
  }, []);

  useEffect(() => {
    if (contractId) {
      loadDocuments();
      loadDocumentTypes();
    }
  }, [contractId, loadDocuments, loadDocumentTypes]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setNotification({
          open: true,
          message: 'File size exceeds 10MB limit',
          severity: 'error'
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setNotification({
          open: true,
          message: 'File type not supported. Please upload PDF, JPG, PNG, DOC, or DOCX files.',
          severity: 'error'
        });
        return;
      }

      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !contractId) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    if (formData.document_type_id) uploadFormData.append('document_type_id', formData.document_type_id);
    if (formData.document_number) uploadFormData.append('document_number', formData.document_number);
    if (formData.description) uploadFormData.append('description', formData.description);
    if (formData.expiry_date) uploadFormData.append('expiry_date', formData.expiry_date);
    uploadFormData.append('is_required', formData.is_required.toString());

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress (in real implementation, use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post(`contracts/${contractId}/documents`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setDocuments(prev => [response.data, ...prev]);
      setNotification({
        open: true,
        message: 'Document uploaded successfully',
        severity: 'success'
      });

      // Reset form
      setSelectedFile(null);
      setFormData({
        document_type_id: '',
        document_number: '',
        description: '',
        expiry_date: '',
        is_required: false
      });
      setUploadDialogOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Upload failed:', error);
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Failed to upload document',
        severity: 'error'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, contractId, formData]);

  const handleDownload = useCallback(async (doc: Document) => {
    try {
      const response = await api.get(`documents/${doc.id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download failed:', error);
      setNotification({
        open: true,
        message: 'Failed to download document',
        severity: 'error'
      });
    }
  }, []);

  const handleOpen = useCallback(async (doc: Document) => {
    try {
      // For viewable files (images, PDFs), open in new tab
      if (doc.mime_type.startsWith('image/') || doc.mime_type === 'application/pdf') {
        const response = await api.get(`documents/${doc.id}/download`, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        window.open(url, '_blank');
        // Note: URL.revokeObjectURL can be called after some time to free memory
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      } else {
        // For other files, download them
        handleDownload(doc);
      }
    } catch (error) {
      console.error('Open failed:', error);
      setNotification({
        open: true,
        message: 'Failed to open document',
        severity: 'error'
      });
    }
  }, [handleDownload]);

  const handleCompress = useCallback(async (doc: Document) => {
    // For now, just download the document (compression logic can be added later)
    // If it's an image, we could compress it client-side
    if (doc.mime_type.startsWith('image/')) {
      try {
        const response = await api.get(`documents/${doc.id}/download`, {
          responseType: 'blob'
        });

        // Create a compressed version (simple example: reduce quality for JPEG)
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width * 0.5; // Reduce size by half
          canvas.height = img.height * 0.5;
          ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            const url = window.URL.createObjectURL(blob!);
            const link = window.document.createElement('a');
            link.href = url;
            link.setAttribute('download', `compressed_${doc.original_name}`);
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          }, doc.mime_type, 0.7); // 70% quality
        };
        img.src = URL.createObjectURL(response.data);
      } catch (error) {
        console.error('Compress failed:', error);
        setNotification({
          open: true,
          message: 'Failed to compress document',
          severity: 'error'
        });
      }
    } else {
      // For non-images, just download as is
      handleDownload(doc);
    }
  }, [handleDownload]);

  const handleDelete = useCallback(async (document: Document) => {
    if (!await confirm({ message: `Are you sure you want to delete "${document.original_name}"?` })) {
      return;
    }

    try {
      await api.delete(`documents/${document.id}`);
      setDocuments(prev => prev.filter(d => d.id !== document.id));
      setNotification({
        open: true,
        message: 'Document deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Delete failed:', error);
      setNotification({
        open: true,
        message: 'Failed to delete document',
        severity: 'error'
      });
    }
  }, [confirm]);

  const handleVerify = useCallback(async (document: Document) => {
    try {
      await api.put(`documents/${document.id}/verify`);
      setDocuments(prev => prev.map(d =>
        d.id === document.id
          ? { ...d, is_verified: true, verified_at: new Date().toISOString() }
          : d
      ));
      setNotification({
        open: true,
        message: 'Document verified successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Verification failed:', error);
      setNotification({
        open: true,
        message: 'Failed to verify document',
        severity: 'error'
      });
    }
  }, []);

  const handleEdit = useCallback((document: Document) => {
    setSelectedDocument(document);
    setFormData({
      document_type_id: document.document_type_id || '',
      document_number: document.document_number || '',
      description: document.description || '',
      expiry_date: document.expiry_date || '',
      is_required: document.is_required
    });
    setEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selectedDocument) return;

    try {
      const response = await api.put(`documents/${selectedDocument.id}`, formData);
      setDocuments(prev => prev.map(d =>
        d.id === selectedDocument.id ? response.data : d
      ));
      setNotification({
        open: true,
        message: 'Document updated successfully',
        severity: 'success'
      });
      setEditDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Update failed:', error);
      setNotification({
        open: true,
        message: 'Failed to update document',
        severity: 'error'
      });
    }
  }, [selectedDocument, formData]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType === 'application/pdf') return <PictureAsPdf color="error" />;
    if (mimeType.startsWith('image/')) return <Image color="primary" />;
    return <InsertDriveFile color="action" />;
  }, []);

  const getDocumentTypeName = useCallback((typeId?: string) => {
    if (!typeId) return 'General';
    const type = documentTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  }, [documentTypes]);

  if (!contractId) {
    return (
      <Box textAlign="center" py={8}>
        <FolderOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Please select a contract to view documents
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid2 container spacing={3}>
        {/* Upload Area */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              border: `2px dashed ${theme.palette.divider}`,
              bgcolor: 'transparent',
              textAlign: 'center',
              py: 4,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Upload Document
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              PDF, JPG, PNG, DOC, DOCX
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Maximum file size: 10MB
            </Typography>
          </Card>
        </Grid2>

        {/* Documents List */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box p={3} borderBottom={`1px solid ${theme.palette.divider}`}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Contract Documents</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
                    </Typography>
                  </Box>
                  {documents.length > 0 && (
                    <Chip
                      label={`${documents.filter(d => d.is_verified).length}/${documents.length} Verified`}
                      color={documents.every(d => d.is_verified) ? "success" : "warning"}
                      size="small"
                    />
                  )}
                </Stack>
              </Box>

              {loading ? (
                <Box p={4} textAlign="center">
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading documents...
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {documents.length > 0 ? (
                    <Grid2 container spacing={2}>
                      {documents.map((doc) => (
                        <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={doc.id}>
                          <Card
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              '&:hover': { boxShadow: 3 }
                            }}
                          >
                            <Box position="relative">
                              {thumbnails[doc.id] ? (
                                <CardMedia
                                  component="img"
                                  height="140"
                                  image={thumbnails[doc.id]}
                                  alt={doc.original_name}
                                  sx={{ objectFit: 'cover' }}
                                />
                              ) : (
                                <Box
                                  height={140}
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  bgcolor={alpha(theme.palette.primary.main, 0.1)}
                                >
                                  {getFileIcon(doc.mime_type)}
                                </Box>
                              )}
                              <Box position="absolute" top={8} right={8}>
                                <Badge
                                  overlap="circular"
                                  badgeContent={
                                    doc.is_verified ? (
                                      <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                    ) : doc.is_required ? (
                                      <Error sx={{ fontSize: 16, color: 'warning.main' }} />
                                    ) : null
                                  }
                                />
                              </Box>
                            </Box>
                            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} noWrap title={doc.original_name}>
                                {doc.original_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {getDocumentTypeName(doc.document_type_id)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                              </Typography>
                              {doc.document_number && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  #{doc.document_number}
                                </Typography>
                              )}
                              {doc.expiry_date && (
                                <Typography variant="caption" color="warning.main" display="block">
                                  Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                </Typography>
                              )}
                              {doc.description && (
                                <Typography variant="caption" color="text.secondary" display="block" noWrap title={doc.description}>
                                  {doc.description}
                                </Typography>
                              )}
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Open">
                                  <IconButton size="small" onClick={() => handleOpen(doc)}>
                                    <OpenInNew fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download">
                                  <IconButton size="small" onClick={() => handleDownload(doc)}>
                                    <Download fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Compress">
                                  <IconButton size="small" onClick={() => handleCompress(doc)}>
                                    <Compress fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleEdit(doc)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {!doc.is_verified && (
                                  <Tooltip title="Verify Document">
                                    <IconButton size="small" onClick={() => handleVerify(doc)} color="success">
                                      <Verified fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDelete(doc)} color="error">
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </CardActions>
                          </Card>
                        </Grid2>
                      ))}
                    </Grid2>
                  ) : (
                    <Box textAlign="center" py={8}>
                      <InsertDriveFile sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Documents Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload your first document to get started
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          {uploading && (
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>Uploading...</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Stack spacing={3} mt={1}>
            {selectedFile && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>File:</strong> {selectedFile.name}<br />
                  <strong>Size:</strong> {formatFileSize(selectedFile.size)}<br />
                  <strong>Type:</strong> {selectedFile.type}
                </Typography>
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={formData.document_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, document_type_id: e.target.value }))}
                label="Document Type"
              >
                <MenuItem value="">General Document</MenuItem>
                {documentTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name} {type.is_required && '(Required)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Document Number"
              value={formData.document_number}
              onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
              placeholder="Invoice #, Certificate #, etc."
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              placeholder="Brief description of the document"
            />

            <TextField
              fullWidth
              type="date"
              label="Expiry Date"
              value={formData.expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.is_required} onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))} />}
              label="Required Document"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={formData.document_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, document_type_id: e.target.value }))}
                label="Document Type"
              >
                <MenuItem value="">General Document</MenuItem>
                {documentTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name} {type.is_required && '(Required)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Document Number"
              value={formData.document_number}
              onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              type="date"
              label="Expiry Date"
              value={formData.expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.is_required} onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))} />}
              label="Required Document"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={notification.severity} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default Documents;