import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  ToggleButtonGroup,
  ToggleButton,
  ListItemButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  CreateNewFolder,
  CloudUpload,
  MoreVert,
  Delete,
  Download,
  ArrowBack,
  Scanner,
  Image as ImageIcon,
  Description,
  Settings,
  GridView,
  List as ListIcon,
  ContentCopy,
  DriveFileMove,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  Search,
  Home,
  Refresh,
  Info,
  Explore,
  ZoomIn,
  ZoomOut,
  RestartAlt,
    Print
  } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { motion, useAnimation } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../config/permissions';
import { 
  Checkbox, 
  Tooltip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Toolbar,
  InputBase
} from '@mui/material';

interface ArchiveFolder {
  id: number;
  name: string;
  parent_id: number | null;
  description?: string;
  is_system?: boolean;
}

interface ArchiveFile {
  id: number;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  description?: string;
  ocr_text?: string;
}

const ArchiveBrowser: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<ArchiveFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null, name: string }[]>([{ id: null, name: 'Main Archive' }]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection states
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);

  // Dialog states
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState(''); // Added for renaming before save
  const [uploadDescription, setUploadDescription] = useState('');
  
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const canUpload = hasPermission(PERMISSIONS.UPLOAD_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE);
  const canDownload = hasPermission(PERMISSIONS.DOWNLOAD_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE);
  const canManage = hasPermission(PERMISSIONS.MANAGE_ARCHIVE);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ArchiveFile | null>(null);
  const [previewTab, setPreviewTab] = useState(0);

  // Print support
  const printIframeRef = React.useRef<HTMLIFrameElement>(null);

  const handlePrint = (fileId: number) => {
    const url = getFilePreviewUrl(fileId);
    if (printIframeRef.current) {
      printIframeRef.current.src = url;
    }
  };

  const onIframeLoad = () => {
    if (printIframeRef.current && printIframeRef.current.src) {
      try {
        printIframeRef.current.contentWindow?.print();
      } catch (e) {
        console.error("Print failed", e);
        window.open(printIframeRef.current.src, '_blank');
      }
    }
  };
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<'in' | 'out' | 'none'>('none');
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  
  // Copy/Move Dialog
  const [openTargetDialog, setOpenTargetDialog] = useState(false);
  const [targetAction, setTargetAction] = useState<'copy' | 'move' | null>(null);
  const [targetFolders, setTargetFolders] = useState<ArchiveFolder[]>([]);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<number | null>(null);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'folder' | 'file', id: number, data: any } | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: 'folder' | 'file', data: any) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedItem({ type, id: data.id, data });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const toggleFileSelection = (id: number) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const toggleFolderSelection = (id: number) => {
    setSelectedFolders(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(files.map(f => f.id));
      setSelectedFolders(folders.filter(f => !f.is_system).map(f => f.id));
    } else {
      setSelectedFiles([]);
      setSelectedFolders([]);
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectedFolders([]);
  };

  const fetchTargetFolders = async () => {
    try {
      const res = await api.get('/archive/folders');
      setTargetFolders(res.data);
    } catch (error) {
      console.error("Failed to fetch target folders", error);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      alert(t('You do not have permission to delete items'));
      return;
    }
    if (!window.confirm(t('Are you sure you want to delete selected items?'))) return;
    
    setLoading(true);
    try {
      await api.post('/archive/bulk-delete', {
        file_ids: selectedFiles,
        folder_ids: selectedFolders
      });
      clearSelection();
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert(t('Failed to delete some items'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!selectedTargetFolder || !targetAction) return;
    
    setLoading(true);
    try {
      const endpoint = targetAction === 'move' ? '/archive/bulk-move' : '/archive/bulk-copy';
      await api.post(endpoint, {
        file_ids: selectedFiles,
        folder_ids: selectedFolders,
        target_folder_id: selectedTargetFolder
      });
      setOpenTargetDialog(false);
      clearSelection();
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error(`${targetAction} failed`, error);
      alert(t(`Failed to ${targetAction} items`));
    } finally {
      setLoading(false);
    }
  };

  const handleExploreFolder = async (folderId?: number) => {
    const id = folderId || currentFolder?.id;
    if (!id) return;
    try {
      await api.post(`/archive/folders/${id}/explore`);
    } catch (error) {
      console.error("Explore folder failed", error);
      alert(t('Failed to open local storage'));
    }
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const fetchContent = async (folderId: number | null) => {
    setLoading(true);
    try {
      // Initialize archive if needed (ensures system folders exist)
      if (folderId === null) {
        await api.get('/archive/init');
      }
      
      const folderRes = await api.get(`/archive/folders${folderId ? `?parent_id=${folderId}` : ''}`);
      setFolders(folderRes.data);

      if (folderId) {
        const fileRes = await api.get(`/archive/files?folder_id=${folderId}`);
        setFiles(fileRes.data);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error("Failed to fetch archive content", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (file: ArchiveFile) => {
    if (!canDownload) {
      alert(t('You do not have permission to download files'));
      return;
    }
    const baseUrl = api.defaults.baseURL || '';
    const token = localStorage.getItem('access_token');
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    let url = '';
    if (cleanBaseUrl === '/api' || cleanBaseUrl === '') {
      url = `${window.location.origin}/api/archive/files/${file.id}/download`;
    } else {
      url = `${cleanBaseUrl}/archive/files/${file.id}/download`;
    }

    if (token) {
      url += `?token=${token}`;
    }

    window.open(url, '_blank');
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!canDelete) {
      alert(t('You do not have permission to delete files'));
      return;
    }
    if (!window.confirm(t('Are you sure?'))) return;
    try {
      await api.delete(`/archive/files/${fileId}`);
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleDeleteFolder = async (folder: ArchiveFolder) => {
    if ((folder as any).is_system) return;
    if (!canDelete) {
      alert(t('You do not have permission to delete folders'));
      return;
    }
    if (!window.confirm(t('Are you sure?'))) return;
    try {
      await api.delete(`/archive/folders/${folder.id}`);
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  useEffect(() => {
    fetchContent(null);
  }, []);

  const handleFolderClick = (folder: ArchiveFolder) => {
    setCurrentFolder(folder);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    fetchContent(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolder(target.id ? { id: target.id, name: target.name, parent_id: null } : null);
    fetchContent(target.id);
  };

  const handleFileClick = (file: ArchiveFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 5));
    setZoomMode('in');
  };
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
    setZoomMode('out');
  };
  const handleResetZoom = () => {
    setZoom(1);
    setZoomMode('none');
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (zoomMode === 'in') {
      setZoom(prev => Math.min(prev + 0.5, 5));
    } else if (zoomMode === 'out') {
      setZoom(prev => Math.max(prev - 0.5, 0.5));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (previewTab !== 0) return;
    
    // Only zoom images with wheel, or PDF if we want (but user said PDF wheel is for scroll)
    if (isImage(previewFile?.file_type || '')) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
    }
    // For PDFs, we let the default scroll behavior happen
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = (dist - touchStartDist) / 100;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  const getFilePreviewUrl = (fileId: number) => {
    const baseUrl = api.defaults.baseURL || '';
    const token = localStorage.getItem('access_token');
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    let url = '';
    if (cleanBaseUrl === '/api' || cleanBaseUrl === '') {
      url = `${window.location.origin}/api/archive/files/${fileId}/view`;
    } else {
      url = `${cleanBaseUrl}/archive/files/${fileId}/view`;
    }

    return token ? `${url}?token=${token}` : url;
  };

  const isImage = (fileType: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType.toLowerCase());
  };

  const isZoomable = (fileType: string) => {
    return isImage(fileType) || fileType.toLowerCase() === 'pdf';
  };

  const handleCreateFolder = async () => {
    if (!canUpload) {
      alert(t('You do not have permission to create folders'));
      return;
    }
    try {
      await api.post('/archive/folders', {
        name: newFolderName,
        parent_id: currentFolder?.id || null
      });
      setOpenFolderDialog(false);
      setNewFolderName('');
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Failed to create folder", error);
    }
  };

  // --- Scanner Support ---
    const [scanners, setScanners] = useState<any[]>([]);
    const [openScanDialog, setOpenScanDialog] = useState(false);
    const [scanData, setScanData] = useState({
        scanner_id: '',
        filename: '',
        description: ''
    });

    const fetchScanners = async () => {
        try {
            const res = await api.get('/archive/scanners');
            setScanners(res.data);
            if (res.data.length > 0) {
                setScanData(prev => ({ ...prev, scanner_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch scanners', error);
        }
    };

    const handleScan = async () => {
        if (!canUpload) {
            alert(t('You do not have permission to scan files'));
            return;
        }
        if (!scanData.scanner_id || !scanData.filename) {
            alert(t('Please select a scanner and enter a filename'));
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('scanner_id', scanData.scanner_id);
            formData.append('folder_id', currentFolder?.id.toString() || '');
            formData.append('filename', scanData.filename);
            formData.append('description', scanData.description);

            await api.post('/archive/scan', formData);
            setOpenScanDialog(false);
            setScanData({ scanner_id: scanners[0]?.id || '', filename: '', description: '' });
            fetchContent(currentFolder?.id || null);
        } catch (error) {
            console.error('Scan failed', error);
            alert(t('Scan failed'));
        } finally {
            setUploading(false);
        }
    };
    const handleUpload = async () => {
        if (!canUpload) {
            alert(t('You do not have permission to upload files'));
            return;
        }
        if (!uploadFile || !currentFolder) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('folder_id', currentFolder.id.toString());
            if (uploadName) {
                formData.append('name', uploadName);
            }
            if (uploadDescription) {
                formData.append('description', uploadDescription);
            }

            await api.post('/archive/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setOpenUploadDialog(false);
            setUploadFile(null);
            setUploadName('');
            setUploadDescription('');
            fetchContent(currentFolder.id);
        } catch (error: any) {
            console.error('Upload failed', error);
            const errorMessage = error.response?.data?.detail || error.message || "Upload failed";
            alert(`${t('Error')}: ${errorMessage}`);
        } finally {
            setUploading(false);
        }
    };

    const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !currentFolder) return;

        setBulkUploading(true);
        setBulkProgress(0);

        const formData = new FormData();
        formData.append('parent_folder_id', currentFolder.id.toString());
        
        const relativePaths: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            formData.append('files', file);
            // webkitRelativePath contains the path starting from the folder name
            relativePaths.push((file as any).webkitRelativePath || file.name);
        }
        
        formData.append('relative_paths', JSON.stringify(relativePaths));

        try {
            await api.post('/archive/bulk-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setBulkProgress(percentCompleted);
                },
            });
            
            fetchContent(currentFolder.id);
            alert(t('Folder structure uploaded successfully'));
        } catch (error: any) {
            console.error('Bulk upload failed', error);
            alert(t('Failed to upload folder structure'));
        } finally {
            setBulkUploading(false);
            setBulkProgress(0);
            if (folderInputRef.current) {
                folderInputRef.current.value = '';
            }
        }
    };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header and Toolbar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Folder sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            <Typography variant="h4" fontWeight="bold" color="primary">
              {t('Electronic Archive')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canManage && (
              <Tooltip title={t('Settings')}>
                <IconButton color="primary" onClick={() => navigate('/archive/settings')}>
                  <Settings />
                </IconButton>
              </Tooltip>
            )}
            {currentFolder && (
              <Tooltip title={t('Explore in Local Storage')}>
                <IconButton color="primary" onClick={() => handleExploreFolder()}>
                  <Explore />
                </IconButton>
              </Tooltip>
            )}
            {canUpload && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolder />}
                  onClick={() => setOpenFolderDialog(true)}
                >
                  {t('New Folder')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Scanner />}
                  onClick={() => {
                    fetchScanners();
                    setOpenScanDialog(true);
                  }}
                  disabled={!currentFolder}
                >
                  {t('Scan')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setOpenUploadDialog(true)}
                  disabled={!currentFolder || bulkUploading}
                >
                  {t('Upload File')}
                </Button>
                <input
                  type="file"
                  ref={folderInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFolderUpload}
                  {...({ webkitdirectory: "", directory: "" } as any)}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={bulkUploading ? <CircularProgress size={20} color="inherit" /> : <CreateNewFolder />}
                  onClick={() => folderInputRef.current?.click()}
                  disabled={!currentFolder || bulkUploading}
                >
                  {bulkUploading ? `${bulkProgress}%` : t('Upload Folder Tree')}
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Breadcrumbs */}
          <Breadcrumbs separator="/" sx={{ flexGrow: 1, px: 1 }}>
            {breadcrumbs.map((bc, idx) => (
              <Link
                key={idx}
                component="button"
                variant="body1"
                underline="hover"
                color={idx === breadcrumbs.length - 1 ? "text.primary" : "primary.main"}
                onClick={() => handleBreadcrumbClick(idx)}
                sx={{ 
                  fontWeight: idx === breadcrumbs.length - 1 ? 'bold' : 'medium',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  p: 0,
                  fontSize: '1rem'
                }}
              >
                {t(bc.name)}
              </Link>
            ))}
          </Breadcrumbs>

          {/* Search and View Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewMode === 'grid' && (
              <Tooltip title={t('Select All')}>
                <IconButton 
                  onClick={() => handleSelectAll(selectedFiles.length === 0 && selectedFolders.length === 0)}
                  size="small"
                  color={(selectedFiles.length > 0 || selectedFolders.length > 0) ? 'primary' : 'default'}
                >
                  <CheckBox />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('Refresh')}>
              <IconButton onClick={() => fetchContent(currentFolder?.id || null)} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Paper
              variant="outlined"
              sx={{ 
                p: '2px 4px', 
                display: 'flex', 
                alignItems: 'center', 
                width: { xs: '100%', sm: 250 },
                bgcolor: alpha(theme.palette.background.default, 0.5)
              }}
            >
              <Search sx={{ p: '4px', color: 'text.secondary' }} />
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder={t('Search files and folders...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Paper>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                color={viewMode === 'grid' ? 'primary' : 'default'} 
                onClick={() => setViewMode('grid')}
                size="small"
              >
                <GridView />
              </IconButton>
              <IconButton 
                color={viewMode === 'list' ? 'primary' : 'default'} 
                onClick={() => setViewMode('list')}
                size="small"
              >
                <ListIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Bulk Action Toolbar */}
      {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
        <Paper 
          elevation={4}
          sx={{ 
            p: 1.5, 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${theme.palette.primary.main}`,
            borderRadius: 2,
            position: 'sticky',
            top: 10,
            zIndex: 10
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1, ml: 1 }}>
            {selectedFiles.length + selectedFolders.length} {t('Items Selected')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<ContentCopy />}
              onClick={() => {
                setTargetAction('copy');
                fetchTargetFolders();
                setOpenTargetDialog(true);
              }}
            >
              {t('Copy')}
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<DriveFileMove />}
              onClick={() => {
                setTargetAction('move');
                fetchTargetFolders();
                setOpenTargetDialog(true);
              }}
            >
              {t('Move')}
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="error" 
              startIcon={<Delete />}
              onClick={handleBulkDelete}
            >
              {t('Delete')}
            </Button>
            <IconButton size="small" onClick={clearSelection}>
              <Close />
            </IconButton>
          </Box>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <Grid item xs={12} sm={6} md={3} lg={2} key={`folder-${folder.id}`}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: '0.2s',
                  border: selectedFolders.includes(folder.id) ? `2px solid ${theme.palette.primary.main}` : 'none',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => handleFolderClick(folder)}
              >
                <Box sx={{ position: 'absolute', top: 5, right: 5, zIndex: 1, display: 'flex', alignItems: 'center' }}>
                  {!(folder as any).is_system && (
                    <Checkbox 
                      size="small" 
                      checked={selectedFolders.includes(folder.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolderSelection(folder.id);
                      }}
                    />
                  )}
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'folder', folder)}>
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>
                <Folder sx={{ fontSize: 70, color: '#ffd700', mb: 1 }} />
                <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: '100%' }}>
                  {t(folder.name)}
                </Typography>
              </Paper>
            </Grid>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <Grid item xs={12} sm={6} md={3} lg={2} key={`file-${file.id}`}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: '0.2s',
                  border: selectedFiles.includes(file.id) ? `2px solid ${theme.palette.primary.main}` : 'none',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.05),
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => handleFileClick(file)}
              >
                <Box sx={{ position: 'absolute', top: 5, right: 5, zIndex: 1, display: 'flex', alignItems: 'center' }}>
                  <Checkbox 
                    size="small" 
                    checked={selectedFiles.includes(file.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.id);
                    }}
                  />
                  <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, 'file', file)}
                      sx={{ bgcolor: alpha(theme.palette.background.paper, 0.7) }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); handlePrint(file.id); }}
                      sx={{ bgcolor: alpha(theme.palette.background.paper, 0.7), ml: 0.5 }}
                    >
                      <Print fontSize="small" />
                    </IconButton>
                  </Box>
                {isImage(file.file_type) ? (
                  <Box
                    component="img"
                    src={getFilePreviewUrl(file.id)}
                    sx={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 1,
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    alt={file.name}
                  />
                ) : file.file_type === 'pdf' ? (
                  <Description sx={{ fontSize: 70, color: '#f44336', mb: 1 }} />
                ) : (
                  <InsertDriveFile sx={{ fontSize: 70, color: '#2196f3', mb: 1 }} />
                )}
                <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: '100%' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.file_size / 1024).toFixed(1)} KB
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox 
                    size="small"
                    indeterminate={
                      (selectedFiles.length > 0 || selectedFolders.length > 0) &&
                      (selectedFiles.length < files.length || selectedFolders.length < folders.length)
                    }
                    checked={files.length > 0 && selectedFiles.length === files.length && selectedFolders.length === folders.filter(f => !f.is_system).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>{t('Name')}</TableCell>
                <TableCell>{t('Type')}</TableCell>
                <TableCell>{t('Size')}</TableCell>
                <TableCell>{t('Date')}</TableCell>
                <TableCell align="right">{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFolders.map((folder) => (
                <TableRow 
                  key={`folder-${folder.id}`}
                  hover
                  selected={selectedFolders.includes(folder.id)}
                  onClick={() => handleFolderClick(folder)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    {!folder.is_system && (
                      <Checkbox 
                        size="small"
                        checked={selectedFolders.includes(folder.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFolderSelection(folder.id);
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Folder sx={{ color: '#ffd700' }} fontSize="small" />
                      <Typography variant="body2">{t(folder.name)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{t('Folder')}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'folder', folder)}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredFiles.map((file) => (
                <TableRow 
                  key={`file-${file.id}`}
                  hover
                  selected={selectedFiles.includes(file.id)}
                  onClick={() => handleFileClick(file)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox 
                      size="small"
                      checked={selectedFiles.includes(file.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file.id);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isImage(file.file_type) ? <ImageIcon color="primary" fontSize="small" /> : <InsertDriveFile color="primary" fontSize="small" />}
                      <Typography variant="body2">{file.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{file.file_type.toUpperCase()}</TableCell>
                  <TableCell>{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'file', file)}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(file.id);
                    }}>
                      <Print fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Empty State */}
      {!loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
          {searchQuery ? <Search sx={{ fontSize: 80, mb: 2 }} /> : <InsertDriveFile sx={{ fontSize: 80, mb: 2 }} />}
          <Typography variant="h6">{searchQuery ? t('No items match your search') : t('Folder is Empty')}</Typography>
        </Box>
      )}

      {/* Target Folder Selection Dialog (for Copy/Move) */}
      <Dialog open={openTargetDialog} onClose={() => setOpenTargetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {targetAction === 'move' ? t('Move Items To') : t('Copy Items To')}
        </DialogTitle>
        <DialogContent dividers>
           <List>
             {targetFolders.map((folder) => (
               <ListItemButton 
                 key={folder.id}
                 selected={selectedTargetFolder === folder.id}
                 onClick={() => setSelectedTargetFolder(folder.id)}
               >
                 <ListItemIcon><Folder sx={{ color: '#ffd700' }} /></ListItemIcon>
                 <ListItemText primary={t(folder.name)} secondary={folder.description} />
               </ListItemButton>
             ))}
            {targetFolders.length === 0 && (
              <Typography sx={{ p: 2, textAlign: 'center' }}>{t('No target folders available')}</Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTargetDialog(false)}>{t('Cancel')}</Button>
          <Button 
            onClick={handleBulkAction} 
            variant="contained" 
            disabled={!selectedTargetFolder}
          >
            {targetAction === 'move' ? t('Move Here') : t('Copy Here')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem?.type === 'folder' && (
          <MenuItem onClick={() => {
            handleExploreFolder(selectedItem.id);
            handleMenuClose();
          }}>
            <ListItemIcon><Explore fontSize="small" /></ListItemIcon>
            <ListItemText>{t('Explore Local')}</ListItemText>
          </MenuItem>
        )}
        {selectedItem?.type === 'file' && (
          <Box>
            <MenuItem onClick={() => { handleFileClick(selectedItem.data); handleMenuClose(); }}>
              <ListItemIcon><InsertDriveFile fontSize="small" /></ListItemIcon>
              <ListItemText>{t('Open')}</ListItemText>
            </MenuItem>
            {canDownload && (
              <MenuItem onClick={() => { handleDownload(selectedItem.data); handleMenuClose(); }}>
                <ListItemIcon><Download fontSize="small" /></ListItemIcon>
                <ListItemText>{t('Download')}</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={() => { handlePrint(selectedItem.id); handleMenuClose(); }}>
              <ListItemIcon><Print fontSize="small" /></ListItemIcon>
              <ListItemText>{t('Print')}</ListItemText>
            </MenuItem>
          </Box>
        )}
        {canDelete && (
          <MenuItem 
            onClick={() => { 
              if (selectedItem?.type === 'file') handleDeleteFile(selectedItem.id);
              else if (selectedItem?.type === 'folder') handleDeleteFolder(selectedItem.data);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>{t('Delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description />
            <Typography variant="h6" component="div">
              {previewFile?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {previewTab === 0 && isZoomable(previewFile?.file_type || '') && (
              <>
                <Tooltip title={t('Zoom Out')}>
                  <IconButton 
                    onClick={handleZoomOut} 
                    color={zoomMode === 'out' ? 'secondary' : 'inherit'} 
                    size="small"
                    sx={{ bgcolor: zoomMode === 'out' ? alpha(theme.palette.secondary.main, 0.2) : 'transparent' }}
                  >
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </Typography>
                <Tooltip title={t('Zoom In')}>
                  <IconButton 
                    onClick={handleZoomIn} 
                    color={zoomMode === 'in' ? 'secondary' : 'inherit'} 
                    size="small"
                    sx={{ bgcolor: zoomMode === 'in' ? alpha(theme.palette.secondary.main, 0.2) : 'transparent' }}
                  >
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('Reset Zoom')}>
                  <IconButton onClick={handleResetZoom} color="inherit" size="small" sx={{ mr: 1 }}>
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {canDownload && (
              <Tooltip title={t('Print')}>
                <IconButton onClick={() => { if (previewFile) handlePrint(previewFile.id); }} color="inherit" size="small" sx={{ mr: 1 }}>
                  <Print />
                </IconButton>
              </Tooltip>
            )}
            {canDownload && (
              <IconButton onClick={() => previewFile && handleDownload(previewFile)} color="inherit" size="small" sx={{ mr: 1 }}>
                <Download />
              </IconButton>
            )}
            <IconButton onClick={() => setPreviewOpen(false)} color="inherit" size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs value={previewTab} onChange={(_, val) => setPreviewTab(val)} aria-label="preview tabs">
            <Tab label={t('Preview')} icon={<ImageIcon fontSize="small" />} iconPosition="start" />
            <Tab label={t('Details & OCR')} icon={<Info fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
          {previewFile && (
            previewTab === 0 ? (
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  overflow: 'auto', // Allow scroll if zoomed
                  p: 2,
                  position: 'relative',
                  touchAction: 'none',
                  cursor: zoomMode === 'in' ? 'zoom-in' : zoomMode === 'out' ? 'zoom-out' : 'default'
                }}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handlePreviewClick}
               >
                <Box
                  component={motion.div}
                  drag={zoom > 1}
                  dragMomentum={false}
                  dragElastic={0.1}
                  animate={{ scale: zoom }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    transformOrigin: 'center center'
                  }}
                >
                  {isImage(previewFile.file_type) ? (
                    <Box
                      component="img"
                      src={getFilePreviewUrl(previewFile.id)}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        boxShadow: 3,
                        borderRadius: 1,
                        pointerEvents: zoomMode === 'none' ? 'auto' : 'none'
                      }}
                    />
                  ) : previewFile.file_type === 'pdf' ? (
                    <iframe
                      src={getFilePreviewUrl(previewFile.id)}
                      width="100%"
                      height="100%"
                      title={previewFile.name}
                      style={{ 
                        border: 'none', 
                        backgroundColor: 'white', 
                        minHeight: '80vh',
                        pointerEvents: zoomMode === 'none' ? 'auto' : 'none'
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
                      <InsertDriveFile sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        {t('Preview not available for this file type')}
                      </Typography>
                      {canDownload && (
                      <Button 
                        variant="contained" 
                        startIcon={<Download />} 
                        onClick={() => handleDownload(previewFile)}
                        sx={{ mt: 2 }}
                      >
                        {t('Download to view')}
                      </Button>
                    )}
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 3, bgcolor: 'white', height: '100%', overflow: 'auto' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('File Details')}</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">{t('File Name')}</Typography>
                        <Typography variant="body2" fontWeight="bold">{previewFile.name}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">{t('File Type')}</Typography>
                        <Typography variant="body2">{previewFile.file_type.toUpperCase()}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">{t('File Size')}</Typography>
                        <Typography variant="body2">{(previewFile.file_size / 1024).toFixed(2)} KB</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('Created At')}</Typography>
                        <Typography variant="body2">{new Date(previewFile.created_at).toLocaleString()}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('Extracted Text (OCR)')}</Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '300px', 
                        overflow: 'auto', 
                        bgcolor: '#fdfdfd',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {previewFile.ocr_text || t('No text extracted from this file')}
                    </Paper>
                    {previewFile.description && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('Description')}</Typography>
                        <Typography variant="body2">{previewFile.description}</Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={openFolderDialog} onClose={() => setOpenFolderDialog(false)}>
        <DialogTitle>{t('Create New Folder')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('Folder Name')}
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFolderDialog(false)}>{t('Cancel')}</Button>
          <Button onClick={handleCreateFolder} variant="contained">{t('Create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => !uploading && setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Upload File')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<InsertDriveFile />}
              disabled={uploading}
            >
              {uploadFile ? uploadFile.name : t('Select File')}
              <input
                type="file"
                hidden
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                    setUploadName(e.target.files[0].name);
                  }
                }}
              />
            </Button>

            {uploadFile && (
              <>
                <TextField
                  label={t('File Name')}
                  fullWidth
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  helperText={t('You can change the name before saving')}
                  disabled={uploading}
                />
                <TextField
                  label={t('Description')}
                  fullWidth
                  multiline
                  rows={3}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={uploading}
                />
              </>
            )}
            {uploading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)} disabled={uploading}>{t('Cancel')}</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!uploadFile || uploading}
          >
            {t('Upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan Dialog */}
      <Dialog open={openScanDialog} onClose={() => !uploading && setOpenScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Scan Document')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth disabled={uploading}>
              <InputLabel>{t('Select Scanner')}</InputLabel>
              <Select
                value={scanData.scanner_id}
                label={t('Select Scanner')}
                onChange={(e) => setScanData({ ...scanData, scanner_id: e.target.value as string })}
              >
                {scanners.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name} ({s.device_type})</MenuItem>
                ))}
                {scanners.length === 0 && (
                  <MenuItem disabled value="">{t('No scanners found')}</MenuItem>
                )}
              </Select>
            </FormControl>

            <TextField
              label={t('File Name')}
              fullWidth
              value={scanData.filename}
              onChange={(e) => setScanData({ ...scanData, filename: e.target.value })}
              placeholder={t('Enter name for scanned file')}
              disabled={uploading}
            />

            <TextField
              label={t('Description')}
              fullWidth
              multiline
              rows={3}
              value={scanData.description}
              onChange={(e) => setScanData({ ...scanData, description: e.target.value })}
              disabled={uploading}
            />
            
            {uploading && (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ mb: 1 }} />
                <Typography variant="body2">{t('Scanning in progress...')}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScanDialog(false)} disabled={uploading}>{t('Cancel')}</Button>
          <Button
            onClick={handleScan}
            variant="contained"
            disabled={!scanData.scanner_id || !scanData.filename || uploading}
          >
            {t('Start Scan')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Hidden iframe for printing */}
      <iframe
        ref={printIframeRef}
        style={{ display: 'none' }}
        title="print-iframe"
        onLoad={onIframeLoad}
      />
    </Box>
  );
};

export default ArchiveBrowser;
