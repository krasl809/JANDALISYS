import React from 'react';
import { Box, Typography, Paper, useTheme, alpha, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  SurveyQuestion,
  QuestionType,
  Answer,
  getDefaultAnswerValue,
} from '../../types/surveys';
import {
  LikertScale,
  OpenText,
  SingleChoice,
  MultipleChoice,
  DropdownSelect,
  StarRating,
  YesNoToggle,
  NPSScore,
  CustomScale,
} from './QuestionComponents';

interface DynamicFormRendererProps {
  questions: SurveyQuestion[];
  answers: Record<string, Answer>;
  onAnswerChange: (questionId: string, value: Answer['answer_value'], otherValue?: string) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
  showQuestionNumbers?: boolean;
  currentStep?: number;
  oneQuestionPerStep?: boolean;
  errors?: Record<string, string>;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  questions,
  answers,
  onAnswerChange,
  disabled = false,
  lang = 'en',
  showQuestionNumbers = true,
  currentStep = 0,
  oneQuestionPerStep = false,
  errors = {},
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getQuestionTitle = (question: SurveyQuestion) => {
    const display = lang === 'ar' && question.title_ar ? question.title_ar : (question.title ?? question.question_text);
    return display ?? '';
  };

  const getQuestionDescription = (question: SurveyQuestion) => {
    const display = lang === 'ar' && question.description_ar ? question.description_ar : (question.description ?? question.help_text);
    return display ?? '';
  };

  const renderQuestionComponent = (question: SurveyQuestion) => {
    const answer = answers[question.id];
    const value = answer?.answer_value ?? getDefaultAnswerValue(question.question_type);
    const otherValue = answer?.other_value ?? '';
    const error = errors[question.id];

    const commonProps = {
      question,
      disabled,
      lang,
    };

    switch (question.question_type) {
      case 'likert_5':
      case 'likert_7':
        return (
          <LikertScale
            {...commonProps}
            value={value as number | null}
            onChange={(val) => onAnswerChange(question.id, val)}
          />
        );

      case 'open_text':
      case 'open_text_long':
        return (
          <OpenText
            {...commonProps}
            value={value as string}
            onChange={(val) => onAnswerChange(question.id, val)}
            error={error}
          />
        );

      case 'single_choice':
        return (
          <SingleChoice
            {...commonProps}
            value={value as string | null}
            otherValue={otherValue}
            onChange={(val, other) => onAnswerChange(question.id, val, other)}
          />
        );

      case 'multiple_choice':
        return (
          <MultipleChoice
            {...commonProps}
            value={value as string[]}
            otherValue={otherValue}
            onChange={(val, other) => onAnswerChange(question.id, val, other)}
          />
        );

      case 'dropdown':
        return (
          <DropdownSelect
            {...commonProps}
            value={value as string | null}
            onChange={(val) => onAnswerChange(question.id, val)}
            error={error}
          />
        );

      case 'rating':
        return (
          <StarRating
            {...commonProps}
            value={value as number}
            onChange={(val) => onAnswerChange(question.id, val)}
            maxRating={question.max_value || 5}
          />
        );

      case 'yes_no':
        return (
          <YesNoToggle
            {...commonProps}
            value={value as boolean}
            onChange={(val) => onAnswerChange(question.id, val)}
          />
        );

      case 'nps':
        return (
          <NPSScore
            {...commonProps}
            value={value as number}
            onChange={(val) => onAnswerChange(question.id, val)}
          />
        );

      case 'scale':
        return (
          <CustomScale
            {...commonProps}
            value={value as number}
            onChange={(val) => onAnswerChange(question.id, val)}
          />
        );

      default:
        return (
          <Typography color="error">
            {lang === 'ar' ? 'نوع السؤال غير مدعوم' : 'Unsupported question type'}
          </Typography>
        );
    }
  };

  const questionsToRender = oneQuestionPerStep
    ? [questions[currentStep]].filter(Boolean)
    : questions;

  const questionVariants = {
    hidden: { opacity: 0, x: lang === 'ar' ? 50 : -50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: lang === 'ar' ? -50 : 50 },
  };

  return (
    <Box sx={{ width: '100%' }}>
      <AnimatePresence mode="wait">
        {questionsToRender.map((question, index) => (
          <motion.div
            key={question.id}
            variants={questionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Question header */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                  {showQuestionNumbers && (
                    <Chip
                      label={oneQuestionPerStep ? currentStep + 1 : index + 1}
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        minWidth: 32,
                      }}
                    />
                  )}
                  <Typography
                    variant="h6"
                    sx={{
                      flex: 1,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      lineHeight: 1.4,
                    }}
                  >
                    {getQuestionTitle(question)}
                  </Typography>
                  {(question.required ?? question.is_required) && (
                    <Typography
                      variant="h6"
                      sx={{ color: theme.palette.error.main }}
                    >
                      *
                    </Typography>
                  )}
                </Box>
                
                {getQuestionDescription(question) && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      ml: showQuestionNumbers ? 5 : 0,
                    }}
                  >
                    {getQuestionDescription(question)}
                  </Typography>
                )}
              </Box>

              {/* Question component */}
              <Box sx={{ mt: 2 }}>
                {renderQuestionComponent(question)}
              </Box>

              {/* Error message */}
              {errors[question.id] && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.error.main,
                      display: 'block',
                      mt: 1,
                    }}
                  >
                    {errors[question.id]}
                  </Typography>
                </motion.div>
              )}
            </Paper>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default DynamicFormRenderer;
