import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import { getSurveyUrl, getQRCodeUrl, copySurveyLink } from '../../services/surveyApi';

interface QRCodeGeneratorProps {
  surveyId: string;
  size?: number;
  showLink?: boolean;
  showActions?: boolean;
  lang?: 'en' | 'ar';
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  surveyId,
  size = 200,
  showLink = true,
  showActions = true,
  lang = 'en',
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const surveyUrl = getSurveyUrl(surveyId);
  const qrCodeUrl = getQRCodeUrl(surveyId, size);

  useEffect(() => {
    // Preload QR code image
    const img = new Image();
    img.onload = () => setLoading(false);
    img.onerror = () => {
      setError(lang === 'ar' ? 'فشل تحميل رمز QR' : 'Failed to load QR code');
      setLoading(false);
    };
    img.src = qrCodeUrl;
  }, [qrCodeUrl, lang]);

  const handleCopyLink = async () => {
    const success = await copySurveyLink(surveyId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey-${surveyId}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === 'ar' ? 'استبيان' : 'Survey',
          url: surveyUrl,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              p: 2,
              backgroundColor: '#ffffff',
              borderRadius: 2,
              boxShadow: theme.shadows[2],
            }}
          >
            {loading ? (
              <Skeleton variant="rectangular" width={size} height={size} />
            ) : error ? (
              <Box
                sx={{
                  width: size,
                  height: size,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" color="error">
                  {error}
                </Typography>
              </Box>
            ) : (
              <img
                src={qrCodeUrl}
                alt="Survey QR Code"
                style={{
                  width: size,
                  height: size,
                  display: 'block',
                }}
              />
            )}
          </Box>
        </motion.div>

        {/* Survey Link */}
        {showLink && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.primary.main,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 250,
              }}
            >
              {surveyUrl}
            </Typography>
            <Tooltip title={lang === 'ar' ? 'نسخ الرابط' : 'Copy link'}>
              <IconButton
                size="small"
                onClick={handleCopyLink}
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Actions */}
        {showActions && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyLink}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {lang === 'ar' ? 'تحميل QR' : 'Download QR'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {lang === 'ar' ? 'مشاركة' : 'Share'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Copy success notification */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {lang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!'}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default QRCodeGenerator;
