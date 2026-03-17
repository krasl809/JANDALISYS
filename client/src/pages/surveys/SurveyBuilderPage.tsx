import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  IconButton,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Collapse,
  Alert,
  Snackbar,
  Tooltip,
  LinearProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  Fade,
  Grow,
  Badge,
} from '@mui/material';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PreviewIcon from '@mui/icons-material/Preview';
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShortTextIcon from '@mui/icons-material/ShortText';
import SubjectIcon from '@mui/icons-material/Subject';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  getSurvey,
  createSurvey,
  updateSurvey,
} from '../../services/surveyApi';
import {
  Survey,
  SurveyQuestion,
  QuestionType,
  QuestionOption,
  SurveySettings,
  getDefaultAnswerValue,
} from '../../types/surveys';
import DynamicFormRenderer from '../../components/surveys/DynamicFormRenderer';

// Extended question types for Google Forms style
const questionTypes: { value: QuestionType; label: Record<string, string>; icon: React.ReactNode }[] = [
  { value: 'open_text', label: { en: 'Short Answer', ar: ' ' }, icon: <ShortTextIcon /> },
  { value: 'open_text_long', label: { en: 'Paragraph', ar: '' }, icon: <SubjectIcon /> },
  { value: 'single_choice', label: { en: 'Multiple Choice', ar: ' ' }, icon: <RadioButtonUncheckedIcon /> },
  { value: 'multiple_choice', label: { en: 'Checkboxes', ar: '' }, icon: <CheckBoxOutlineBlankIcon /> },
  { value: 'dropdown', label: { en: 'Dropdown', ar: ' ' }, icon: <ArrowDropDownIcon /> },
  { value: 'scale', label: { en: 'Linear Scale', ar: ' ' }, icon: <LinearScaleIcon /> },
  { value: 'rating', label: { en: 'Rating', ar: '' }, icon: <StarOutlineIcon /> },
  { value: 'yes_no', label: { en: 'Yes/No', ar: '/' }, icon: <ToggleOnIcon /> },
  { value: 'nps', label: { en: 'NPS Score', ar: ' NPS' }, icon: <LinearScaleIcon /> },
  { value: 'likert_5', label: { en: 'Likert Scale', ar: ' ' }, icon: <LinearScaleIcon /> },
];

// Sidebar question type buttons
const sidebarQuestionTypes = [
  { type: 'open_text' as QuestionType, label: { en: 'Short Answer', ar: ' ' }, icon: <ShortTextIcon /> },
  { type: 'open_text_long' as QuestionType, label: { en: 'Paragraph', ar: '' }, icon: <SubjectIcon /> },
  { type: 'single_choice' as QuestionType, label: { en: 'Multiple Choice', ar: ' ' }, icon: <RadioButtonUncheckedIcon /> },
  { type: 'multiple_choice' as QuestionType, label: { en: 'Checkboxes', ar: '' }, icon: <CheckBoxOutlineBlankIcon /> },
  { type: 'dropdown' as QuestionType, label: { en: 'Dropdown', ar: ' ' }, icon: <ArrowDropDownIcon /> },
  { type: 'scale' as QuestionType, label: { en: 'Linear Scale', ar: ' ' }, icon: <LinearScaleIcon /> },
  { type: 'rating' as QuestionType, label: { en: 'Rating', ar: '' }, icon: <StarOutlineIcon /> },
];

const defaultSettings: SurveySettings = {
  is_public: true,
  require_auth: false,
  allow_multiple_responses: false,
  show_progress_bar: true,
  show_question_numbers: true,
  shuffle_questions: false,
  one_question_per_page: false,
  collect_email: false,
  email_required: false,
  collect_name: false,
  name_required: false,
  collect_position: false,
  position_required: false,
  show_results_after_submit: false,
  language: 'both',
};

const normalizeQuestionsFromApi = (raw: SurveyQuestion[] = []): SurveyQuestion[] => {
  return raw.map((q, idx) => {
    const order =
      typeof q.order === 'number'
        ? q.order
        : typeof q.order_index === 'number'
          ? q.order_index
          : idx;

    const required =
      typeof q.required === 'boolean'
        ? q.required
        : typeof q.is_required === 'boolean'
          ? q.is_required
          : false;

    const title = q.title ?? q.question_text ?? '';

    return {
      ...q,
      title,
      required,
      order,
      options: (q.options || []).map((opt, optIdx) => ({
        ...opt,
        id: (opt as any).id ?? `opt-${q.id}-${optIdx}`,
        order: typeof opt.order === 'number' ? opt.order : optIdx,
      })),
    };
  });
};

const denormalizeQuestionsForApi = (raw: SurveyQuestion[] = []): SurveyQuestion[] => {
  return raw.map((q, idx) => ({
    ...q,
    question_text: q.title ?? q.question_text ?? '',
    is_required: q.required ?? q.is_required ?? false,
    order_index: typeof q.order === 'number' ? q.order : (q.order_index ?? idx),
    options: (q.options || []).map((opt, optIdx) => ({
      ...opt,
      order: typeof opt.order === 'number' ? opt.order : optIdx,
    })),
  }));
};

// Map UI types to actual question types
const mapQuestionType = (type: string): QuestionType => {
  const typeMap: Record<string, QuestionType> = {
    'short_answer': 'open_text',
    'paragraph': 'open_text',
    'multiple_choice': 'single_choice',
    'checkboxes': 'multiple_choice',
    'dropdown': 'dropdown',
    'linear_scale': 'scale',
    'rating': 'rating',
    'date': 'open_text', // Will need special handling
    'time': 'open_text', // Will need special handling
  };
  return typeMap[type] || (type as QuestionType);
};

const requiresOptions = (type: QuestionType) => {
  return ['single_choice', 'multiple_choice', 'dropdown'].includes(type);
};

interface QuestionCardProps {
  question: SurveyQuestion;
  index: number;
  editingQuestionId: string | null;
  hoveredQuestionId: string | null;
  setEditingQuestionId: (id: string | null) => void;
  setHoveredQuestionId: (id: string | null) => void;
  handleUpdateQuestion: (id: string, updates: Partial<SurveyQuestion>) => void;
  handleDuplicateQuestion: (question: SurveyQuestion) => void;
  handleDeleteQuestion: (id: string) => void;
  handleAddOption: (id: string) => void;
  handleUpdateOption: (id: string, optionIndex: number, field: keyof QuestionOption, value: string) => void;
  handleRemoveOption: (id: string, optionIndex: number) => void;
  lang: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  editingQuestionId,
  hoveredQuestionId,
  setEditingQuestionId,
  setHoveredQuestionId,
  handleUpdateQuestion,
  handleDuplicateQuestion,
  handleDeleteQuestion,
  handleAddOption,
  handleUpdateOption,
  handleRemoveOption,
  lang,
}) => {
  const theme = useTheme();
  const isEditing = editingQuestionId === question.id;
  const isHovered = hoveredQuestionId === question.id;

  const questionTypeLabel = questionTypes.find(qt => qt.value === question.question_type)?.label[lang] || question.question_type;

  return (
    <Reorder.Item
      value={question}
      style={{ listStyle: 'none' }}
    >
      <Card
        elevation={0}
        onMouseEnter={() => setHoveredQuestionId(question.id)}
        onMouseLeave={() => setHoveredQuestionId(null)}
        sx={{
          mb: 2,
          borderRadius: 2,
          backgroundColor: isEditing 
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.background.paper, 0.8),
          border: `1px solid ${isEditing 
            ? alpha(theme.palette.primary.main, 0.3)
            : alpha(theme.palette.divider, 0.2)}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.2),
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Question Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            {/* Drag Handle */}
            <Box
              sx={{
                cursor: 'grab',
                color: theme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                pt: 1,
              }}
            >
              <DragIndicatorIcon />
            </Box>

            {/* Question Number */}
            <Chip
              label={index + 1}
              size="small"
              sx={{
                minWidth: 28,
                height: 28,
                fontWeight: 600,
                mt: 0.5,
              }}
            />

            {/* Question Content */}
            <Box sx={{ flex: 1 }}>
              {isEditing ? (
                <Box>
                  {/* Question Type Selector */}
                  <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
                    <InputLabel>{lang === 'ar' ? 'نوع السؤال' : 'Question Type'}</InputLabel>
                    <Select
                      value={question.question_type}
                      label={lang === 'ar' ? 'نوع السؤال' : 'Question Type'}
                      onChange={(e) => handleUpdateQuestion(question.id, { 
                        question_type: e.target.value as QuestionType,
                        options: requiresOptions(e.target.value as QuestionType) 
                          ? question.options?.length ? question.options : [
                              { id: `opt-${Date.now()}-1`, label: '', label_ar: '', value: 'option1', order: 0 },
                              { id: `opt-${Date.now()}-2`, label: '', label_ar: '', value: 'option2', order: 1 },
                            ]
                          : [],
                      })}
                    >
                      {questionTypes.map((qt) => (
                        <MenuItem key={qt.value} value={qt.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {qt.icon}
                            {qt.label[lang]}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Question Title */}
                  <TextField
                    fullWidth
                    placeholder={lang === 'ar' ? 'أدخل سؤالك هنا...' : 'Enter your question...'}
                    value={question.title ?? question.question_text ?? ''}
                    onChange={(e) => handleUpdateQuestion(question.id, { title: e.target.value, question_text: e.target.value })}
                    sx={{ mb: 2 }}
                    InputProps={{
                      sx: { fontSize: '1.1rem', fontWeight: 500 },
                    }}
                  />

                  {/* Arabic Title */}
                  <TextField
                    fullWidth
                    placeholder={lang === 'ar' ? 'السؤال (بالعربية)' : 'Question (Arabic)'}
                    value={question.title_ar || ''}
                    onChange={(e) => handleUpdateQuestion(question.id, { title_ar: e.target.value })}
                    dir="rtl"
                    sx={{ mb: 2 }}
                  />

                  {/* Options for choice questions */}
                  {requiresOptions(question.question_type) && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        {lang === 'ar' ? 'الخيارات' : 'Options'}
                      </Typography>
                      {question.options?.map((option, optIndex) => (
                        <Box key={option.id ?? `option-${optIndex}`} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                          {question.question_type === 'single_choice' ? (
                            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                          ) : question.question_type === 'multiple_choice' ? (
                            <CheckBoxOutlineBlankIcon color="disabled" fontSize="small" />
                          ) : (
                            <ArrowDropDownIcon color="disabled" fontSize="small" />
                          )}
                          <TextField
                            size="small"
                            placeholder={lang === 'ar' ? 'تسمية الخيار' : 'Option label'}
                            value={option.label}
                            onChange={(e) => handleUpdateOption(question.id, optIndex, 'label', e.target.value)}
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            size="small"
                            placeholder={lang === 'ar' ? 'بالعربية' : 'Arabic'}
                            value={option.label_ar || ''}
                            onChange={(e) => handleUpdateOption(question.id, optIndex, 'label_ar', e.target.value)}
                            sx={{ flex: 1 }}
                            dir="rtl"
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveOption(question.id, optIndex)}
                            disabled={(question.options?.length || 0) <= 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => handleAddOption(question.id)}
                        sx={{ mt: 1 }}
                      >
                        {lang === 'ar' ? 'إضافة خيار' : 'Add Option'}
                      </Button>
                    </Box>
                  )}

                  {/* Scale settings */}
                  {(question.question_type === 'scale' || question.question_type === 'rating') && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <TextField
                        size="small"
                        type="number"
                        label={lang === 'ar' ? 'الحد الأدنى' : 'Min'}
                        value={question.min_value ?? 1}
                        onChange={(e) => handleUpdateQuestion(question.id, { min_value: parseInt(e.target.value) })}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label={lang === 'ar' ? 'الحد الأقصى' : 'Max'}
                        value={question.max_value ?? (question.question_type === 'rating' ? 5 : 10)}
                        onChange={(e) => handleUpdateQuestion(question.id, { max_value: parseInt(e.target.value) })}
                        sx={{ width: 100 }}
                      />
                    </Box>
                  )}

                  {/* Done Button */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setEditingQuestionId(null)}
                    >
                      {lang === 'ar' ? 'تم' : 'Done'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {/* Display Mode */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={questionTypeLabel}
                      size="small"
                      variant="outlined"
                      icon={questionTypes.find(qt => qt.value === question.question_type)?.icon as React.ReactElement}
                    />
                    {question.required && (
                      <Typography variant="caption" color="error">
                        * {lang === 'ar' ? 'مطلوب' : 'Required'}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
                    {lang === 'ar' && question.title_ar ? question.title_ar : (question.title ?? question.question_text) || (
                      <span style={{ color: theme.palette.text.disabled }}>
                        {lang === 'ar' ? 'سؤال بدون عنوان...' : 'Untitled question'}
                      </span>
                    )}
                  </Typography>

                  {/* Preview options */}
                  {requiresOptions(question.question_type) && question.options && (
                    <Box sx={{ mt: 1 }}>
                      {question.options.map((opt, optIdx) => (
                        <Box key={opt.id ?? `opt-preview-${optIdx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {question.question_type === 'single_choice' ? (
                            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                          ) : question.question_type === 'multiple_choice' ? (
                            <CheckBoxOutlineBlankIcon color="disabled" fontSize="small" />
                          ) : (
                            <ArrowDropDownIcon color="disabled" fontSize="small" />
                          )}
                          <Typography variant="body2" color="text.secondary">
                            {lang === 'ar' && opt.label_ar ? opt.label_ar : opt.label || (
                              <span style={{ color: theme.palette.text.disabled }}>
                                {lang === 'ar' ? 'خيار' : 'Option'}
                              </span>
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Fade in={isHovered || !question.title}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                    <IconButton
                      size="small"
                      onClick={() => setEditingQuestionId(question.id)}
                      color={isEditing ? 'primary' : 'default'}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={lang === 'ar' ? 'تكرار' : 'Duplicate'}>
                    <IconButton
                      size="small"
                      onClick={() => handleDuplicateQuestion(question)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={lang === 'ar' ? 'حذف' : 'Delete'}>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteQuestion(question.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Fade>
              
              {/* Required Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={question.required}
                    onChange={(e) => handleUpdateQuestion(question.id, { required: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="caption">{lang === 'ar' ? 'مطلوب' : 'Required'}</Typography>}
                sx={{ mr: 0 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
};

const SurveyBuilderPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Survey state
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeMessageAr, setWelcomeMessageAr] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [thankYouMessageAr, setThankYouMessageAr] = useState('');
  const [status, setStatus] = useState<Survey['status']>('draft');
  const [settings, setSettings] = useState<SurveySettings>(defaultSettings);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isAnonymousAllowed, setIsAnonymousAllowed] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [showCompanyName, setShowCompanyName] = useState(true);

  // Inline editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [hoveredQuestionId, setHoveredQuestionId] = useState<string | null>(null);

  // Preview state
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (id) {
      loadSurvey(id);
    }
  }, [id]);

  const loadSurvey = async (surveyId: string) => {
    setLoading(true);
    try {
      const survey = await getSurvey(surveyId);
      setTitle(survey.title);
      setTitleAr(survey.title_ar || '');
      setDescription(survey.description || '');
      setDescriptionAr(survey.description_ar || '');
      setWelcomeMessage(survey.welcome_message || '');
      setWelcomeMessageAr(survey.welcome_message_ar || '');
      setThankYouMessage(survey.thank_you_message || '');
      setThankYouMessageAr(survey.thank_you_message_ar || '');
      setStatus(survey.status);
      setSettings(survey.settings || defaultSettings);
      setQuestions(normalizeQuestionsFromApi(survey.questions || []));
      setIsAnonymousAllowed(survey.is_anonymous_allowed);
      setCompanyName(survey.company_name || '');
      setShowCompanyName(survey.show_company_name ?? true);
    } catch (error) {
      console.error('Failed to load survey:', error);
      setSnackbar({
        open: true,
        message: lang === 'ar' ? '  ' : 'Failed to load survey',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newStatus?: Survey['status']) => {
    if (!title.trim()) {
      setSnackbar({
        open: true,
        message: lang === 'ar' ? ' ' : 'Title is required',
        severity: 'error',
      });
      return;
    }

    if (questions.length === 0) {
      setSnackbar({
        open: true,
        message: lang === 'ar' ? '   ' : 'At least one question is required',
        severity: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const surveyData: Partial<Survey> = {
        title,
        title_ar: titleAr || undefined,
        description: description || undefined,
        description_ar: descriptionAr || undefined,
        welcome_message: welcomeMessage || undefined,
        welcome_message_ar: welcomeMessageAr || undefined,
        thank_you_message: thankYouMessage || undefined,
        thank_you_message_ar: thankYouMessageAr || undefined,
        status: newStatus || status,
        settings,
        questions: denormalizeQuestionsForApi(questions),
        is_anonymous_allowed: isAnonymousAllowed,
        company_name: companyName || undefined,
        show_company_name: showCompanyName,
      };

      if (isEditing && id) {
        await updateSurvey(id, surveyData);
      } else {
        const created = await createSurvey(surveyData);
        navigate(`/admin/surveys/${created.id}/edit`);
      }

      setSnackbar({
        open: true,
        message: lang === 'ar' ? ' ' : 'Saved successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to save survey:', error);
      setSnackbar({
        open: true,
        message: lang === 'ar' ? ' ' : 'Failed to save',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Add new question
  const handleAddQuestion = (type: QuestionType = 'single_choice') => {
    const newQuestion: SurveyQuestion = {
      id: `temp-${Date.now()}`,
      question_type: type,
      title: '',
      title_ar: '',
      required: false,
      order: questions.length,
      options: type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown' 
        ? [
            { id: `opt-${Date.now()}-1`, label: '', label_ar: '', value: 'option1', order: 0 },
            { id: `opt-${Date.now()}-2`, label: '', label_ar: '', value: 'option2', order: 1 },
          ]
        : [],
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  // Duplicate question
  const handleDuplicateQuestion = (question: SurveyQuestion) => {
    const duplicated: SurveyQuestion = {
      ...question,
      id: `temp-${Date.now()}`,
      title: `${question.title} (Copy)`,
      title_ar: question.title_ar ? `${question.title_ar} ()` : undefined,
      order: questions.length,
      options: question.options?.map(opt => ({
        ...opt,
        id: `opt-${Date.now()}-${opt.id}`,
      })),
    };
    setQuestions([...questions, duplicated]);
  };

  // Delete question
  const handleDeleteQuestion = (questionId: string) => {
    const newQuestions = questions.filter(q => q.id !== questionId);
    newQuestions.forEach((q, i) => (q.order = i));
    setQuestions(newQuestions);
    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
    }
  };

  // Update question
  const handleUpdateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  // Reorder questions
  const handleReorderQuestions = (newOrder: SurveyQuestion[]) => {
    newOrder.forEach((q, i) => (q.order = i));
    setQuestions(newOrder);
  };

  // Add option to question
  const handleAddOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const newOption: QuestionOption = {
      id: `opt-${Date.now()}`,
      label: '',
      label_ar: '',
      value: `option-${(question.options?.length || 0) + 1}`,
      order: question.options?.length || 0,
    };

    handleUpdateQuestion(questionId, {
      options: [...(question.options || []), newOption],
    });
  };

  // Update option
  const handleUpdateOption = (questionId: string, optionIndex: number, field: keyof QuestionOption, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;

    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    handleUpdateQuestion(questionId, { options: newOptions });
  };

  // Remove option
  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;

    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    newOptions.forEach((opt, i) => (opt.order = i));
    handleUpdateQuestion(questionId, { options: newOptions });
  };

  const handlePreviewAnswerChange = (questionId: string, value: any) => {
    setPreviewAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };





  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - Question Types */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          p: 2,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
          {lang === 'ar' ? ' ' : 'Add Question'}
        </Typography>
        <List dense>
          {sidebarQuestionTypes.map((qt) => (
            <ListItem key={qt.type} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleAddQuestion(mapQuestionType(qt.type))}
                sx={{
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {qt.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={qt.label[lang]} 
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Quick Actions */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
          {lang === 'ar' ? ' ' : 'Quick Actions'}
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => navigate('/admin/surveys/templates')}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AddIcon />
              </ListItemIcon>
              <ListItemText 
                primary={lang === 'ar' ? ' ' : 'From Template'} 
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/admin/surveys')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
            {isEditing
              ? (lang === 'ar' ? ' ' : 'Edit Survey')
              : (lang === 'ar' ? ' ' : 'New Survey')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={previewMode ? <EditIcon /> : <PreviewIcon />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode
              ? (lang === 'ar' ? '' : 'Edit')
              : (lang === 'ar' ? '' : 'Preview')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDrawerOpen(true)}
          >
            {lang === 'ar' ? '' : 'Settings'}
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? undefined : <SaveIcon />}
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving
              ? (lang === 'ar' ? ' ...' : 'Saving...')
              : (lang === 'ar' ? '' : 'Save')}
          </Button>
        </Box>

        {previewMode ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            {/* Company Name Display */}
            {showCompanyName && companyName && (
              <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 500 }}>
                {companyName}
              </Typography>
            )}
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              {lang === 'ar' && titleAr ? titleAr : title}
            </Typography>
            {(description || descriptionAr) && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {lang === 'ar' && descriptionAr ? descriptionAr : description}
              </Typography>
            )}
            <DynamicFormRenderer
              questions={questions}
              answers={previewAnswers}
              onAnswerChange={handlePreviewAnswerChange}
              lang={lang}
            />
          </Paper>
        ) : (
          <Box>
            {/* Survey Title Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <TextField
                fullWidth
                placeholder={lang === 'ar' ? ' ' : 'Survey title'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                InputProps={{
                  sx: { fontSize: '1.5rem', fontWeight: 600 },
                }}
                variant="standard"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                placeholder={lang === 'ar' ? ' ' : 'Title (Arabic)'}
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                variant="standard"
                dir="rtl"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                placeholder={lang === 'ar' ? ' ' : 'Description (optional)'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                variant="standard"
              />
            </Paper>

            {/* Questions */}
            <Reorder.Group
              axis="y"
              values={questions}
              onReorder={handleReorderQuestions}
              style={{ listStyle: 'none', padding: 0, margin: 0 }}
            >
              <AnimatePresence initial={false}>
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    editingQuestionId={editingQuestionId}
                    hoveredQuestionId={hoveredQuestionId}
                    setEditingQuestionId={setEditingQuestionId}
                    setHoveredQuestionId={setHoveredQuestionId}
                    handleUpdateQuestion={handleUpdateQuestion}
                    handleDuplicateQuestion={handleDuplicateQuestion}
                    handleDeleteQuestion={handleDeleteQuestion}
                    handleAddOption={handleAddOption}
                    handleUpdateOption={handleUpdateOption}
                    handleRemoveOption={handleRemoveOption}
                    lang={lang}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {/* Add Question Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.4),
                  border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
                onClick={() => handleAddQuestion()}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <AddIcon color="action" />
                  <Typography variant="body1" color="text.secondary">
                    {lang === 'ar' ? '  ' : 'Add Question'}
                  </Typography>
                </Box>
              </Paper>
            </motion.div>
          </Box>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, p: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {lang === 'ar' ? '' : 'Settings'}
          </Typography>
          <IconButton onClick={() => setSettingsDrawerOpen(false)}>
            <DeleteIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Company Branding */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {lang === 'ar' ? ' ' : 'Company Branding'}
            </Typography>
            <TextField
              fullWidth
              label={lang === 'ar' ? ' ' : 'Company Name'}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showCompanyName}
                  onChange={(e) => setShowCompanyName(e.target.checked)}
                />
              }
              label={lang === 'ar' ? '  ' : 'Show company name on survey'}
            />
          </Paper>

          {/* Survey Options */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {lang === 'ar' ? '' : 'Survey Options'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.show_progress_bar}
                  onChange={(e) => setSettings({ ...settings, show_progress_bar: e.target.checked })}
                />
              }
              label={lang === 'ar' ? '  ' : 'Show progress bar'}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.show_question_numbers}
                  onChange={(e) => setSettings({ ...settings, show_question_numbers: e.target.checked })}
                />
              }
              label={lang === 'ar' ? ' ' : 'Show question numbers'}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.one_question_per_page}
                  onChange={(e) => setSettings({ ...settings, one_question_per_page: e.target.checked })}
                />
              }
              label={lang === 'ar' ? '   ' : 'One question per page'}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allow_multiple_responses}
                  onChange={(e) => setSettings({ ...settings, allow_multiple_responses: e.target.checked })}
                />
              }
              label={lang === 'ar' ? '  ' : 'Allow multiple responses'}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isAnonymousAllowed}
                  onChange={(e) => setIsAnonymousAllowed(e.target.checked)}
                />
              }
              label={lang === 'ar' ? '  ' : 'Allow anonymous responses'}
            />
          </Paper>

          {/* Collect Information */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {lang === 'ar' ? ' ' : 'Collect Information'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.collect_email}
                  onChange={(e) => setSettings({ ...settings, collect_email: e.target.checked })}
                />
              }
              label={lang === 'ar' ? ' ' : 'Collect email'}
            />
            {settings.collect_email && (
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email_required}
                    onChange={(e) => setSettings({ ...settings, email_required: e.target.checked })}
                  />
                }
                label={lang === 'ar' ? '  ' : 'Email required'}
                sx={{ ml: 3 }}
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.collect_name}
                  onChange={(e) => setSettings({ ...settings, collect_name: e.target.checked })}
                />
              }
              label={lang === 'ar' ? ' ' : 'Collect name'}
            />
            {settings.collect_name && (
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.name_required}
                    onChange={(e) => setSettings({ ...settings, name_required: e.target.checked })}
                  />
                }
                label={lang === 'ar' ? '  ' : 'Name required'}
                sx={{ ml: 3 }}
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.collect_position}
                  onChange={(e) => setSettings({ ...settings, collect_position: e.target.checked })}
                />
              }
              label={lang === 'ar' ? ' ' : 'Collect position'}
            />
            {settings.collect_position && (
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.position_required}
                    onChange={(e) => setSettings({ ...settings, position_required: e.target.checked })}
                  />
                }
                label={lang === 'ar' ? '  ' : 'Position required'}
                sx={{ ml: 3 }}
              />
            )}
          </Paper>

          {/* Messages */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {lang === 'ar' ? '' : 'Messages'}
            </Typography>
            <TextField
              fullWidth
              label={lang === 'ar' ? ' ' : 'Welcome Message'}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              multiline
              rows={2}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={lang === 'ar' ? ' ' : 'Thank You Message'}
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              multiline
              rows={2}
              size="small"
            />
          </Paper>

          {/* Status */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              {lang === 'ar' ? '' : 'Status'}
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>{lang === 'ar' ? '' : 'Status'}</InputLabel>
              <Select
                value={status}
                label={lang === 'ar' ? '' : 'Status'}
                onChange={(e) => setStatus(e.target.value as Survey['status'])}
              >
                <MenuItem value="draft">{lang === 'ar' ? '' : 'Draft'}</MenuItem>
                <MenuItem value="active">{lang === 'ar' ? '' : 'Active'}</MenuItem>
                <MenuItem value="paused">{lang === 'ar' ? '' : 'Paused'}</MenuItem>
                <MenuItem value="closed">{lang === 'ar' ? '' : 'Closed'}</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Box>
      </Drawer>
    </Box>
  );
};

export default SurveyBuilderPage;
