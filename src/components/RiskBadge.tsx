import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { RISK_LEVELS } from '@/types';

interface RiskBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, showLabel = true, size = 'md' }) => {
  let level: keyof typeof RISK_LEVELS = 'mild';
  if (score > RISK_LEVELS.moderate.max) level = 'severe';
  else if (score > RISK_LEVELS.mild.max) level = 'moderate';
  
  const config = RISK_LEVELS[level];
  
  const variantMap = {
    success: 'success' as const,
    warning: 'warning' as const,
    danger: 'danger' as const,
  };
  
  return (
    <Badge variant={variantMap[config.color as keyof typeof variantMap]} size={size}>
      {showLabel && config.label}
      <span className="ml-1 font-mono font-bold">{score}</span>
    </Badge>
  );
};
