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
  Skeleton,
  List,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  ListItemButton,
  Tabs,
  Tab,
  Chip
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
  Close,
  Search,
  Refresh,
  Info,
  Explore,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Print,
  OpenInNew,
  ChevronRight,
  ExpandMore
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
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

// Restrictions removed as per user request for unlimited uploads and all file types
const ALLOWED_EXTENSIONS: string[] = []; 
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB as a practical limit

const ArchiveBrowser: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, alert } = useConfirm();
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // ... rest of state and effects
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<ArchiveFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null, name: string }[]>([{ id: null, name: t('Main Archive') }]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 50;
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

  const canUpload = React.useMemo(() => hasPermission(PERMISSIONS.UPLOAD_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE), [hasPermission]);
  const canDelete = React.useMemo(() => hasPermission(PERMISSIONS.DELETE_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE), [hasPermission]);
  const canDownload = React.useMemo(() => hasPermission(PERMISSIONS.DOWNLOAD_ARCHIVE) || hasPermission(PERMISSIONS.MANAGE_ARCHIVE), [hasPermission]);
  const canManage = React.useMemo(() => hasPermission(PERMISSIONS.MANAGE_ARCHIVE), [hasPermission]);
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
  const [folderTree, setFolderTree] = useState<any[]>([]);

  // Edit Dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  // Permission Management Dialog
  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForPerm, setSelectedUserForPerm] = useState('');
  const [newPermLevel, setNewPermLevel] = useState('view');
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Fetch users on mount or when dialog opens
  const fetchAllUsers = async () => {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const usersRes = await api.get('archive/users');
      console.log("Archive users fetched:", usersRes.data);
      setAllUsers(usersRes.data || []);
    } catch (error) {
      console.error("Failed to fetch archive users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (openPermissionDialog) {
      fetchAllUsers();
    }
  }, [openPermissionDialog]);

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
      setSelectedFolders(folders.map(f => f.id));
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
      const res = await api.get('archive/folder-tree');
      setFolderTree(res.data);
      // Also keep targetFolders for compatibility if needed elsewhere
      const flatFolders = await api.get('archive/folders');
      setTargetFolders(flatFolders.data);
    } catch (error) {
      console.error("Failed to fetch folder tree", error);
    }
  };

  const handleDownloadZip = (folderId: number, folderName: string) => {
    const token = localStorage.getItem('access_token');
    let url = `/api/archive/folders/${folderId}/download-zip`;
    if (token) url += `?token=${token}`;
    window.open(url, '_blank');
  };

  const handleOpenEdit = () => {
    if (!selectedItem) return;
    setEditName(selectedItem.type === 'file' ? selectedItem.data.original_name : selectedItem.data.name);
    setEditDescription(selectedItem.data.description || '');
    setEditIsPublic(selectedItem.data.is_public || false);
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const fetchPermissions = async (folderId: number) => {
    setLoadingPerms(true);
    try {
      const res = await api.get(`archive/folders/${folderId}/permissions`);
      setPermissions(res.data);
    } catch (error) {
      console.error("Failed to fetch permissions", error);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleOpenPermissions = () => {
    if (!selectedItem || selectedItem.type !== 'folder') return;
    fetchPermissions(selectedItem.id);
    setOpenPermissionDialog(true);
    handleMenuClose();
  };

  const handleAddPermission = async () => {
    if (!selectedItem || !selectedUserForPerm) return;
    try {
      await api.post(`archive/folders/${selectedItem.id}/permissions`, {
        user_id: selectedUserForPerm,
        permission_level: newPermLevel
      });
      fetchPermissions(selectedItem.id);
      setSelectedUserForPerm('');
    } catch (error) {
      console.error("Failed to add permission", error);
      alert(t('Failed to add permission'), t('Error'), 'error');
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (!selectedItem) return;
    try {
      await api.delete(`archive/folders/${selectedItem.id}/permissions/${userId}`);
      fetchPermissions(selectedItem.id);
    } catch (error) {
      console.error("Failed to remove permission", error);
      alert(t('Failed to remove permission'), t('Error'), 'error');
    }
  };

  const handleUpdateMetadata = async () => {
    if (!selectedItem) return;
    try {
      const endpoint = selectedItem.type === 'file' ? `archive/files/${selectedItem.id}` : `archive/folders/${selectedItem.id}`;
      await api.patch(endpoint, {
        name: editName,
        description: editDescription,
        is_public: editIsPublic
      });
      setOpenEditDialog(false);
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Update failed", error);
      alert(t('Failed to update item'), t('Error'), 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      alert(t('You do not have permission to delete items'), t('Warning'), 'warning');
      return;
    }
    if (!await confirm({ message: t('Are you sure you want to delete selected items?') })) return;
    
    setLoading(true);
    try {
      await api.post('archive/bulk-delete', {
        file_ids: selectedFiles,
        folder_ids: selectedFolders
      });
      clearSelection();
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert(t('Failed to delete some items'), t('Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!selectedTargetFolder || !targetAction) return;
    
    setLoading(true);
    try {
      const endpoint = targetAction === 'move' ? 'archive/bulk-move' : 'archive/bulk-copy';
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
      alert(t(`Failed to ${targetAction} items`), t('Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExploreFolder = async (folderId?: number) => {
    const id = folderId || currentFolder?.id;
    if (!id) return;
    try {
      await api.post(`archive/folders/${id}/explore`);
    } catch (error) {
      console.error("Explore folder failed", error);
      alert(t('Failed to open local storage'), t('Error'), 'error');
    }
  };

  const filteredFolders = React.useMemo(() => 
    folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [folders, searchQuery]
  );
  
  const filteredFiles = React.useMemo(() => 
    files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [files, searchQuery]
  );

  const fetchContent = async (folderId: number | null, reset = true) => {
    if (reset) {
      setLoading(true);
      setSkip(0);
    } else {
      setLoadingMore(true);
    }

    try {
      // Initialize archive if needed (ensures system folders exist)
      if (folderId === null && reset) {
        try {
          await api.get('archive/init');
        } catch (initError) {
          console.warn("Archive initialization skipped or failed (likely permission issue):", initError);
          // Continue even if init fails - user might only have read access
        }
      }
      
      if (reset) {
        const folderRes = await api.get(`archive/folders${folderId ? `?parent_id=${folderId}` : ''}`);
        setFolders(folderRes.data);
      }

      if (folderId) {
        const currentSkip = reset ? 0 : skip + LIMIT;
        const fileRes = await api.get(`archive/files?folder_id=${folderId}&skip=${currentSkip}&limit=${LIMIT}`);
        
        if (reset) {
          setFiles(fileRes.data.files);
          setTotalFiles(fileRes.data.total);
        } else {
          setFiles(prev => [...prev, ...fileRes.data.files]);
          setSkip(currentSkip);
        }
      } else {
        setFiles([]);
        setTotalFiles(0);
      }
    } catch (error) {
      console.error("Failed to fetch archive content", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDownload = (file: ArchiveFile) => {
    if (!canDownload) {
      alert(t('You do not have permission to download files'), t('Warning'), 'warning');
      return;
    }
    const token = localStorage.getItem('access_token');
    // Use relative path to let browser/proxy handle the domain
    let url = `/api/archive/files/${file.id}/download`;

    if (token) {
      url += `?token=${token}`;
    }

    window.open(url, '_blank');
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!canDelete) {
      alert(t('You do not have permission to delete files'), t('Warning'), 'warning');
      return;
    }
    if (!await confirm({ message: t('Are you sure?') })) return;
    try {
      await api.delete(`archive/files/${fileId}`);
      fetchContent(currentFolder?.id || null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleDeleteFolder = async (folder: ArchiveFolder) => {
    // Removed restriction to allow deleting system folders as requested
    // if ((folder as any).is_system) return;
    
    if (!canDelete) {
      alert(t('You do not have permission to delete folders'), t('Warning'), 'warning');
      return;
    }
    if (!await confirm({ message: t('Are you sure?') })) return;
    try {
      await api.delete(`archive/folders/${folder.id}`);
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

  const handlePreviewClick = () => {
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

  const getFilePreviewUrl = (fileId: number, forIframe: boolean = false) => {
    const token = localStorage.getItem('access_token');
    // Use relative path for robustness
    let url = `/api/archive/files/${fileId}/view`;
    
    // Add token as query parameter first
    if (token) {
      url += `?token=${token}`;
    }

    if (forIframe) {
      // Add toolbar=0 and navpanes=0 for cleaner PDF view in iframe
      // Fragment identifiers must be at the end of the URL
      url += '#toolbar=0&navpanes=0';
    }

    return url;
  };

  const getFileThumbnailUrl = (fileId: number) => {
    const token = localStorage.getItem('access_token');
    let url = `/api/archive/files/${fileId}/thumbnail`;
    if (token) {
      url += `?token=${token}`;
    }
    return url;
  };

  const handleGoUp = () => {
    if (breadcrumbs.length > 1) {
      handleBreadcrumbClick(breadcrumbs.length - 2);
    }
  };

  const isImage = (fileType: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType.toLowerCase());
  };

  const isZoomable = (fileType: string) => {
    return isImage(fileType) || fileType.toLowerCase() === 'pdf';
  };

  const FolderTreeItem: React.FC<{ node: any, depth: number }> = ({ node, depth }) => {
    const isSelected = selectedTargetFolder === node.id;
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    return (
      <Box key={node.id}>
        <ListItemButton 
          onClick={() => setSelectedTargetFolder(node.id)}
          selected={isSelected}
          sx={{ 
            pl: depth * 2 + 1,
            borderRadius: 1,
            mb: 0.5,
            '&.Mui-selected': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
            }
          }}
        >
          <Box 
            onClick={handleToggle}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 24,
              height: 24,
              mr: 0.5,
              cursor: 'pointer',
              visibility: hasChildren ? 'visible' : 'hidden',
              '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1), borderRadius: '50%' }
            }}
          >
            {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </Box>
          <ListItemIcon sx={{ minWidth: 30 }}>
            <Folder color={isSelected ? "primary" : "inherit"} sx={{ fontSize: '1.2rem' }} />
          </ListItemIcon>
          <ListItemText 
            primary={node.name} 
            primaryTypographyProps={{ 
              variant: 'body2', 
              fontWeight: isSelected ? 700 : 400 
            }} 
          />
        </ListItemButton>
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {node.children.map((child: any) => (
                <FolderTreeItem key={child.id} node={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    );
  };

  const handleCreateFolder = async () => {
    if (!canUpload) {
      alert(t('You do not have permission to create folders'), t('Warning'), 'warning');
      return;
    }
    try {
      await api.post('archive/folders', {
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
            const res = await api.get('archive/scanners');
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
            alert(t('You do not have permission to scan files'), t('Warning'), 'warning');
            return;
        }
        if (!scanData.scanner_id || !scanData.filename) {
            alert(t('Please select a scanner and enter a filename'), t('Warning'), 'warning');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('scanner_id', scanData.scanner_id);
            formData.append('folder_id', currentFolder?.id.toString() || '');
            formData.append('filename', scanData.filename);
            formData.append('description', scanData.description);

            await api.post('archive/scan', formData);
            setOpenScanDialog(false);
            setScanData({ scanner_id: scanners[0]?.id || '', filename: '', description: '' });
            fetchContent(currentFolder?.id || null);
        } catch (error) {
            console.error('Scan failed', error);
            alert(t('Scan failed'), t('Error'), 'error');
        } finally {
            setUploading(false);
        }
    };
    const handleUpload = async () => {
        if (!canUpload) {
            alert(t('You do not have permission to upload files'), t('Warning'), 'warning');
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

            await api.post('archive/upload', formData, {
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
            alert(`${t('Error')}: ${errorMessage}`, t('Error'), 'error');
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
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                console.warn(`Skipping disallowed file type: ${file.name}`);
                continue;
            }
            
            if (file.size > MAX_FILE_SIZE) {
                console.warn(`Skipping oversized file: ${file.name}`);
                continue;
            }

            formData.append('files', file);
            // webkitRelativePath contains the path starting from the folder name
            relativePaths.push((file as any).webkitRelativePath || file.name);
        }
        
        if (relativePaths.length === 0) {
            alert(t('No valid files found to upload (check types and sizes)'), t('Warning'), 'warning');
            setBulkUploading(false);
            return;
        }
        
        formData.append('relative_paths', JSON.stringify(relativePaths));

        try {
            await api.post('archive/bulk-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setBulkProgress(percentCompleted);
                },
            });
            
            fetchContent(currentFolder.id);
      alert(t('Folder structure uploaded successfully'), t('Success'), 'success');
    } catch (error: any) {
      console.error('Bulk upload failed', error);
      alert(t('Failed to upload folder structure'), t('Error'), 'error');
    } finally {
      setBulkUploading(false);
      setBulkProgress(0);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload && currentFolder) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!canUpload || !currentFolder) return;

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setBulkUploading(true);
    setBulkProgress(0);

    const filesToUpload: File[] = [];
    const pathsToUpload: string[] = [];

    // Helper to traverse entries
    const traverseEntry = async (entry: any, path = "") => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          entry.file(resolve, reject);
        });
        filesToUpload.push(file);
        pathsToUpload.push(path + file.name);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        
        const readAllEntries = async () => {
          const entries = await new Promise<any[]>((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
          
          if (entries.length > 0) {
            for (const childEntry of entries) {
              await traverseEntry(childEntry, path + entry.name + "/");
            }
            // Continue reading next batch of entries
            await readAllEntries();
          }
        };
        
        await readAllEntries();
      }
    };

    try {
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            promises.push(traverseEntry(entry));
          } else if (item.getAsFile()) {
            const file = item.getAsFile();
            if (file) {
              filesToUpload.push(file);
              pathsToUpload.push(file.name);
            }
          }
        }
      }
      await Promise.all(promises);

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        formData.append('parent_folder_id', currentFolder.id.toString());
        filesToUpload.forEach(file => formData.append('files', file));
        formData.append('relative_paths', JSON.stringify(pathsToUpload));

        await api.post('archive/bulk-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setBulkProgress(percentCompleted);
          },
        });

        fetchContent(currentFolder.id);
        alert(t('Files and folders uploaded successfully'), t('Success'), 'success');
      } else {
        alert(t('No valid files or folders found to upload'), t('Warning'), 'warning');
      }
    } catch (error: any) {
      console.error('Drop upload failed', error);
      const msg = error.response?.data?.detail || error.message || t('Failed to upload dropped items');
      alert(`${t('Error')}: ${msg}`, t('Error'), 'error');
    } finally {
      setBulkUploading(false);
      setBulkProgress(0);
    }
  };

  return (
    <Box 
      sx={{ 
        p: { xs: 1, sm: 3 }, 
        bgcolor: 'background.default', 
        minHeight: '100vh',
        position: 'relative'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.2),
            border: `4px dashed ${theme.palette.primary.main}`,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            borderRadius: 2,
            m: 2
          }}
        >
          <CloudUpload sx={{ fontSize: 100, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            {t('Drop files or folders here to upload')}
          </Typography>
        </Box>
      )}
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
                  accept={ALLOWED_EXTENSIONS.join(',')}
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
          {/* Back Button and Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Tooltip title={t('Go up to parent folder')}>
              <span>
                <IconButton 
                  onClick={handleGoUp} 
                  disabled={breadcrumbs.length <= 1}
                  size="large"
                  color="primary"
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                    '&.Mui-disabled': { bgcolor: 'transparent' },
                    boxShadow: breadcrumbs.length > 1 ? 2 : 0,
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowBack fontSize="large" />
                </IconButton>
              </span>
            </Tooltip>
            
            <Breadcrumbs separator="/" sx={{ px: 1 }}>
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
          </Box>

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
        <Grid container spacing={3}>
          {[...Array(12)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} lg={2} key={`skeleton-${index}`}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 1, mb: 1 }} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="40%" />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : viewMode === 'grid' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            {/* Folders */}
            <AnimatePresence>
              {filteredFolders.map((folder) => (
                <Grid item xs={12} sm={6} md={3} lg={2} key={`folder-${folder.id}`}>
                  <motion.div variants={itemVariants} layout>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: `1px solid ${selectedFolders.includes(folder.id) ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: selectedFolders.includes(folder.id) ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                        borderRadius: 3,
                        overflow: 'hidden',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-8px)',
                          boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`,
                          '& .folder-icon': {
                            transform: 'scale(1.1) rotate(5deg)',
                          }
                        }
                      }}
                      onClick={() => handleFolderClick(folder)}
                    >
                      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Checkbox 
                          size="small" 
                          checked={selectedFolders.includes(folder.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderSelection(folder.id);
                          }}
                          sx={{ color: alpha(theme.palette.primary.main, 0.5) }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, 'folder', folder)}
                          sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.background.paper }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                      <Folder className="folder-icon" sx={{ fontSize: 64, color: '#FFD700', mb: 1.5, transition: 'transform 0.3s ease' }} />
                      <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: '100%', textAlign: 'center' }}>
                        {t(folder.name)}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>

            {/* Files */}
            <AnimatePresence>
              {filteredFiles.map((file) => (
                <Grid item xs={12} sm={6} md={3} lg={2} key={`file-${file.id}`}>
                  <motion.div variants={itemVariants} layout>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: `1px solid ${selectedFiles.includes(file.id) ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: selectedFiles.includes(file.id) ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                        borderRadius: 3,
                        overflow: 'hidden',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          transform: 'translateY(-8px)',
                          boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`,
                        }
                      }}
                      onClick={() => handleFileClick(file)}
                    >
                      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Checkbox 
                          size="small" 
                          checked={selectedFiles.includes(file.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(file.id);
                          }}
                          sx={{ color: alpha(theme.palette.primary.main, 0.5) }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, 'file', file)}
                          sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.background.paper }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(e) => { e.stopPropagation(); handlePrint(file.id); }}
                          sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.background.paper }}
                        >
                          <Print fontSize="small" />
                        </IconButton>
                      </Box>
                      {isImage(file.file_type) ? (
                        <Box
                          component="img"
                          src={getFileThumbnailUrl(file.id)}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 2,
                            mb: 1.5,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                          }}
                          alt={file.name}
                        />
                      ) : file.file_type === 'pdf' ? (
                        <Description sx={{ fontSize: 64, color: '#F44336', mb: 1.5 }} />
                      ) : (
                        <InsertDriveFile sx={{ fontSize: 64, color: '#2196F3', mb: 1.5 }} />
                      )}
                      <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: '100%', mb: 0.5 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                        {(file.file_size / 1024).toFixed(1)} KB
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>
          
          {files.length < totalFiles && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={() => fetchContent(currentFolder?.id || null, false)}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={20} /> : <ExpandMore />}
                sx={{ borderRadius: 4, px: 4 }}
              >
                {loadingMore ? t('Loading...') : t('Load More')}
              </Button>
            </Box>
          )}
        </motion.div>
      ) : (
        /* List View */
        <TableContainer 
          component={motion.div as any} 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          sx={{ 
            borderRadius: 3, 
            overflow: 'hidden', 
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            bgcolor: 'background.paper',
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <TableCell padding="checkbox">
                  <Checkbox 
                    size="small"
                    indeterminate={
                      (selectedFiles.length > 0 || selectedFolders.length > 0) &&
                      (selectedFiles.length < files.length || selectedFolders.length < folders.length)
                    }
                    checked={(files.length > 0 || folders.length > 0) && selectedFiles.length === files.length && selectedFolders.length === folders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Name')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Type')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Size')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Date')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody component={AnimatePresence as any}>
              {filteredFolders.map((folder) => (
                <TableRow 
                  key={`folder-${folder.id}`}
                  component={motion.tr as any}
                  variants={itemVariants}
                  layout
                  hover
                  selected={selectedFolders.includes(folder.id)}
                  onClick={() => handleFolderClick(folder)}
                  sx={{ 
                    cursor: 'pointer',
                    '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                  }}
                >
                  <TableCell padding="checkbox">
                  <Checkbox 
                    size="small"
                    checked={selectedFolders.includes(folder.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolderSelection(folder.id);
                    }}
                  />
                </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Folder sx={{ color: '#FFD700' }} fontSize="small" />
                      <Typography variant="body2" fontWeight="500">{t(folder.name)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', px: 1, py: 0.5, borderRadius: 1 }}>
                      {t('Folder')}
                    </Typography>
                  </TableCell>
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
                  component={motion.tr as any}
                  variants={itemVariants}
                  layout
                  hover
                  selected={selectedFiles.includes(file.id)}
                  onClick={() => handleFileClick(file)}
                  sx={{ 
                    cursor: 'pointer',
                    '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                  }}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {isImage(file.file_type) ? (
                        <ImageIcon color="primary" fontSize="small" />
                      ) : file.file_type === 'pdf' ? (
                        <Description sx={{ color: '#F44336' }} fontSize="small" />
                      ) : (
                        <InsertDriveFile color="primary" fontSize="small" />
                      )}
                      <Typography variant="body2" fontWeight="500">{file.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', px: 1, py: 0.5, borderRadius: 1 }}>
                      {file.file_type.toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'file', file)}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(file.id);
                      }}>
                        <Print fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {files.length < totalFiles && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Button
                variant="text"
                onClick={() => fetchContent(currentFolder?.id || null, false)}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={20} /> : <ExpandMore />}
              >
                {loadingMore ? t('Loading...') : t('Load More')}
              </Button>
            </Box>
          )}
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {targetAction === 'move' ? <DriveFileMove /> : <ContentCopy />}
          {targetAction === 'move' ? t('Move Items To') : t('Copy Items To')}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {t('Select destination folder from the tree below:')}
          </Typography>
          <List>
            {folderTree.map((node) => (
              <FolderTreeItem key={node.id} node={node} depth={0} />
            ))}
            {folderTree.length === 0 && (
              <Typography sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
                {t('No target folders available')}
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTargetDialog(false)}>{t('Cancel')}</Button>
          <Button 
            onClick={handleBulkAction} 
            variant="contained" 
            disabled={!selectedTargetFolder}
            startIcon={targetAction === 'move' ? <DriveFileMove /> : <ContentCopy />}
          >
            {targetAction === 'move' ? t('Move Here') : t('Copy Here')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('Edit Item Details')}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('Name')}
              fullWidth
              variant="outlined"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <TextField
              label={t('Description')}
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            {selectedItem?.type === 'folder' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                <Checkbox 
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                />
                <Box>
                  <Typography variant="body2" fontWeight="bold">{t('Public Folder')}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('Anyone with archive access can see this folder')}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>{t('Cancel')}</Button>
          <Button onClick={handleUpdateMetadata} variant="contained" color="primary">
            {t('Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={openPermissionDialog} onClose={() => setOpenPermissionDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox color="primary" />
            <Typography variant="h6">{t('Manage Permissions')}: {selectedItem?.data.name}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 2, border: `1px dashed ${theme.palette.primary.main}` }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('Grant Access to User')}</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('Select User')}</InputLabel>
                  <Select
                    value={selectedUserForPerm}
                    onChange={(e) => setSelectedUserForPerm(e.target.value)}
                    label={t('Select User')}
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        {t('Loading Users...')}
                      </MenuItem>
                    ) : allUsers.length === 0 ? (
                      <MenuItem disabled>{t('No archive users found')}</MenuItem>
                    ) : (
                      allUsers.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('Permission Level')}</InputLabel>
                  <Select
                    value={newPermLevel}
                    onChange={(e) => setNewPermLevel(e.target.value)}
                    label={t('Permission Level')}
                  >
                    <MenuItem value="view">{t('View Only')}</MenuItem>
                    <MenuItem value="edit">{t('View & Edit')}</MenuItem>
                    <MenuItem value="full">{t('Full Control')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={handleAddPermission}
                  disabled={!selectedUserForPerm}
                >
                  {t('Add')}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('Users with Access')}</Typography>
          {loadingPerms ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : permissions.length === 0 ? (
            <Paper variant="outlined" sx={{ py: 4, textAlign: 'center', bgcolor: alpha(theme.palette.divider, 0.02) }}>
              <Info sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t('No special permissions granted yet.')}
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('User')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('Level')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">{t('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map((p) => (
                    <TableRow key={p.user_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">{p.user_email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={t(p.permission_level)} 
                          color={p.permission_level === 'full' ? 'primary' : p.permission_level === 'edit' ? 'secondary' : 'default'}
                          variant="filled"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleRemovePermission(p.user_id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermissionDialog(false)}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem?.type === 'folder' && (
          <Box>
            <MenuItem onClick={() => {
              handleExploreFolder(selectedItem.id);
              handleMenuClose();
            }}>
              <ListItemIcon><Explore fontSize="small" /></ListItemIcon>
              <ListItemText>{t('Explore Local')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleOpenPermissions}>
              <ListItemIcon><CheckBox fontSize="small" /></ListItemIcon>
              <ListItemText>{t('Manage Permissions')}</ListItemText>
            </MenuItem>
            {canDownload && (
              <MenuItem onClick={() => {
                handleDownloadZip(selectedItem.id, selectedItem.data.name);
                handleMenuClose();
              }}>
                <ListItemIcon><Download fontSize="small" /></ListItemIcon>
                <ListItemText>{t('Download as ZIP')}</ListItemText>
              </MenuItem>
            )}
          </Box>
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
        <MenuItem onClick={handleOpenEdit}>
          <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
          <ListItemText>{t('Rename / Description')}</ListItemText>
        </MenuItem>
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
            {previewTab === 0 && !previewFile?.name.toLowerCase().endsWith('.pdf') && isZoomable(previewFile?.file_type || '') && (
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
            {previewFile?.file_type === 'pdf' && (
              <Tooltip title={t('Open in Full Screen')}>
                <IconButton 
                  onClick={() => window.open(getFilePreviewUrl(previewFile.id), '_blank')} 
                  color="inherit" 
                  size="small" 
                  sx={{ mr: 1 }}
                >
                  <OpenInNew />
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

        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f5f5f5', overflow: 'hidden' }}>
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
                  drag={zoom > 1 && !previewFile.name.toLowerCase().endsWith('.pdf')}
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
                  ) : previewFile.file_type === 'pdf' || previewFile.name.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={getFilePreviewUrl(previewFile.id, true)}
                      width="100%"
                      height="100%"
                      title={previewFile.name}
                      style={{ 
                        border: 'none', 
                        backgroundColor: 'white', 
                        minHeight: '80vh',
                        pointerEvents: 'auto' // PDF needs mouse interaction
                      }}
                    >
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body1">
                          {t('Your browser does not support inline PDFs.')}
                        </Typography>
                        <Button 
                          variant="contained" 
                          href={getFilePreviewUrl(previewFile.id)} 
                          target="_blank"
                          sx={{ mt: 2 }}
                        >
                          {t('Open PDF in new tab')}
                        </Button>
                      </Box>
                    </iframe>
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
              <Box sx={{ p: 3, bgcolor: 'background.paper', height: '100%', overflow: 'auto' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 700 }}>{t('File Details')}</Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.primary.main, 0.02),
                        borderColor: alpha(theme.palette.divider, 0.1),
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('File Name')}</Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>{previewFile.name}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('File Type')}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={previewFile.file_type.toUpperCase()} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ fontWeight: 700, borderRadius: 1 }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('File Size')}</Typography>
                        <Typography variant="body2" fontWeight="500">{(previewFile.file_size / 1024).toFixed(2)} KB</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Created At')}</Typography>
                        <Typography variant="body2" fontWeight="500">{new Date(previewFile.created_at).toLocaleString()}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 700 }}>{t('Extracted Text (OCR)')}</Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2.5, 
                        height: '400px', 
                        overflow: 'auto', 
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : '#fafafa',
                        borderColor: alpha(theme.palette.divider, 0.1),
                        borderRadius: 2,
                        fontFamily: '"Roboto Mono", "Courier New", monospace',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'text.primary',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          bgcolor: alpha(theme.palette.divider, 0.2),
                          borderRadius: '4px',
                        }
                      }}
                    >
                      {previewFile.ocr_text ? (
                        <Typography variant="body2" sx={{ fontFamily: 'inherit', whiteSpace: 'inherit' }}>
                          {previewFile.ocr_text}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                          <Info sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body2">{t('No text extracted from this file')}</Typography>
                        </Box>
                      )}
                    </Paper>
                    {previewFile.description && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 700 }}>{t('Description')}</Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{previewFile.description}</Typography>
                        </Paper>
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
                    const file = e.target.files[0];
                    // Removed restrictions as per user request
                    setUploadFile(file);
                    setUploadName(file.name);
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
