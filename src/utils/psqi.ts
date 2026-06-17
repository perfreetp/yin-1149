import { PSQIAssessment } from '@/types';
import { RISK_LEVELS } from '@/types';

export function calculatePSQITotal(scores: Omit<PSQIAssessment, 'id' | 'patientId' | 'totalScore' | 'assessmentType' | 'notes' | 'assessmentDate' | 'createdAt'>): number {
  return Object.values(scores).reduce((sum, score) => sum + score, 0);
}

export function getRiskLevel(totalScore: number): 'mild' | 'moderate' | 'severe' {
  if (totalScore <= RISK_LEVELS.mild.max) return 'mild';
  if (totalScore <= RISK_LEVELS.moderate.max) return 'moderate';
  return 'severe';
}

export function getRiskLevelLabel(totalScore: number): string {
  return RISK_LEVELS[getRiskLevel(totalScore)].label;
}

export function getFollowupInterval(riskLevel: 'mild' | 'moderate' | 'severe'): number {
  switch (riskLevel) {
    case 'mild': return 30;
    case 'moderate': return 14;
    case 'severe': return 7;
  }
}

export function getSuggestedFollowupDate(assessmentDate: string, totalScore: number): string {
  const riskLevel = getRiskLevel(totalScore);
  const interval = getFollowupInterval(riskLevel);
  const date = new Date(assessmentDate);
  date.setDate(date.getDate() + interval);
  return date.toISOString().split('T')[0];
}

export function getScoreInterpretation(totalScore: number): string {
  if (totalScore <= 5) return '睡眠质量良好，无明显睡眠问题';
  if (totalScore <= 7) return '轻度睡眠问题，建议保持良好作息习惯';
  if (totalScore <= 10) return '中度睡眠问题，建议进行干预治疗';
  if (totalScore <= 14) return '中度偏重睡眠问题，需要密切关注';
  if (totalScore <= 18) return '重度睡眠问题，建议尽快安排复诊';
  return '严重睡眠问题，需要立即干预';
}

export function generateFollowupTask(
  patientId: string,
  assessment: PSQIAssessment
): {
  patientId: string;
  type: 'phone' | 'sms' | 'visit';
  scheduledDate: string;
  status: 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conclusion: '';
  assignedTo: '';
} {
  const riskLevel = getRiskLevel(assessment.totalScore);
  const interval = getFollowupInterval(riskLevel);
  const scheduledDate = new Date(assessment.assessmentDate);
  scheduledDate.setDate(scheduledDate.getDate() + interval);
  
  return {
    patientId,
    type: riskLevel === 'severe' ? 'phone' : 'sms',
    scheduledDate: scheduledDate.toISOString().split('T')[0],
    status: 'pending',
    priority: riskLevel === 'severe' ? 'urgent' : riskLevel === 'moderate' ? 'high' : 'medium',
    conclusion: '',
    assignedTo: '',
  };
}
