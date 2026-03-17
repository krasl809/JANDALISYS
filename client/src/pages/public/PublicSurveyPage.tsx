import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  LinearProgress,
  IconButton,
  Switch,
  FormControlLabel,
  TextField,
  Skeleton,
  useTheme,
  alpha,
  Alert,
  Snackbar,
  Fade,
  Slide,
  Collapse,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BusinessIcon from '@mui/icons-material/Business';
import {
  getPublicSurvey,
  submitSurveyResponse,
  saveDraftResponse,
  checkSurveyStatus,
  saveDraftToLocalStorage,
  getDraftFromLocalStorage,
  removeDraftFromLocalStorage,
} from '../../services/surveyApi';
import {
  Survey,
  SurveyQuestion,
  Answer,
  DraftResponse,
  SurveyStatusResponse,
  getDefaultAnswerValue,
} from '../../types/surveys';
import DynamicFormRenderer from '../../components/surveys/DynamicFormRenderer';

type SurveyStep = 'welcome' | 'survey' | 'thank-you' | 'error';

const PublicSurveyPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [status, setStatus] = useState<SurveyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<SurveyStep>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [respondentPosition, setRespondentPosition] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Load survey and check for draft
  useEffect(() => {
    if (id) {
      loadSurvey(id);
    }
  }, [id]);

  const loadSurvey = async (surveyId: string) => {
    setLoading(true);
    try {
      // Check status first
      const statusData = await checkSurveyStatus(surveyId);
      setStatus(statusData);

      if (!statusData.is_active) {
        setCurrentStep('error');
        return;
      }

      // Load survey
      const surveyData = await getPublicSurvey(surveyId);
      setSurvey(surveyData);

      // Check for draft in localStorage
      const draft = getDraftFromLocalStorage(surveyId);
      if (draft) {
        setAnswers(
          draft.answers.reduce((acc, answer) => {
            acc[answer.question_id] = answer;
            return acc;
          }, {} as Record<string, Answer>)
        );
        setQuestionIndex(draft.current_step);
        setIsAnonymous(draft.is_anonymous);
        setRespondentEmail(draft.respondent_email || '');
        setRespondentName(draft.respondent_name || '');
      } else {
        // Initialize answers with default values
        const initialAnswers: Record<string, Answer> = {};
        surveyData.questions.forEach((q) => {
          initialAnswers[q.id] = {
            question_id: q.id,
            answer_value: getDefaultAnswerValue(q.question_type),
            timestamp: new Date().toISOString(),
          };
        });
        setAnswers(initialAnswers);
      }
    } catch (error) {
      console.error('Failed to load survey:', error);
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save draft
  useEffect(() => {
    if (survey && currentStep === 'survey' && survey.is_draft_autosave) {
      const draft: DraftResponse = {
        survey_id: survey.id,
        answers: Object.values(answers),
        current_step: questionIndex,
        saved_at: new Date().toISOString(),
        is_anonymous: isAnonymous,
        respondent_email: respondentEmail || undefined,
        respondent_name: respondentName || undefined,
      };
      saveDraftToLocalStorage(survey.id, draft);
    }
  }, [answers, questionIndex, currentStep, survey, isAnonymous, respondentEmail, respondentName]);

  const handleAnswerChange = (questionId: string, value: Answer['answer_value'], otherValue?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        answer_value: value,
        other_value: otherValue,
        timestamp: new Date().toISOString(),
      },
    }));
    // Clear error for this question
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

  const validateCurrentStep = (): boolean => {
    if (!survey) return false;

    const questionsToValidate = survey.settings.one_question_per_page
      ? [survey.questions[questionIndex]]
      : survey.questions;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    questionsToValidate.forEach((question) => {
      if (question.required ?? question.is_required) {
        const answer = answers[question.id];
        const value = answer?.answer_value;

        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = lang === 'ar' ? 'هذا السؤال مطلوب' : 'This question is required';
          isValid = false;
        }
      }
    });

    // Validate email if required
    if (survey.settings.collect_email && survey.settings.email_required && !isAnonymous) {
      if (!respondentEmail.trim()) {
        setSnackbar({
          open: true,
          message: lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required',
          severity: 'error',
        });
        isValid = false;
      }
    }

    // Validate name if required
    if (survey.settings.collect_name && survey.settings.name_required && !isAnonymous) {
      if (!respondentName.trim()) {
        setSnackbar({
          open: true,
          message: lang === 'ar' ? 'الاسم مطلوب' : 'Name is required',
          severity: 'error',
        });
        isValid = false;
      }
    }

    // Validate position if required
    if (survey.settings.collect_position && survey.settings.position_required && !isAnonymous) {
      if (!respondentPosition.trim()) {
        setSnackbar({
          open: true,
          message: lang === 'ar' ? 'المنصب مطلوب' : 'Position is required',
          severity: 'error',
        });
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (!survey) return;

    if (!validateCurrentStep()) {
      return;
    }

    if (survey.settings.one_question_per_page) {
      if (questionIndex < survey.questions.length - 1) {
        setQuestionIndex((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
    }
  };

  const handleStartSurvey = () => {
    setCurrentStep('survey');
  };

  const handleSubmit = async () => {
    if (!survey || !validateCurrentStep()) return;

    setSubmitting(true);
    try {
      await submitSurveyResponse(survey.id, {
        is_anonymous: isAnonymous,
        respondent_email: isAnonymous ? undefined : respondentEmail || undefined,
        respondent_name: isAnonymous ? undefined : respondentName || undefined,
        respondent_position: isAnonymous ? undefined : respondentPosition || undefined,
        answers: Object.values(answers),
      });

      // Clear draft
      removeDraftFromLocalStorage(survey.id);
      setCurrentStep('thank-you');
    } catch (error) {
      console.error('Failed to submit survey:', error);
      setSnackbar({
        open: true,
        message: lang === 'ar' ? 'فشل إرسال الاستبيان' : 'Failed to submit survey',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    if (!survey) return 0;
    if (survey.settings.one_question_per_page) {
      return ((questionIndex + 1) / survey.questions.length) * 100;
    }
    const answeredCount = survey.questions.filter((q) => {
      const answer = answers[q.id];
      const value = answer?.answer_value;
      return value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
    }).length;
    return (answeredCount / survey.questions.length) * 100;
  };

  const getTitle = () => {
    if (!survey) return '';
    return lang === 'ar' && survey.title_ar ? survey.title_ar : survey.title;
  };

  const getDescription = () => {
    if (!survey) return '';
    return lang === 'ar' && survey.description_ar ? survey.description_ar : survey.description;
  };

  const getWelcomeMessage = () => {
    if (!survey) return '';
    return lang === 'ar' && survey.welcome_message_ar ? survey.welcome_message_ar : survey.welcome_message;
  };

  const getThankYouMessage = () => {
    if (!survey) return '';
    return lang === 'ar' && survey.thank_you_message_ar ? survey.thank_you_message_ar : survey.thank_you_message;
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
            }}
          >
            <Skeleton variant="text" height={60} />
            <Skeleton variant="text" height={30} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 3, borderRadius: 2 }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  // Error state
  if (currentStep === 'error' || !survey) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 80, color: theme.palette.error.main, mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              {status?.message || (lang === 'ar' ? 'الاستبيان غير متاح' : 'Survey Unavailable')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {lang === 'ar'
                ? 'عذراً، هذا الاستبيان غير متاح حالياً أو تم إغلاقه.'
                : 'Sorry, this survey is currently unavailable or has been closed.'}
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Thank you state
  if (currentStep === 'thank-you') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                textAlign: 'center',
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircleOutlineIcon
                  sx={{
                    fontSize: 80,
                    color: theme.palette.success.main,
                    mb: 2,
                  }}
                />
              </motion.div>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {lang === 'ar' ? 'شكراً لك!' : 'Thank You!'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {getThankYouMessage() || (lang === 'ar'
                  ? 'تم إرسال إجاباتك بنجاح. شكراً لمشاركتك!'
                  : 'Your responses have been submitted successfully. Thank you for your participation!')}
              </Typography>
            </Paper>
          </motion.div>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
      }}
    >
      {/* Progress bar */}
      {currentStep === 'survey' && survey.settings.show_progress_bar && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <LinearProgress
            variant="determinate"
            value={getProgress()}
            sx={{
              height: 6,
              backgroundColor: 'transparent',
              '& .MuiLinearProgress-bar': {
                borderRadius: 0,
              },
            }}
          />
        </Box>
      )}

      <Container maxWidth="md" sx={{ py: 4 }}>
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                {/* Company Name Display */}
                {survey.show_company_name && survey.company_name && (
                  <Typography 
                    variant="subtitle1" 
                    color="primary" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <BusinessIcon fontSize="small" />
                    {survey.company_name}
                  </Typography>
                )}
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  {getTitle()}
                </Typography>

                {getDescription() && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {getDescription()}
                  </Typography>
                )}

                {getWelcomeMessage() && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="body1">{getWelcomeMessage()}</Typography>
                  </Paper>
                )}

                {/* Anonymous toggle */}
                {survey.is_anonymous_allowed && (
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="body1">
                          {lang === 'ar' ? 'إجابة مجهولة' : 'Submit anonymously'}
                        </Typography>
                      }
                    />
                  </Box>
                )}

                {/* Contact info fields */}
                {!isAnonymous && (survey.settings.collect_email || survey.settings.collect_name || survey.settings.collect_position) && (
                  <Box sx={{ mb: 3 }}>
                    {survey.settings.collect_name && (
                      <TextField
                        fullWidth
                        label={lang === 'ar' ? 'الاسم' : 'Name'}
                        value={respondentName}
                        onChange={(e) => setRespondentName(e.target.value)}
                        required={survey.settings.name_required}
                        sx={{ mb: 2 }}
                      />
                    )}
                    {survey.settings.collect_position && (
                      <TextField
                        fullWidth
                        label={lang === 'ar' ? 'المنصب' : 'Position'}
                        value={respondentPosition}
                        onChange={(e) => setRespondentPosition(e.target.value)}
                        required={survey.settings.position_required}
                        sx={{ mb: 2 }}
                      />
                    )}
                    {survey.settings.collect_email && (
                      <TextField
                        fullWidth
                        type="email"
                        label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                        value={respondentEmail}
                        onChange={(e) => setRespondentEmail(e.target.value)}
                        required={survey.settings.email_required}
                      />
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStartSurvey}
                  endIcon={lang === 'ar' ? undefined : <ArrowForwardIcon />}
                  startIcon={lang === 'ar' ? <ArrowForwardIcon sx={{ transform: 'rotate(180deg)' }} /> : undefined}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                  }}
                >
                  {lang === 'ar' ? 'ابدأ الاستبيان' : 'Start Survey'}
                </Button>
              </Paper>
            </motion.div>
          )}

          {/* Survey Questions */}
          {currentStep === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                {/* Company Name Display */}
                {survey.show_company_name && survey.company_name && (
                  <Typography 
                    variant="subtitle1" 
                    color="primary" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <BusinessIcon fontSize="small" />
                    {survey.company_name}
                  </Typography>
                )}
                {/* Survey title */}
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {getTitle()}
                </Typography>

                {/* Questions */}
                <Box sx={{ mt: 3 }}>
                  <DynamicFormRenderer
                    questions={survey.questions}
                    answers={answers}
                    onAnswerChange={handleAnswerChange}
                    lang={lang}
                    showQuestionNumbers={survey.settings.show_question_numbers}
                    currentStep={questionIndex}
                    oneQuestionPerStep={survey.settings.one_question_per_page}
                    errors={errors}
                  />
                </Box>

                {/* Navigation */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 4,
                    pt: 3,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={handlePrevious}
                    disabled={questionIndex === 0 || !survey.settings.one_question_per_page}
                    startIcon={lang === 'ar' ? undefined : <ArrowBackIcon />}
                    endIcon={lang === 'ar' ? <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} /> : undefined}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    {lang === 'ar' ? 'السابق' : 'Previous'}
                  </Button>

                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={submitting}
                    endIcon={
                      submitting ? undefined : (
                        survey.settings.one_question_per_page && questionIndex < survey.questions.length - 1
                          ? (lang === 'ar' ? <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} /> : <ArrowForwardIcon />)
                          : <SendIcon />
                      )
                    }
                    sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                  >
                    {submitting
                      ? (lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                      : survey.settings.one_question_per_page && questionIndex < survey.questions.length - 1
                        ? (lang === 'ar' ? 'التالي' : 'Next')
                        : (lang === 'ar' ? 'إرسال' : 'Submit')}
                  </Button>
                </Box>

                {/* Progress indicator */}
                {survey.settings.one_question_per_page && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {lang === 'ar'
                        ? `${questionIndex + 1} من ${survey.questions.length}`
                        : `${questionIndex + 1} of ${survey.questions.length}`}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>

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
  );
};

export default PublicSurveyPage;
