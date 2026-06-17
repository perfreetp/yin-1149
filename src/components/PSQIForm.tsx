import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { PSQI_COMPONENTS, PSQI_OPTIONS } from '@/types';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { calculatePSQITotal, getRiskLevel, getScoreInterpretation, getSuggestedFollowupDate } from '@/utils/psqi';
import { getToday } from '@/utils/date';
import type { PSQIAssessment } from '@/types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface PSQIFormRef {
  submit: () => void;
  getTotalScore: () => number;
}

interface PSQIFormProps {
  patientId: string;
  formId?: string;
  onSubmit: (data: Omit<PSQIAssessment, 'id' | 'createdAt'>) => void;
  initialData?: Partial<PSQIAssessment>;
}

export const PSQIForm = forwardRef<PSQIFormRef, PSQIFormProps>(({ patientId, formId = 'psqi-form', onSubmit, initialData }, ref) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    sleepQuality: initialData?.sleepQuality ?? 0,
    sleepLatency: initialData?.sleepLatency ?? 0,
    sleepDuration: initialData?.sleepDuration ?? 0,
    sleepEfficiency: initialData?.sleepEfficiency ?? 0,
    sleepDisturbance: initialData?.sleepDisturbance ?? 0,
    hypnoticUse: initialData?.hypnoticUse ?? 0,
    daytimeDysfunction: initialData?.daytimeDysfunction ?? 0,
    notes: initialData?.notes ?? '',
    assessmentType: initialData?.assessmentType ?? 'followup' as const,
    assessmentDate: initialData?.assessmentDate ?? getToday(),
  });
  
  const [totalScore, setTotalScore] = useState(0);

  useImperativeHandle(ref, () => ({
    submit: () => {
      formRef.current?.requestSubmit();
    },
    getTotalScore: () => totalScore,
  }));
  
  useEffect(() => {
    const scores = {
      sleepQuality: formData.sleepQuality,
      sleepLatency: formData.sleepLatency,
      sleepDuration: formData.sleepDuration,
      sleepEfficiency: formData.sleepEfficiency,
      sleepDisturbance: formData.sleepDisturbance,
      hypnoticUse: formData.hypnoticUse,
      daytimeDysfunction: formData.daytimeDysfunction,
    };
    setTotalScore(calculatePSQITotal(scores));
  }, [formData]);
  
  const handleChange = (field: keyof typeof formData, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientId,
      sleepQuality: formData.sleepQuality,
      sleepLatency: formData.sleepLatency,
      sleepDuration: formData.sleepDuration,
      sleepEfficiency: formData.sleepEfficiency,
      sleepDisturbance: formData.sleepDisturbance,
      hypnoticUse: formData.hypnoticUse,
      daytimeDysfunction: formData.daytimeDysfunction,
      totalScore,
      notes: formData.notes,
      assessmentType: formData.assessmentType,
      assessmentDate: formData.assessmentDate,
    });
  };
  
  const riskLevel = getRiskLevel(totalScore);
  const riskColors = {
    mild: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200', icon: CheckCircle2 },
    moderate: { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-200', icon: AlertCircle },
    severe: { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-200', icon: AlertCircle },
  };
  const riskConfig = riskColors[riskLevel];
  const RiskIcon = riskConfig.icon;
  
  const componentEntries = Object.entries(PSQI_COMPONENTS) as [keyof typeof PSQI_COMPONENTS, typeof PSQI_COMPONENTS[keyof typeof PSQI_COMPONENTS]][];
  
  return (
    <form ref={formRef} id={formId} onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {componentEntries.map(([key, component]) => (
          <div key={key} className="bg-white p-5 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-neutral-700">{component.label}</label>
              <Badge variant="neutral" size="sm">
                得分: <span className="font-mono font-bold ml-1">{formData[key]}</span>
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{component.description}</p>
            <Select
              options={PSQI_OPTIONS[key].map((opt) => ({ value: opt.value, label: opt.label }))}
              value={formData[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value))}
            />
          </div>
        ))}
      </div>
      
      <div className={`p-6 rounded-xl border-2 ${riskConfig.bg} ${riskConfig.border} transition-all duration-300`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${riskConfig.bg}`}>
            <RiskIcon className={riskConfig.text} size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-4xl font-bold font-mono ${riskConfig.text}`}>{totalScore}</span>
              <span className="text-neutral-500">/ 21</span>
              <Badge variant={riskLevel === 'mild' ? 'success' : riskLevel === 'moderate' ? 'warning' : 'danger'} size="md">
                {riskLevel === 'mild' ? '轻度' : riskLevel === 'moderate' ? '中度' : '重度'}
              </Badge>
            </div>
            <p className={`text-sm ${riskConfig.text}`}>
              {getScoreInterpretation(totalScore)}
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              建议复诊时间：{getSuggestedFollowupDate(formData.assessmentDate, totalScore)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="评估类型"
          options={[
            { value: 'initial', label: '初诊评估' },
            { value: 'followup', label: '复诊评估' },
          ]}
          value={formData.assessmentType}
          onChange={(e) => handleChange('assessmentType', e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1.5">评估日期</label>
          <input
            type="date"
            value={formData.assessmentDate}
            onChange={(e) => handleChange('assessmentDate', e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>
      </div>
      
      <Textarea
        label="医生备注"
        placeholder="请输入患者主诉、症状描述、干预建议等备注信息..."
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={4}
      />
    </form>
  );
});

PSQIForm.displayName = 'PSQIForm';
