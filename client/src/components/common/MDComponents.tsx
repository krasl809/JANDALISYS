import { Box, Typography, BoxProps, TypographyProps, styled } from '@mui/material';

interface MDBoxProps extends BoxProps {
  variant?: 'contained' | 'gradient';
  bgColor?: string;
  color?: string;
  opacity?: number;
  borderRadius?: string | number;
  shadow?: string;
  coloredShadow?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'light' | 'dark' | 'none';
}

export const MDBox = styled(Box, {
  shouldForwardProp: (prop) => !['variant', 'bgColor', 'color', 'opacity', 'borderRadius', 'shadow', 'coloredShadow'].includes(prop as string),
})<MDBoxProps>(({ theme, variant, bgColor, color, opacity, borderRadius, shadow, coloredShadow }) => {
  const { palette, functions, boxShadows }: any = theme;

  const validGradients = ['primary', 'secondary', 'info', 'success', 'warning', 'error', 'dark', 'light'];

  let backgroundValue = bgColor;

  if (variant === 'gradient' && bgColor && validGradients.includes(bgColor) && palette.gradients && palette.gradients[bgColor]) {
    backgroundValue = functions.linearGradient(palette.gradients[bgColor].main, palette.gradients[bgColor].state);
  } else if (bgColor && palette[bgColor] && palette[bgColor].main) {
    backgroundValue = palette[bgColor].main;
  }

  let colorValue = color;
  if (color && palette[color]) {
    colorValue = palette[color].main;
  } else if (color === 'white') {
    colorValue = '#ffffff';
  }

  let shadowValue = shadow;
  if (coloredShadow && coloredShadow !== 'none' && boxShadows.colored[coloredShadow]) {
    shadowValue = boxShadows.colored[coloredShadow];
  } else if (shadow && boxShadows[shadow]) {
    shadowValue = boxShadows[shadow];
  }

  return {
    background: backgroundValue,
    color: colorValue,
    opacity,
    borderRadius: borderRadius || 'none',
    boxShadow: shadowValue || 'none',
  };
});

interface MDTypographyProps extends TypographyProps {
  fontWeight?: 'light' | 'regular' | 'medium' | 'bold';
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  verticalAlign?: 'unset' | 'baseline' | 'sub' | 'super' | 'text-top' | 'text-bottom' | 'middle' | 'top' | 'bottom';
  textGradient?: boolean;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'text' | 'white' | 'dark';
  opacity?: number;
}

export const MDTypography = styled(Typography)<MDTypographyProps>(({ theme, fontWeight, textTransform, verticalAlign, textGradient, color, opacity }) => {
  const { palette, typography, functions }: any = theme;

  const fontWeightValue = fontWeight ? typography[`fontWeight${fontWeight.charAt(0).toUpperCase() + fontWeight.slice(1)}`] : 'inherit';

  return {
    fontWeight: fontWeightValue,
    textTransform: textTransform || 'none',
    verticalAlign: verticalAlign || 'unset',
    display: 'inline-block',
    color: color === 'white' ? '#ffffff' : (color && palette[color] && palette[color].main ? palette[color].main : 'inherit'),
    opacity: opacity || 1,
    ...(textGradient && palette.gradients && palette.gradients.primary && {
      backgroundImage: functions.linearGradient(palette.gradients.primary.main, palette.gradients.primary.state),
      display: 'inline-block',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      position: 'relative',
      zIndex: 1,
    }),
  };
});
