import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Calendar, Clock, FileText, Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/RiskBadge';
import type { Patient } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { getRelativeDate } from '@/utils/date';
import { TASK_STATUS, TASK_PRIORITY } from '@/types';

interface PatientCardProps {
  patient: Patient;
  index: number;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, index }) => {
  const navigate = useNavigate();
  const getLatestAssessment = useAppStore((state) => state.getLatestAssessment);
  const getPatientAssessments = useAppStore((state) => state.getPatientAssessments);
  const getNextFollowupTask = useAppStore((state) => state.getNextFollowupTask);
  
  const latestAssessment = getLatestAssessment(patient.id);
  const assessments = getPatientAssessments(patient.id);
  const nextTask = getNextFollowupTask(patient.id);
  const hasNoAssessment = assessments.length === 0;
  
  const taskStatusConfig = nextTask ? TASK_STATUS[nextTask.status] : null;
  const taskPriorityConfig = nextTask ? TASK_PRIORITY[nextTask.priority] : null;
  
  const animationDelay = `${index * 50}ms`;
  
  return (
    <Card 
      hoverable 
      className={`animate-fade-in-up ${hasNoAssessment ? 'border-warning-300' : ''}`}
      style={{ animationDelay }}
      onClick={() => navigate(`/assessment/${patient.id}`)}
    >
      <CardBody>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              <User className="text-primary-500" size={22} />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-700">{patient.name}</h4>
              <p className="text-sm text-neutral-500">
                {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · {patient.medicalRecordNo}
              </p>
            </div>
          </div>
          {latestAssessment ? (
            <RiskBadge score={latestAssessment.totalScore} />
          ) : (
            <Badge variant="warning" size="sm" className="animate-pulse-soft">
              <AlertTriangle size={12} className="mr-1" />
              待评估
            </Badge>
          )}
        </div>
        
        {hasNoAssessment && (
          <div 
            className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg cursor-pointer hover:bg-warning-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assessment/${patient.id}`);
            }}
          >
            <div className="flex items-center gap-2 text-sm text-warning-700">
              <ClipboardList size={16} className="flex-shrink-0" />
              <span className="font-medium">PSQI 量表未完成</span>
            </div>
            <p className="text-xs text-warning-600 mt-1 ml-6">
              该患者建档后尚未进行 PSQI 评估，请尽快补录
            </p>
          </div>
        )}
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Phone size={14} className="text-neutral-400" />
            <span>{patient.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Calendar size={14} className="text-neutral-400" />
            <span>初诊：{patient.firstVisitDate}</span>
          </div>
          {nextTask && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Clock size={14} className="text-neutral-400" />
              <span>下次随访：{getRelativeDate(nextTask.scheduledDate)}</span>
              {taskStatusConfig && (
                <Badge variant={taskStatusConfig.color === 'neutral' ? 'neutral' : taskStatusConfig.color as 'success' | 'warning' | 'danger' | 'primary'} size="sm">
                  {taskStatusConfig.label}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-1.5">
            <FileText size={14} />
            <span>主诉</span>
          </div>
          <p className="text-sm text-neutral-600 line-clamp-2">{patient.chiefComplaint}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {taskPriorityConfig && nextTask && (
              <Badge variant={taskPriorityConfig.color === 'neutral' ? 'neutral' : taskPriorityConfig.color as 'success' | 'warning' | 'danger' | 'primary'} size="sm">
                优先级：{taskPriorityConfig.label}
              </Badge>
            )}
          </div>
          <Button 
            size="sm" 
            variant={hasNoAssessment ? 'primary' : 'outline'}
            leftIcon={<Plus size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assessment/${patient.id}`);
            }}
          >
            {hasNoAssessment ? '补录评估' : '录入评估'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
