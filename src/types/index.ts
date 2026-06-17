export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  phone: string;
  medicalRecordNo: string;
  firstVisitDate: string;
  chiefComplaint: string;
  medicalHistory: string;
  medicationHistory: string;
  riskLevel: 'mild' | 'moderate' | 'severe';
  createdAt: string;
  updatedAt: string;
}

export interface PSQIAssessment {
  id: string;
  patientId: string;
  sleepQuality: number;
  sleepLatency: number;
  sleepDuration: number;
  sleepEfficiency: number;
  sleepDisturbance: number;
  hypnoticUse: number;
  daytimeDysfunction: number;
  totalScore: number;
  assessmentType: 'initial' | 'followup';
  notes: string;
  assessmentDate: string;
  createdAt: string;
}

export interface FollowupTask {
  id: string;
  patientId: string;
  type: 'phone' | 'sms' | 'visit';
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conclusion: string;
  assignedTo: string;
  createdAt: string;
  completedAt: string;
}

export interface Intervention {
  id: string;
  patientId: string;
  type: 'medication' | 'non_medication';
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface ContactRecord {
  id: string;
  patientId: string;
  followupTaskId: string;
  type: 'phone' | 'sms' | 'visit';
  content: string;
  result: 'success' | 'failed' | 'no_answer';
  operator: string;
  contactTime: string;
}

export const PSQI_COMPONENTS = {
  sleepQuality: { max: 3, label: '睡眠质量', description: '近1个月，您认为自己的睡眠质量如何？' },
  sleepLatency: { max: 3, label: '入睡时间', description: '近1个月，您从上床到入睡通常需要多少分钟？' },
  sleepDuration: { max: 3, label: '睡眠时间', description: '近1个月，您每天实际睡眠时间约为多少小时？' },
  sleepEfficiency: { max: 3, label: '睡眠效率', description: '近1个月，您的睡眠效率（睡眠时间/床上时间×100%）约为多少？' },
  sleepDisturbance: { max: 3, label: '睡眠障碍', description: '近1个月，您因各种原因夜间醒来的频率如何？' },
  hypnoticUse: { max: 3, label: '催眠药物', description: '近1个月，您使用催眠药物的频率如何？' },
  daytimeDysfunction: { max: 3, label: '日间功能障碍', description: '近1个月，您白天困倦、精力不足的频率如何？' },
} as const;

export const RISK_LEVELS = {
  mild: { min: 0, max: 7, label: '轻度', color: 'success' },
  moderate: { min: 8, max: 14, label: '中度', color: 'warning' },
  severe: { min: 15, max: 21, label: '重度', color: 'danger' },
} as const;

export const PSQI_OPTIONS = {
  sleepQuality: [
    { value: 0, label: '很好（0分）' },
    { value: 1, label: '较好（1分）' },
    { value: 2, label: '较差（2分）' },
    { value: 3, label: '很差（3分）' },
  ],
  sleepLatency: [
    { value: 0, label: '≤15分钟（0分）' },
    { value: 1, label: '16-30分钟（1分）' },
    { value: 2, label: '31-60分钟（2分）' },
    { value: 3, label: '>60分钟（3分）' },
  ],
  sleepDuration: [
    { value: 0, label: '≥7小时（0分）' },
    { value: 1, label: '6-6.9小时（1分）' },
    { value: 2, label: '5-5.9小时（2分）' },
    { value: 3, label: '<5小时（3分）' },
  ],
  sleepEfficiency: [
    { value: 0, label: '≥85%（0分）' },
    { value: 1, label: '75-84%（1分）' },
    { value: 2, label: '65-74%（2分）' },
    { value: 3, label: '<65%（3分）' },
  ],
  sleepDisturbance: [
    { value: 0, label: '无（0分）' },
    { value: 1, label: '<1次/周（1分）' },
    { value: 2, label: '1-2次/周（2分）' },
    { value: 3, label: '≥3次/周（3分）' },
  ],
  hypnoticUse: [
    { value: 0, label: '无（0分）' },
    { value: 1, label: '<1次/周（1分）' },
    { value: 2, label: '1-2次/周（2分）' },
    { value: 3, label: '≥3次/周（3分）' },
  ],
  daytimeDysfunction: [
    { value: 0, label: '无（0分）' },
    { value: 1, label: '<1次/周（1分）' },
    { value: 2, label: '1-2次/周（2分）' },
    { value: 3, label: '≥3次/周（3分）' },
  ],
} as const;

export const TASK_STATUS = {
  pending: { label: '待随访', color: 'neutral' },
  in_progress: { label: '进行中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  overdue: { label: '已逾期', color: 'danger' },
} as const;

export const TASK_PRIORITY = {
  low: { label: '低', color: 'success' },
  medium: { label: '中', color: 'neutral' },
  high: { label: '高', color: 'warning' },
  urgent: { label: '紧急', color: 'danger' },
} as const;

export const TASK_TYPE = {
  phone: { label: '电话随访', icon: 'Phone' },
  sms: { label: '短信提醒', icon: 'MessageSquare' },
  visit: { label: '门诊复诊', icon: 'Stethoscope' },
} as const;
