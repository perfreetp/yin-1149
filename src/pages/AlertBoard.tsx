import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Phone, PhoneCall, Calendar, User, Clock, AlertCircle, CheckCircle, Eye, TrendingUp, ClipboardList } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useAppStore } from '@/store/useAppStore';
import { TASK_PRIORITY } from '@/types';
import { getDaysDiff, getRelativeDate, formatDateTime, getToday } from '@/utils/date';
import { RiskBadge } from '@/components/RiskBadge';
import type { Patient } from '@/types';

const AlertBoard: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    patients,
    getHighRiskPatients,
    getOverdueTasks,
    getLatestAssessment,
    getPatientTasks,
    getPatientAssessments,
    getNextFollowupTask,
    updatePatient,
    updateFollowupTask,
    addFollowupTask,
  } = useAppStore();
  
  const [selectedAlert, setSelectedAlert] = useState<{ type: string; patient: Patient } | null>(null);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [handleType, setHandleType] = useState<'call' | 'visit' | 'observe'>('call');
  const [handleNote, setHandleNote] = useState('');
  const [followupDate, setFollowupDate] = useState(getToday());
  
  const highRiskPatients = getHighRiskPatients();
  const overdueTasks = getOverdueTasks();
  const pendingAssessmentPatients = patients.filter(p => getPatientAssessments(p.id).length === 0);
  
  const highRiskWithData = highRiskPatients.map((patient) => {
    const latestAssessment = getLatestAssessment(patient.id);
    const tasks = getPatientTasks(patient.id);
    const overdueTask = tasks.find((t) => t.status === 'overdue' || t.status === 'pending');
    const nextTask = getNextFollowupTask(patient.id);
    const daysSinceLastAssessment = latestAssessment 
      ? getDaysDiff(new Date(latestAssessment.assessmentDate), new Date())
      : 0;
    
    return {
      patient,
      latestAssessment,
      overdueTask,
      nextTask,
      daysSinceLastAssessment,
    };
  }).sort((a, b) => {
    if (a.latestAssessment && b.latestAssessment) {
      return b.latestAssessment.totalScore - a.latestAssessment.totalScore;
    }
    return 0;
  });
  
  const stats = [
    { label: '高风险患者', value: highRiskPatients.length, color: 'danger', icon: AlertTriangle },
    { label: '待补录量表', value: pendingAssessmentPatients.length, color: 'warning', icon: ClipboardList },
    { label: '逾期任务', value: overdueTasks.length, color: 'warning', icon: Clock },
    { label: '需紧急处理', value: highRiskWithData.filter(p => p.latestAssessment && p.latestAssessment.totalScore >= 18).length, color: 'danger', icon: AlertCircle },
  ];
  
  const handleAlertAction = (type: 'call' | 'visit' | 'observe', patient: Patient) => {
    setSelectedAlert({ type, patient });
    setHandleType(type);
    setShowHandleModal(true);
  };
  
  const confirmHandle = () => {
    if (!selectedAlert) return;
    
    if (handleType === 'visit') {
      addFollowupTask({
        patientId: selectedAlert.patient.id,
        type: 'visit',
        scheduledDate: followupDate,
        status: 'pending',
        priority: 'urgent',
        conclusion: handleNote,
        assignedTo: '张医生',
        completedAt: '',
      });
    } else if (handleType === 'call') {
      addFollowupTask({
        patientId: selectedAlert.patient.id,
        type: 'phone',
        scheduledDate: getToday(),
        status: 'in_progress',
        priority: 'urgent',
        conclusion: handleNote,
        assignedTo: '张医生',
        completedAt: '',
      });
    } else if (handleType === 'observe') {
      updatePatient(selectedAlert.patient.id, {
        riskLevel: 'moderate',
      });
    }
    
    setShowHandleModal(false);
    setSelectedAlert(null);
    setHandleNote('');
  };
  
  return (
    <Layout 
      title="预警看板" 
      subtitle={`共 ${highRiskPatients.length} 位高风险患者需要关注，按优先级排序处理`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const colorClasses = {
              primary: 'bg-primary-50 text-primary-600 border-primary-200',
              danger: 'bg-danger-50 text-danger-600 border-danger-200',
              warning: 'bg-warning-50 text-warning-600 border-warning-200',
              success: 'bg-success-50 text-success-600 border-success-200',
            };
            const Icon = stat.icon;
            return (
              <div 
                key={stat.label}
                className={`p-5 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]} animate-fade-in-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 font-mono">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    stat.color === 'danger' ? 'bg-danger-100' :
                    stat.color === 'warning' ? 'bg-warning-100' :
                    stat.color === 'primary' ? 'bg-primary-100' : 'bg-success-100'
                  }`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {pendingAssessmentPatients.length > 0 && (
          <Card className="animate-fade-in-up border-warning-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="text-warning-500" size={20} />
                  待补录 PSQI 量表
                </CardTitle>
                <Badge variant="warning" size="sm">
                  {pendingAssessmentPatients.length} 位患者
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-neutral-500 mb-4">
                以下患者已建档但尚未完成 PSQI 量表评估，请安排护士尽快补录，补录后提醒将自动消失。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingAssessmentPatients.map((patient, index) => (
                  <div 
                    key={patient.id}
                    className="p-4 bg-warning-50 border border-warning-200 rounded-lg hover:bg-warning-100 transition-colors cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/assessment/${patient.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center">
                        <User className="text-warning-500" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-700">{patient.name}</p>
                        <p className="text-xs text-neutral-500">
                          {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · {patient.medicalRecordNo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>建档：{patient.firstVisitDate}</span>
                      <Button 
                        size="xs"
                        variant="primary"
                        leftIcon={<ClipboardList size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assessment/${patient.id}`);
                        }}
                      >
                        去补录
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-700 flex items-center gap-2">
                <AlertTriangle className="text-danger-500" size={20} />
                高风险患者预警
              </h3>
              <Badge variant="danger" size="sm">
                PSQI ≥ 15 分
              </Badge>
            </div>
            
            {highRiskWithData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
                <CheckCircle className="mx-auto text-success-400 mb-4" size={48} />
                <p className="text-neutral-500">暂无高风险患者，继续保持！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {highRiskWithData.map((item, index) => {
                  const { patient, latestAssessment, nextTask, daysSinceLastAssessment } = item;
                  const isVeryHighRisk = latestAssessment && latestAssessment.totalScore >= 18;
                  
                  return (
                    <Card 
                      key={patient.id}
                      className={`animate-fade-in-up ${
                        isVeryHighRisk 
                          ? 'border-danger-400 bg-gradient-to-r from-danger-50 to-white animate-pulse-soft' 
                          : 'border-warning-300 bg-gradient-to-r from-warning-50 to-white'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardBody>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                              isVeryHighRisk ? 'bg-danger-500' : 'bg-warning-500'
                            }`}>
                              <User className="text-white" size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-bold text-lg text-neutral-700">{patient.name}</h4>
                                {latestAssessment && (
                                  <RiskBadge score={latestAssessment.totalScore} size="sm" />
                                )}
                                {isVeryHighRisk && (
                                  <Badge variant="danger" size="sm" className="animate-pulse">
                                    紧急
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-500 mb-2">
                                {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · {patient.medicalRecordNo}
                              </p>
                              <p className="text-sm text-neutral-600">
                                <span className="text-neutral-500">主诉：</span>{patient.chiefComplaint}
                              </p>
                            </div>
                          </div>
                          
                          {latestAssessment && (
                            <div className="text-right">
                              <p className="text-xs text-neutral-500 mb-1">PSQI 评分</p>
                              <p className={`text-3xl font-bold font-mono ${
                                isVeryHighRisk ? 'text-danger-600' : 'text-warning-600'
                              }`}>
                                {latestAssessment.totalScore}
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">
                                {daysSinceLastAssessment} 天前评估
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                          <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={14} />
                              初诊：{patient.firstVisitDate}
                            </span>
                            {nextTask ? (
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                下次随访：{nextTask.scheduledDate}（{getRelativeDate(nextTask.scheduledDate)}）
                                <Badge 
                                  size="xs" 
                                  variant={nextTask.status === 'overdue' ? 'danger' : nextTask.status === 'in_progress' ? 'primary' : 'neutral'}
                                >
                                  {nextTask.status === 'pending' ? '待随访' : nextTask.status === 'in_progress' ? '进行中' : '已逾期'}
                                </Badge>
                                <Badge size="xs" variant="neutral">
                                  {nextTask.type === 'phone' ? '电话' : nextTask.type === 'sms' ? '短信' : '门诊'}
                                </Badge>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-warning-600">
                                <AlertCircle size={14} />
                                暂未安排随访，建议：{isVeryHighRisk ? '立即复诊' : '尽快随访'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              leftIcon={<Eye size={14} />}
                              onClick={() => navigate(`/assessment/${patient.id}`)}
                            >
                              查看详情
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              leftIcon={<PhoneCall size={14} />}
                              onClick={() => handleAlertAction('call', patient)}
                            >
                              电话联系
                            </Button>
                            <Button 
                              size="sm" 
                              variant={isVeryHighRisk ? 'danger' : 'primary'}
                              leftIcon={<Calendar size={14} />}
                              onClick={() => handleAlertAction('visit', patient)}
                            >
                              加号复诊
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-700 flex items-center gap-2">
              <Clock className="text-warning-500" size={20} />
              逾期任务提醒
            </h3>
            
            {overdueTasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <CheckCircle className="mx-auto text-success-400 mb-3" size={40} />
                <p className="text-neutral-500 text-sm">暂无逾期任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueTasks.slice(0, 8).map((task, index) => {
                  const patient = patients.find(p => p.id === task.patientId);
                  const latestAssessment = patient ? getLatestAssessment(patient.id) : null;
                  const overdueDays = getDaysDiff(new Date(task.scheduledDate), new Date());
                  const priorityConfig = TASK_PRIORITY[task.priority];
                  
                  return (
                    <Card 
                      key={task.id}
                      className="animate-fade-in-up border-warning-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {latestAssessment && (
                              <RiskBadge score={latestAssessment.totalScore} showLabel={false} size="sm" />
                            )}
                            <span className="font-medium text-neutral-700 text-sm">
                              {patient?.name || '未知患者'}
                            </span>
                          </div>
                          <Badge variant="danger" size="sm">
                            逾期 {Math.abs(overdueDays)} 天
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mb-3">
                          {task.type === 'phone' ? '电话随访' : task.type === 'sms' ? '短信提醒' : '门诊复诊'}
                          {' · '}原计划：{task.scheduledDate}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="xs" 
                            variant="ghost"
                            onClick={() => navigate(`/assessment/${task.patientId}`)}
                          >
                            查看
                          </Button>
                          <Button 
                            size="xs" 
                            variant="primary"
                            leftIcon={<Phone size={12} />}
                            onClick={() => {
                              updateFollowupTask(task.id, { status: 'in_progress', assignedTo: '张医生' });
                              navigate('/followup');
                            }}
                          >
                            处理
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
            
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">快速操作指引</h4>
              <ul className="space-y-2 text-xs text-neutral-600">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-danger-500 flex-shrink-0 mt-0.5" />
                  <span>PSQI ≥ 18 分：立即电话联系，建议加号复诊</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-warning-500 flex-shrink-0 mt-0.5" />
                  <span>PSQI 15-17 分：24小时内电话随访，密切观察</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary-500 flex-shrink-0 mt-0.5" />
                  <span>逾期任务：优先处理，2小时内必须联系</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-success-500 flex-shrink-0 mt-0.5" />
                  <span>症状改善明显：可延长随访间隔至1个月</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={showHandleModal}
        onClose={() => setShowHandleModal(false)}
        title={
          handleType === 'call' ? '电话联系患者' :
          handleType === 'visit' ? '安排加号复诊' : '标记观察'
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowHandleModal(false)}>取消</Button>
            <Button onClick={confirmHandle}>
              {handleType === 'call' ? '开始电话随访' :
               handleType === 'visit' ? '确认安排' : '确认标记'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {selectedAlert && (
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm font-medium text-neutral-700">
                患者：<span className="text-primary-600">{selectedAlert.patient.name}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {selectedAlert.patient.gender === 'male' ? '男' : '女'} · {selectedAlert.patient.age}岁 · {selectedAlert.patient.chiefComplaint}
              </p>
            </div>
          )}
          
          {handleType === 'visit' && (
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">复诊日期</label>
              <input
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
            </div>
          )}
          
          <Textarea
            label="处理备注"
            placeholder={
              handleType === 'call' ? '请记录电话沟通内容...' :
              handleType === 'visit' ? '请记录复诊安排说明...' :
              '请记录观察原因和后续计划...'
            }
            value={handleNote}
            onChange={(e) => setHandleNote(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default AlertBoard;
