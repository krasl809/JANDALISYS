import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fade,
  Tooltip,
  Badge,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FeedbackIcon from '@mui/icons-material/Feedback';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HotelIcon from '@mui/icons-material/Hotel';
import SupportIcon from '@mui/icons-material/Support';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  SurveyQuestion,
  QuestionType,
} from '../../types/surveys';
import { createSurvey } from '../../services/surveyApi';

// Template categories
const categories = [
  { id: 'all', label: { en: 'All Templates', ar: '_all' } },
  { id: 'employee', label: { en: 'Employee', ar: ' _' } },
  { id: 'customer', label: { en: 'Customer', ar: '' } },
  { id: 'feedback', label: { en: 'Feedback', ar: '' } },
  { id: 'event', label: { en: 'Events', ar: '' } },
  {
    id: 'employee-engagement-custom',
    name: 'Employee Engagement Survey (Custom)',
    name_ar: 'استبيان الارتباط الوظيفي (مخصص)',
    description: 'Custom employee engagement survey with specific questions for organizational commitment.',
    description_ar: 'استبيان مخصص لقياس الارتباط الوظيفي والالتزام التنظيمي للموظفين.',
    category: 'employee',
    icon: 'GroupsIcon',
    color: '#0288d1',
    questions: [
      {
        id: 'eng-1',
        question_type: 'open_text' as QuestionType,
        title: 'Name (Optional)',
        title_ar: 'الاسم (اختياري)',
        required: false,
        order: 0,
        options: [],
      },
      {
        id: 'eng-2',
        question_type: 'open_text' as QuestionType,
        title: 'Job Title (Optional)',
        title_ar: 'المسمى الوظيفي (اختياري)',
        required: false,
        order: 1,
        options: [],
      },
      {
        id: 'eng-3',
        question_type: 'dropdown' as QuestionType,
        title: 'Organization',
        title_ar: 'المنشأة',
        required: true,
        order: 2,
        options: [
          { id: 'org-1', label: 'Main Branch', label_ar: 'الفرع الرئيسي', value: 'main', order: 0 },
          { id: 'org-2', label: 'Branch 1', label_ar: 'فرع 1', value: 'b1', order: 1 },
          { id: 'org-3', label: 'Branch 2', label_ar: 'فرع 2', value: 'b2', order: 2 },
        ],
      },
      {
        id: 'eng-4',
        question_type: 'dropdown' as QuestionType,
        title: 'Years of Experience in the Company',
        title_ar: 'سنوات الخبرة في الشركة',
        required: false,
        order: 3,
        options: [
          { id: 'exp-1', label: 'Less than 1 year', label_ar: 'أقل من سنة', value: 'lt1', order: 0 },
          { id: 'exp-2', label: '1-3 years', label_ar: '1-3 سنوات', value: '1-3', order: 1 },
          { id: 'exp-3', label: '3-5 years', label_ar: '3-5 سنوات', value: '3-5', order: 2 },
          { id: 'exp-4', label: '5-10 years', label_ar: '5-10 سنوات', value: '5-10', order: 3 },
          { id: 'exp-5', label: 'More than 10 years', label_ar: 'أكثر من 10 سنوات', value: 'gt10', order: 4 },
        ],
      },
      {
        id: 'eng-5',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel great happiness because I spend most of my time at work here.',
        title_ar: 'أشعر بسعادة بالغة لأنني أمضي معظم وقتي في العمل هنا.',
        required: true,
        order: 4,
        options: [],
      },
      {
        id: 'eng-6',
        question_type: 'likert_5' as QuestionType,
        title: 'I am proud when I talk about my workplace to others.',
        title_ar: 'أفتخر عندما أتحدث عن مكان عملي للآخرين.',
        required: true,
        order: 5,
        options: [],
      },
      {
        id: 'eng-7',
        question_type: 'likert_5' as QuestionType,
        title: 'I have invested a lot of my time and effort in this institution, which makes leaving for another place costly for me.',
        title_ar: 'لقد استثمرت الكثير من وقتي وجهدي في هذه المؤسسة مما يجعل الانتقال إلى مكان آخر مكلفاً بالنسبة لي.',
        required: true,
        order: 6,
        options: [],
      },
      {
        id: 'eng-8',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel that I owe this institution because it provided me with a job opportunity.',
        title_ar: 'أشعر بأنني مدين لهذه المؤسسة لأنها وفرت لي فرصة العمل.',
        required: true,
        order: 7,
        options: [],
      },
      {
        id: 'eng-9',
        question_type: 'likert_5' as QuestionType,
        title: 'My direct manager cares about me and appreciates my efforts.',
        title_ar: 'مديري المباشر يهتم بي ويقدر جهودي.',
        required: true,
        order: 8,
        options: [],
      },
      {
        id: 'eng-10',
        question_type: 'likert_5' as QuestionType,
        title: 'Management is characterized by transparency and clarity in dealing with employees.',
        title_ar: 'تتسم الإدارة بالشفافية والوضوح في التعامل مع الموظفين.',
        required: true,
        order: 9,
        options: [],
      },
      {
        id: 'eng-11',
        question_type: 'likert_5' as QuestionType,
        title: 'I have opportunities for professional development within the company.',
        title_ar: 'تتوفر لي فرص للتطور الوظيفي والمهني داخل الشركة.',
        required: true,
        order: 10,
        options: [],
      },
      {
        id: 'eng-12',
        question_type: 'likert_5' as QuestionType,
        title: 'The work environment here encourages innovation and cooperation.',
        title_ar: 'بيئة العمل هنا تشجع على الإبداع والتعاون.',
        required: true,
        order: 11,
        options: [],
      },
      {
        id: 'eng-13',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel that my opinion is heard and valued when making decisions about my work.',
        title_ar: 'أشعر بأن رأيي مسموع ويتم تقديره عند اتخاذ القرارات التي تخص عملي.',
        required: true,
        order: 12,
        options: [],
      },
      {
        id: 'eng-14',
        question_type: 'likert_5' as QuestionType,
        title: 'I plan to stay with this institution for a long time (more than 3 years).',
        title_ar: 'أخطط للبقاء في هذه المؤسسة لمدة طويلة (أكثر من 3 سنوات).',
        required: true,
        order: 13,
        options: [],
      },
      {
        id: 'eng-15',
        question_type: 'likert_5' as QuestionType,
        title: 'I encourage my friends and acquaintances to apply for work at this institution.',
        title_ar: 'أشجع أصدقائي ومعارفي على التقدم للعمل في هذه المؤسسة.',
        required: true,
        order: 14,
        options: [],
      },
      {
        id: 'eng-16',
        question_type: 'likert_5' as QuestionType,
        title: 'Do you have difficulty obtaining information to make better work decisions?',
        title_ar: 'هل تجد صعوبة في الحصول على المعلومات لاتخاذ قرارات أفضل في العمل؟',
        required: true,
        order: 15,
        options: [],
      },
      {
        id: 'eng-17',
        question_type: 'likert_5' as QuestionType,
        title: 'If something unusual happens, do you know who to go to for a solution?',
        title_ar: 'إذا حدث شيء غير عادي، فهل تعرف لمن تذهب لإيجاد حل؟',
        required: true,
        order: 16,
        options: [],
      },
      {
        id: 'eng-18',
        question_type: 'likert_5' as QuestionType,
        title: 'Do you receive constructive feedback from your manager?',
        title_ar: 'هل تتلقى ملاحظات بناءة من مديرك؟',
        required: true,
        order: 17,
        options: [],
      },
      {
        id: 'eng-19',
        question_type: 'likert_5' as QuestionType,
        title: 'Does your manager praise you when you do a good job?',
        title_ar: 'هل يثني عليك مديرك عندما تقوم بعمل جيد؟',
        required: true,
        order: 18,
        options: [],
      },
      {
        id: 'eng-20',
        question_type: 'open_text' as QuestionType,
        title: 'Do you have any problems you cannot solve? What are they?',
        title_ar: 'هل يوجد لديك مشكلة تواجهك ولا تستطيع حلها؟ ما هي؟',
        required: false,
        order: 19,
        options: [],
      },
      {
        id: 'eng-21',
        question_type: 'open_text' as QuestionType,
        title: 'Do you have any suggestions? What are they?',
        title_ar: 'هل يوجد لديك اقتراحات؟ ما هي؟',
        required: false,
        order: 20,
        options: [],
      },
    ],
  },
];

// Pre-built templates
const surveyTemplates: SurveyTemplateData[] = [
  {
    id: 'employee-satisfaction',
    name: 'Employee Satisfaction Survey',
    name_ar: 'استبيان رضا الموظفين',
    description: 'Measure employee satisfaction and engagement levels across your organization',
    description_ar: 'قياس مستوى رضا الموظفين ومشاركتهم في المؤسسة',
    category: 'employee',
    icon: 'GroupsIcon',
    color: '#1976d2',
    questions: [
      {
        id: 'temp-1',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel valued and appreciated for my work',
        title_ar: 'أشعر بأنني مُقدَّر ومُحترَم في عملي',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-2',
        question_type: 'likert_5' as QuestionType,
        title: 'I have the tools and resources I need to do my job effectively',
        title_ar: '       _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-3',
        question_type: 'likert_5' as QuestionType,
        title: 'I have opportunities for growth and development',
        title_ar: '    _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-4',
        question_type: 'likert_5' as QuestionType,
        title: 'Communication within my team is effective',
        title_ar: '   _',
        required: true,
        order: 3,
        options: [],
      },
      {
        id: 'temp-5',
        question_type: 'open_text' as QuestionType,
        title: 'What suggestions do you have to improve our workplace?',
        title_ar: '     _',
        required: false,
        order: 4,
        options: [],
      },
    ],
  },
  {
    id: 'customer-feedback',
    name: 'Customer Feedback Survey',
    name_ar: '  _',
    description: 'Collect valuable feedback from customers about your products or services',
    description_ar: '     _',
    category: 'customer',
    icon: 'FeedbackIcon',
    color: '#2e7d32',
    questions: [
      {
        id: 'temp-6',
        question_type: 'rating' as QuestionType,
        title: 'How would you rate your overall experience with us?',
        title_ar: '    _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-7',
        question_type: 'single_choice' as QuestionType,
        title: 'How did you hear about us?',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [
          { id: 'opt-1', label: 'Social Media', label_ar: ' ', value: 'social_media', order: 0 },
          { id: 'opt-2', label: 'Word of Mouth', label_ar: ' ', value: 'word_of_mouth', order: 1 },
          { id: 'opt-3', label: 'Search Engine', label_ar: ' ', value: 'search_engine', order: 2 },
          { id: 'opt-4', label: 'Advertisement', label_ar: '', value: 'advertisement', order: 3 },
          { id: 'opt-5', label: 'Other', label_ar: '', value: 'other', order: 4 },
        ],
      },
      {
        id: 'temp-8',
        question_type: 'nps' as QuestionType,
        title: 'How likely are you to recommend us to a friend or colleague?',
        title_ar: '      _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-9',
        question_type: 'open_text' as QuestionType,
        title: 'What can we do to improve your experience?',
        title_ar: '     _',
        required: false,
        order: 3,
        options: [],
      },
    ],
  },
  {
    id: 'training-evaluation',
    name: 'Training Evaluation Form',
    name_ar: '  _',
    description: 'Evaluate the effectiveness of training programs and identify areas for improvement',
    description_ar: '     _',
    category: 'employee',
    icon: 'SchoolIcon',
    color: '#ed6c02',
    questions: [
      {
        id: 'temp-10',
        question_type: 'likert_5' as QuestionType,
        title: 'The training objectives were clearly defined',
        title_ar: '   _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-11',
        question_type: 'likert_5' as QuestionType,
        title: 'The training content was relevant to my job',
        title_ar: '   _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-12',
        question_type: 'likert_5' as QuestionType,
        title: 'The instructor was knowledgeable and engaging',
        title_ar: '   _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-13',
        question_type: 'multiple_choice' as QuestionType,
        title: 'Which topics were most valuable to you?',
        title_ar: '   _',
        required: false,
        order: 3,
        options: [
          { id: 'opt-6', label: 'Technical Skills', label_ar: ' ', value: 'technical', order: 0 },
          { id: 'opt-7', label: 'Communication', label_ar: '', value: 'communication', order: 1 },
          { id: 'opt-8', label: 'Leadership', label_ar: '', value: 'leadership', order: 2 },
          { id: 'opt-9', label: 'Problem Solving', label_ar: ' ', value: 'problem_solving', order: 3 },
        ],
      },
      {
        id: 'temp-14',
        question_type: 'open_text' as QuestionType,
        title: 'What topics would you like to see in future training sessions?',
        title_ar: '      _',
        required: false,
        order: 4,
        options: [],
      },
    ],
  },
  {
    id: 'event-feedback',
    name: 'Event Feedback Survey',
    name_ar: '  _',
    description: 'Gather feedback from attendees about your events, conferences, or meetings',
    description_ar: '     _',
    category: 'event',
    icon: 'EventIcon',
    color: '#9c27b0',
    questions: [
      {
        id: 'temp-15',
        question_type: 'rating' as QuestionType,
        title: 'Overall, how would you rate this event?',
        title_ar: '   _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-16',
        question_type: 'likert_5' as QuestionType,
        title: 'The event was well-organized',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-17',
        question_type: 'likert_5' as QuestionType,
        title: 'The speakers/presentations were engaging',
        title_ar: '/  _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-18',
        question_type: 'single_choice' as QuestionType,
        title: 'How did you find the event duration?',
        title_ar: '   _',
        required: true,
        order: 3,
        options: [
          { id: 'opt-10', label: 'Too Short', label_ar: ' ', value: 'too_short', order: 0 },
          { id: 'opt-11', label: 'Just Right', label_ar: '', value: 'just_right', order: 1 },
          { id: 'opt-12', label: 'Too Long', label_ar: ' ', value: 'too_long', order: 2 },
        ],
      },
      {
        id: 'temp-19',
        question_type: 'open_text' as QuestionType,
        title: 'What topics would you like to see in future events?',
        title_ar: '     _',
        required: false,
        order: 4,
        options: [],
      },
    ],
  },
  {
    id: 'performance-review',
    name: 'Performance Review Survey',
    name_ar: '  _',
    description: 'Conduct comprehensive performance reviews and gather 360-degree feedback',
    description_ar: '     _',
    category: 'employee',
    icon: 'WorkIcon',
    color: '#0288d1',
    questions: [
      {
        id: 'temp-20',
        question_type: 'likert_5' as QuestionType,
        title: 'Meets job expectations and responsibilities',
        title_ar: '    _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-21',
        question_type: 'likert_5' as QuestionType,
        title: 'Demonstrates strong communication skills',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-22',
        question_type: 'likert_5' as QuestionType,
        title: 'Works effectively in a team environment',
        title_ar: '   _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-23',
        question_type: 'likert_5' as QuestionType,
        title: 'Shows initiative and problem-solving abilities',
        title_ar: '   _',
        required: true,
        order: 3,
        options: [],
      },
      {
        id: 'temp-24',
        question_type: 'open_text' as QuestionType,
        title: 'Key achievements and contributions this period',
        title_ar: '    _',
        required: false,
        order: 4,
        options: [],
      },
      {
        id: 'temp-25',
        question_type: 'open_text' as QuestionType,
        title: 'Areas for improvement and development',
        title_ar: '  _',
        required: false,
        order: 5,
        options: [],
      },
    ],
  },
  {
    id: 'product-feedback',
    name: 'Product Feedback Survey',
    name_ar: '  _',
    description: 'Collect detailed feedback about your products to guide development decisions',
    description_ar: '     _',
    category: 'feedback',
    icon: 'StarIcon',
    color: '#d32f2f',
    questions: [
      {
        id: 'temp-26',
        question_type: 'rating' as QuestionType,
        title: 'How would you rate the product quality?',
        title_ar: '   _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-27',
        question_type: 'likert_5' as QuestionType,
        title: 'The product meets my expectations',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-28',
        question_type: 'multiple_choice' as QuestionType,
        title: 'Which features do you use most frequently?',
        title_ar: '   _',
        required: true,
        order: 2,
        options: [
          { id: 'opt-13', label: 'Feature A', label_ar: ' A', value: 'feature_a', order: 0 },
          { id: 'opt-14', label: 'Feature B', label_ar: ' B', value: 'feature_b', order: 1 },
          { id: 'opt-15', label: 'Feature C', label_ar: ' C', value: 'feature_c', order: 2 },
          { id: 'opt-16', label: 'Feature D', label_ar: ' D', value: 'feature_d', order: 3 },
        ],
      },
      {
        id: 'temp-29',
        question_type: 'open_text' as QuestionType,
        title: 'What features would you like to see added?',
        title_ar: '   _',
        required: false,
        order: 3,
        options: [],
      },
      {
        id: 'temp-30',
        question_type: 'nps' as QuestionType,
        title: 'How likely are you to recommend this product?',
        title_ar: '    _',
        required: true,
        order: 4,
        options: [],
      },
    ],
  },
  {
    id: 'employee-engagement',
    name: 'Employee Engagement Survey',
    name_ar: 'استبيان رضا الموظفين',
    description: 'Measure employee engagement and organizational commitment',
    description_ar: 'قياس رضا الموظفين والتزامهم التنظيمي',
    category: 'employee',
    icon: 'GroupsIcon',
    color: '#0288d1',
    questions: [
      {
        id: 'emp-1',
        question_type: 'open_text' as QuestionType,
        title: 'Name (Optional)',
        title_ar: 'الاسم (اختياري)',
        required: false,
        order: 0,
        options: [],
      },
      {
        id: 'emp-2',
        question_type: 'open_text' as QuestionType,
        title: 'Job Title (Optional)',
        title_ar: 'المسمى الوظيفي (اختياري)',
        required: false,
        order: 1,
        options: [],
      },
      {
        id: 'emp-3',
        question_type: 'dropdown' as QuestionType,
        title: 'Organization',
        title_ar: 'المنشأة',
        required: true,
        order: 2,
        options: [
          { id: 'org-1', label: 'Headquarters', label_ar: 'المقر الرئيسي', value: 'headquarters', order: 0 },
          { id: 'org-2', label: 'Branch Office 1', label_ar: 'مكتب فرعي 1', value: 'branch_1', order: 1 },
          { id: 'org-3', label: 'Branch Office 2', label_ar: 'مكتب فرعي 2', value: 'branch_2', order: 2 },
          { id: 'org-4', label: 'Branch Office 3', label_ar: 'مكتب فرعي 3', value: 'branch_3', order: 3 },
          { id: 'org-5', label: 'Remote Work', label_ar: 'عمل عن بعد', value: 'remote', order: 4 },
        ],
      },
      {
        id: 'emp-4',
        question_type: 'single_choice' as QuestionType,
        title: 'Years of Experience in the Company',
        title_ar: 'سنوات الخبرة في الشركة',
        required: true,
        order: 3,
        options: [
          { id: 'exp-1', label: 'Less than 1 year', label_ar: 'أقل من سنة', value: 'less_1', order: 0 },
          { id: 'exp-2', label: '1-3 years', label_ar: '1-3 سنوات', value: '1-3', order: 1 },
          { id: 'exp-3', label: '3-5 years', label_ar: '3-5 سنوات', value: '3-5', order: 2 },
          { id: 'exp-4', label: '5-10 years', label_ar: '5-10 سنوات', value: '5-10', order: 3 },
          { id: 'exp-5', label: 'More than 10 years', label_ar: 'أكثر من 10 سنوات', value: 'more_10', order: 4 },
        ],
      },
      {
        id: 'emp-5',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel great happiness because I spend most of my time at work here.',
        title_ar: 'أشعر بسعادة بالغة لأنني أمضي معظم وقتي في العمل هنا.',
        required: true,
        order: 4,
        options: [],
      },
      {
        id: 'emp-6',
        question_type: 'likert_5' as QuestionType,
        title: 'I am proud when I talk about my workplace to others.',
        title_ar: 'أفتخر عندما أتحدث عن مكان عملي للآخرين.',
        required: true,
        order: 5,
        options: [],
      },
      {
        id: 'emp-7',
        question_type: 'likert_5' as QuestionType,
        title: 'I have invested a lot of my time and effort in this institution, which makes leaving for another place costly for me.',
        title_ar: 'لقد استثمرت الكثير من وقتي وجهدي في هذه المؤسسة مما يجعل الانتقال إلى مكان آخر مكلفاً بالنسبة لي.',
        required: true,
        order: 6,
        options: [],
      },
      {
        id: 'emp-8',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel that I owe this institution because it provided me with a job opportunity.',
        title_ar: 'أشعر بأنني مدين لهذه المؤسسة لأنها وفرت لي فرصة العمل.',
        required: true,
        order: 7,
        options: [],
      },
      {
        id: 'emp-9',
        question_type: 'likert_5' as QuestionType,
        title: 'My direct manager cares about me and appreciates my efforts.',
        title_ar: 'مديري المباشر يهتم بي ويقدر جهودي.',
        required: true,
        order: 8,
        options: [],
      },
      {
        id: 'emp-10',
        question_type: 'likert_5' as QuestionType,
        title: 'Management is characterized by transparency and clarity in dealing with employees.',
        title_ar: 'تتسم الإدارة بالشفافية والوضوح في التعامل مع الموظفين.',
        required: true,
        order: 9,
        options: [],
      },
      {
        id: 'emp-11',
        question_type: 'likert_5' as QuestionType,
        title: 'I have opportunities for professional development within the company.',
        title_ar: 'تتوفر لي فرص للتطور الوظيفي والمهني داخل الشركة.',
        required: true,
        order: 10,
        options: [],
      },
      {
        id: 'emp-12',
        question_type: 'likert_5' as QuestionType,
        title: 'The work environment here encourages innovation and cooperation.',
        title_ar: 'بيئة العمل هنا تشجع على الإبداع والتعاون.',
        required: true,
        order: 11,
        options: [],
      },
      {
        id: 'emp-13',
        question_type: 'likert_5' as QuestionType,
        title: 'I feel that my opinion is heard and valued when making decisions about my work.',
        title_ar: 'أشعر بأن رأيي مسموع ويتم تقديره عند اتخاذ القرارات التي تخص عملي.',
        required: true,
        order: 12,
        options: [],
      },
      {
        id: 'emp-14',
        question_type: 'likert_5' as QuestionType,
        title: 'I plan to stay with this institution for a long time (more than 3 years).',
        title_ar: 'أخطط للبقاء في هذه المؤسسة لمدة طويلة (أكثر من 3 سنوات).',
        required: true,
        order: 13,
        options: [],
      },
      {
        id: 'emp-15',
        question_type: 'likert_5' as QuestionType,
        title: 'I encourage my friends and acquaintances to apply for work at this institution.',
        title_ar: 'أشجع أصدقائي ومعارفي على التقدم للعمل في هذه المؤسسة.',
        required: true,
        order: 14,
        options: [],
      },
      {
        id: 'emp-16',
        question_type: 'yes_no' as QuestionType,
        title: 'Do you have difficulty obtaining information to make better work decisions?',
        title_ar: 'هل تجد صعوبة في الحصول على المعلومات لاتخاذ قرارات أفضل في العمل؟',
        required: true,
        order: 15,
        options: [],
      },
      {
        id: 'emp-17',
        question_type: 'yes_no' as QuestionType,
        title: 'If something unusual happens, do you know who to go to for a solution?',
        title_ar: 'إذا حدث شيء غير عادي، فهل تعرف لمن تذهب لإيجاد حل؟',
        required: true,
        order: 16,
        options: [],
      },
      {
        id: 'emp-18',
        question_type: 'yes_no' as QuestionType,
        title: 'Do you receive constructive feedback from your manager?',
        title_ar: 'هل تتلقى ملاحظات بناءة من مديرك؟',
        required: true,
        order: 17,
        options: [],
      },
      {
        id: 'emp-19',
        question_type: 'yes_no' as QuestionType,
        title: 'Does your manager praise you when you do a good job?',
        title_ar: 'هل يثني عليك مديرك عندما تقوم بعمل جيد؟',
        required: true,
        order: 18,
        options: [],
      },
      {
        id: 'emp-20',
        question_type: 'open_text' as QuestionType,
        title: 'Do you have any problems you cannot solve? What are they?',
        title_ar: 'هل يوجد لديك مشكلة تواجهك ولا تستطيع حلها؟ ما هي؟',
        required: false,
        order: 19,
        options: [],
      },
      {
        id: 'emp-21',
        question_type: 'open_text' as QuestionType,
        title: 'Do you have any suggestions? What are they?',
        title_ar: 'هل يوجد لديك اقتراحات؟ ما هي؟',
        required: false,
        order: 20,
        options: [],
      },
    ],
  },
  {
    id: 'health-safety',
    name: 'Health & Safety Survey',
    name_ar: '   _',
    description: 'Assess workplace health and safety conditions and identify potential hazards',
    description_ar: '      _',
    category: 'employee',
    icon: 'HealthAndSafetyIcon',
    color: '#388e3c',
    questions: [
      {
        id: 'temp-31',
        question_type: 'yes_no' as QuestionType,
        title: 'I feel safe in my work environment',
        title_ar: '   _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-32',
        question_type: 'likert_5' as QuestionType,
        title: 'Safety procedures are clearly communicated',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-33',
        question_type: 'likert_5' as QuestionType,
        title: 'I have access to necessary safety equipment',
        title_ar: '   _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-34',
        question_type: 'single_choice' as QuestionType,
        title: 'How often do you participate in safety training?',
        title_ar: '   _',
        required: true,
        order: 3,
        options: [
          { id: 'opt-17', label: 'Monthly', label_ar: '', value: 'monthly', order: 0 },
          { id: 'opt-18', label: 'Quarterly', label_ar: '', value: 'quarterly', order: 1 },
          { id: 'opt-19', label: 'Annually', label_ar: '', value: 'annually', order: 2 },
          { id: 'opt-20', label: 'Never', label_ar: '', value: 'never', order: 3 },
        ],
      },
      {
        id: 'temp-35',
        question_type: 'open_text' as QuestionType,
        title: 'Describe any safety concerns you have',
        title_ar: '   _',
        required: false,
        order: 4,
        options: [],
      },
    ],
  },
  {
    id: 'service-quality',
    name: 'Service Quality Survey',
    name_ar: '  _',
    description: 'Evaluate the quality of services provided and identify improvement opportunities',
    description_ar: '     _',
    category: 'customer',
    icon: 'SupportIcon',
    color: '#7b1fa2',
    questions: [
      {
        id: 'temp-36',
        question_type: 'rating' as QuestionType,
        title: 'Rate the quality of service you received',
        title_ar: '   _',
        required: true,
        order: 0,
        options: [],
      },
      {
        id: 'temp-37',
        question_type: 'likert_5' as QuestionType,
        title: 'Staff was professional and courteous',
        title_ar: '  _',
        required: true,
        order: 1,
        options: [],
      },
      {
        id: 'temp-38',
        question_type: 'likert_5' as QuestionType,
        title: 'Service was delivered in a timely manner',
        title_ar: '  _',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'temp-39',
        question_type: 'dropdown' as QuestionType,
        title: 'How would you rate the value for money?',
        title_ar: '   _',
        required: true,
        order: 3,
        options: [
          { id: 'opt-21', label: 'Excellent', label_ar: '', value: 'excellent', order: 0 },
          { id: 'opt-22', label: 'Good', label_ar: '', value: 'good', order: 1 },
          { id: 'opt-23', label: 'Average', label_ar: '', value: 'average', order: 2 },
          { id: 'opt-24', label: 'Below Average', label_ar: ' ', value: 'below_average', order: 3 },
          { id: 'opt-25', label: 'Poor', label_ar: '', value: 'poor', order: 4 },
        ],
      },
      {
        id: 'temp-40',
        question_type: 'open_text' as QuestionType,
        title: 'How can we improve our service?',
        title_ar: '   _',
        required: false,
        order: 4,
        options: [],
      },
    ],
  },
];

// Template data interface
interface SurveyTemplateData {
  id: string;
  name: string;
  name_ar?: string;
  description: string;
  description_ar?: string;
  category: string;
  icon: string;
  color: string;
  questions: SurveyQuestion[];
}

// Icon mapping
const iconMap: Record<string, React.ReactElement> = {
  GroupsIcon: <GroupsIcon />,
  FeedbackIcon: <FeedbackIcon />,
  SchoolIcon: <SchoolIcon />,
  EventIcon: <EventIcon />,
  WorkIcon: <WorkIcon />,
  StarIcon: <StarIcon />,
  HealthAndSafetyIcon: <HealthAndSafetyIcon />,
  SupportIcon: <SupportIcon />,
  BusinessIcon: <BusinessIcon />,
  RestaurantIcon: <RestaurantIcon />,
  HotelIcon: <HotelIcon />,
};

const SurveyTemplatesPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<SurveyTemplateData | null>(null);
  const [creating, setCreating] = useState(false);

  const filteredTemplates = surveyTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.name_ar?.includes(searchQuery) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description_ar?.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: SurveyTemplateData) => {
    setCreating(true);
    try {
      const isArabic = i18n.language === 'ar';
      
      const surveyData = {
        title: (isArabic && template.name_ar) ? template.name_ar : template.name,
        title_ar: template.name_ar,
        description: (isArabic && template.description_ar) ? template.description_ar : template.description,
        description_ar: template.description_ar,
        status: 'draft' as const,
        questions: template.questions.map((q, index) => ({
          id: q.id || `temp-${index}`,
          question_text: (isArabic && q.title_ar) ? q.title_ar : q.title,
          help_text: '',
          question_type: q.question_type,
          is_required: q.required ?? false,
          order_index: index,
          options: q.options ? q.options.map(opt => ({
            ...opt,
            label: (isArabic && opt.label_ar) ? opt.label_ar : opt.label
          })) : [],
        })),
        settings: {
          welcome_message: '',
          thank_you_message: '',
          is_anonymous: true,
          allow_multiple: false,
          show_progress: true,
          shuffle_questions: false,
          require_all_questions: false,
          collect_email: false,
          email_required: false,
          max_responses: null,
          redirect_url: null,
          notify_on_response: false,
          notification_emails: null,
          company_name: '',
          show_company_name: true,
        },
        company_name: '',
        show_company_name: true,
      };

      const created = await createSurvey(surveyData);
      navigate(`/admin/surveys/${created.id}/edit`);
    } catch (error: any) {
      console.error('Failed to create survey from template:', error);
      // Show error notification but don't log out automatically
      // The error will be handled by the API interceptor which will show appropriate message
    } finally {
      setCreating(false);
    }
  };

  const getQuestionTypeLabel = (type: QuestionType): string => {
    const labels: Record<QuestionType, { en: string; ar: string }> = {
      likert_5: { en: 'Likert 5-Point', ar: ' 5 ' },
      likert_7: { en: 'Likert 7-Point', ar: ' 7 ' },
      open_text: { en: 'Open Text', ar: ' ' },
      open_text_long: { en: 'Long Text', ar: ' ' },
      single_choice: { en: 'Single Choice', ar: ' ' },
      multiple_choice: { en: 'Multiple Choice', ar: ' ' },
      dropdown: { en: 'Dropdown', ar: ' ' },
      rating: { en: 'Star Rating', ar: ' ' },
      yes_no: { en: 'Yes/No', ar: '/' },
      nps: { en: 'NPS Score', ar: ' NPS' },
      scale: { en: 'Custom Scale', ar: ' ' },
    };
    return labels[type]?.[lang] || type;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/admin/surveys')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          {lang === 'ar' ? ' ' : 'Survey Templates'}
        </Typography>
      </Box>

      {/* Search and Filters */}
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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={lang === 'ar' ? '  ...' : 'Search templates...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.label?.[lang] || category.label?.en || category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  color={selectedCategory === category.id ? 'primary' : 'default'}
                  variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Templates Grid */}
      <AnimatePresence>
        <Grid container spacing={3}>
          {filteredTemplates.map((template, index) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Icon and Category */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: alpha(template.color, 0.15),
                          color: template.color,
                        }}
                      >
                        {iconMap[template.icon] || <FeedbackIcon />}
                      </Box>
                      <Chip
                        label={template.category}
                        size="small"
                        sx={{
                          textTransform: 'capitalize',
                          backgroundColor: alpha(template.color, 0.1),
                          color: template.color,
                        }}
                      />
                    </Box>

                    {/* Title and Description */}
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {lang === 'ar' && template.name_ar ? template.name_ar : template.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, minHeight: 40 }}
                    >
                      {lang === 'ar' && template.description_ar
                        ? template.description_ar
                        : template.description}
                    </Typography>

                    {/* Question Count */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      <Badge badgeContent={template.questions.length} color="primary">
                        <AddIcon />
                      </Badge>
                      <Typography variant="caption">
                        {lang === 'ar' ? 'أسئلة' : 'questions'}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={lang === 'ar' ? 'معاينة' : 'Preview'}>
                        <IconButton
                          size="small"
                          onClick={() => setPreviewTemplate(template)}
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={() => handleUseTemplate(template)}
                        disabled={creating}
                        sx={{ borderRadius: 2 }}
                      >
                        {lang === 'ar' ? 'استخدام' : 'Use Template'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </AnimatePresence>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 8,
            color: theme.palette.text.secondary,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {lang === 'ar' ? '  ' : 'No templates found'}
          </Typography>
          <Typography variant="body2">
            {lang === 'ar' ? '   ' : 'Try adjusting your search or filters'}
          </Typography>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        maxWidth="md"
        fullWidth
      >
        {previewTemplate && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(previewTemplate.color, 0.15),
                    color: previewTemplate.color,
                  }}
                >
                  {iconMap[previewTemplate.icon] || <FeedbackIcon />}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {lang === 'ar' && previewTemplate.name_ar
                      ? previewTemplate.name_ar
                      : previewTemplate.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {previewTemplate.questions.length}{' '}
                    {lang === 'ar' ? '' : 'questions'}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {lang === 'ar' && previewTemplate.description_ar
                  ? previewTemplate.description_ar
                  : previewTemplate.description}
              </Typography>

              {previewTemplate.questions.map((question, index) => (
                <Paper
                  key={question.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Chip label={index + 1} size="small" sx={{ minWidth: 28 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {lang === 'ar' && question.title_ar ? question.title_ar : question.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getQuestionTypeLabel(question.question_type)}
                          size="small"
                          variant="outlined"
                        />
                        {question.required && (
                          <Typography variant="caption" color="error">
                            * {lang === 'ar' ? 'مطلوب' : 'Required'}
                          </Typography>
                        )}
                      </Box>
                      {question.options && question.options.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {question.options.map((opt) => (
                            <Typography
                              key={opt.id}
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', ml: 1 }}
                            >
                               {lang === 'ar' && opt.label_ar ? opt.label_ar : opt.label}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setPreviewTemplate(null)}>
                {lang === 'ar' ? 'إغلاق' : 'Cancel'}
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  handleUseTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                disabled={creating}
              >
                {lang === 'ar' ? 'استخدام هذا القالب' : 'Use This Template'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SurveyTemplatesPage;