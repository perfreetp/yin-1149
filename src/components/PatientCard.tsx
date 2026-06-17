import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Calendar, Clock, FileText, Plus } from 'lucide-react';
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
  const getPatientTasks = useAppStore((state) => state.getPatientTasks);
  
  const latestAssessment = getLatestAssessment(patient.id);
  const tasks = getPatientTasks(patient.id);
  const nextTask = tasks.find((t) => t.status === 'pending' || t.status === 'in_progress');
  
  const taskStatusConfig = nextTask ? TASK_STATUS[nextTask.status] : null;
  const taskPriorityConfig = nextTask ? TASK_PRIORITY[nextTask.priority] : null;
  
  const animationDelay = `${index * 50}ms`;
  
  return (
    <Card 
      hoverable 
      className="animate-fade-in-up"
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
          {latestAssessment && (
            <RiskBadge score={latestAssessment.totalScore} />
          )}
        </div>
        
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
            variant="outline"
            leftIcon={<Plus size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assessment/${patient.id}`);
            }}
          >
            录入评估
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
