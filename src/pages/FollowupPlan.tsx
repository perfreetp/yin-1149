import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, Stethoscope, Clock, User, CheckCircle, XCircle, AlertCircle, PhoneCall, Send, Plus, Save, Calendar, FileText, CheckSquare, Square, CalendarClock, Users } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/store/useAppStore';
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE, RISK_LEVELS } from '@/types';
import type { FollowupTask, ContactRecord, Patient } from '@/types';
import { formatDate, formatDateTime, getRelativeDate, getToday, addDays } from '@/utils/date';
import { generateFollowupTask } from '@/utils/psqi';
import { RiskBadge } from '@/components/RiskBadge';

const FollowupPlan: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    followupTasks,
    patients,
    getFilteredTasks,
    filterTaskStatus,
    setFilterTaskStatus,
    getPatientById,
    getLatestAssessment,
    updateFollowupTask,
    addFollowupTask,
    addContactRecord,
    getPatientContactRecords,
    getHighRiskPatients,
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [selectedTask, setSelectedTask] = useState<FollowupTask | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showBatchRescheduleModal, setShowBatchRescheduleModal] = useState(false);
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [contactResult, setContactResult] = useState<'success' | 'failed' | 'no_answer'>('success');
  const [contactContent, setContactContent] = useState('');
  const [taskConclusion, setTaskConclusion] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchRescheduleDate, setBatchRescheduleDate] = useState(getToday());
  const [batchCreateRiskLevel, setBatchCreateRiskLevel] = useState<'moderate' | 'severe' | 'both'>('both');
  const [batchCreateType, setBatchCreateType] = useState<'phone' | 'sms'>('phone');
  const [batchCreateDate, setBatchCreateDate] = useState(getToday());
  
  const filteredTasks = getFilteredTasks();
  
  const displayedTasks = filteredTasks.filter((task) => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });
  
  const incompleteTasks = useMemo(() => {
    return displayedTasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue');
  }, [displayedTasks]);

  const selectableTasks = useMemo(() => {
    return displayedTasks.filter(t => t.status !== 'completed');
  }, [displayedTasks]);

  const allSelectableSelected = selectableTasks.length > 0 && selectableTasks.every(t => selectedTaskIds.has(t.id));
  const someSelected = selectedTaskIds.size > 0;

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(selectableTasks.map(t => t.id)));
    }
  };
  
  const tabs = [
    { key: 'all', label: '全部', count: filteredTasks.length },
    { key: 'pending', label: '待随访', count: filteredTasks.filter(t => t.status === 'pending').length },
    { key: 'in_progress', label: '进行中', count: filteredTasks.filter(t => t.status === 'in_progress').length },
    { key: 'completed', label: '已完成', count: filteredTasks.filter(t => t.status === 'completed').length },
    { key: 'overdue', label: '已逾期', count: filteredTasks.filter(t => t.status === 'overdue').length },
  ];
  
  const handleStartTask = (task: FollowupTask) => {
    updateFollowupTask(task.id, { status: 'in_progress', assignedTo: '张医生' });
  };

  const handleBatchReschedule = () => {
    selectedTaskIds.forEach(id => {
      updateFollowupTask(id, { scheduledDate: batchRescheduleDate, status: 'pending' });
    });
    setSelectedTaskIds(new Set());
    setShowBatchRescheduleModal(false);
    setBatchRescheduleDate(getToday());
  };

  const handleBatchCreatePhoneFollowups = () => {
    const targetPatients = patients.filter((p: Patient) => {
      if (batchCreateRiskLevel === 'both') return p.riskLevel === 'moderate' || p.riskLevel === 'severe';
      return p.riskLevel === batchCreateRiskLevel;
    });

    let created = 0;
    targetPatients.forEach((p: Patient) => {
      const hasPending = followupTasks.some(t => 
        t.patientId === p.id && (t.status === 'pending' || t.status === 'in_progress')
      );
      if (hasPending) return;

      const latest = getLatestAssessment(p.id);
      const priority = p.riskLevel === 'severe' ? 'urgent' : 'high';
      addFollowupTask({
        patientId: p.id,
        type: batchCreateType,
        scheduledDate: batchCreateDate,
        status: 'pending',
        priority,
        conclusion: '',
        assignedTo: '',
        completedAt: '',
      });
      created++;
    });

    setShowBatchCreateModal(false);
    setBatchCreateRiskLevel('both');
    setBatchCreateType('phone');
    setBatchCreateDate(getToday());
  };
  
  const handleCompleteTask = () => {
    if (!selectedTask) return;
    
    updateFollowupTask(selectedTask.id, { 
      status: 'completed', 
      completedAt: formatDateTime(new Date()),
      conclusion: taskConclusion,
    });
    
    addContactRecord({
      patientId: selectedTask.patientId,
      followupTaskId: selectedTask.id,
      type: selectedTask.type,
      content: contactContent,
      result: contactResult,
      operator: '张医生',
      contactTime: formatDateTime(new Date()),
    });
    
    setShowContactModal(false);
    setSelectedTask(null);
    setContactContent('');
    setTaskConclusion('');
  };
  
  const getTaskIcon = (type: FollowupTask['type']) => {
    switch (type) {
      case 'phone': return <Phone size={18} />;
      case 'sms': return <MessageSquare size={18} />;
      case 'visit': return <Stethoscope size={18} />;
    }
  };
  
  const stats = [
    { label: '待随访', value: filteredTasks.filter(t => t.status === 'pending').length, color: 'warning' },
    { label: '进行中', value: filteredTasks.filter(t => t.status === 'in_progress').length, color: 'primary' },
    { label: '已完成', value: filteredTasks.filter(t => t.status === 'completed').length, color: 'success' },
    { label: '已逾期', value: filteredTasks.filter(t => t.status === 'overdue').length, color: 'danger' },
  ];
  
  return (
    <Layout 
      title="随访计划" 
      subtitle={`共 ${displayedTasks.length} 条随访任务，按优先级排序处理`}
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
            return (
              <div 
                key={stat.label}
                className={`p-5 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]} animate-fade-in-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="text-sm opacity-80">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 font-mono">{stat.value}</p>
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-neutral-200 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as typeof activeTab); setSelectedTaskIds(new Set()); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
                <Badge variant={activeTab === tab.key ? 'primary' : 'neutral'} size="sm" className="ml-2">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
          
          <Select
            className="w-48"
            options={[
              { value: '', label: '全部状态' },
              ...Object.entries(TASK_STATUS).map(([key, value]) => ({
                value: key,
                label: value.label,
              })),
            ]}
            value={filterTaskStatus}
            onChange={(e) => setFilterTaskStatus(e.target.value)}
          />
        </div>

        {selectableTasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-xl">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-600 transition-colors"
            >
              {allSelectableSelected ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-neutral-400" />}
              <span className="font-medium">
                {allSelectableSelected ? '取消全选' : '全选未完成任务'}
              </span>
            </button>
            {someSelected && (
              <>
                <span className="text-sm text-neutral-600">
                  已选 <span className="font-semibold text-primary-600">{selectedTaskIds.size}</span> 项
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<CalendarClock size={14} />}
                  onClick={() => setShowBatchRescheduleModal(true)}
                >
                  批量改期
                </Button>
              </>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Users size={14} />}
                onClick={() => setShowBatchCreateModal(true)}
              >
                批量安排随访
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedTasks.map((task, index) => {
            const patient = getPatientById(task.patientId);
            const latestAssessment = patient ? getLatestAssessment(patient.id) : null;
            const statusConfig = TASK_STATUS[task.status];
            const priorityConfig = TASK_PRIORITY[task.priority];
            const typeConfig = TASK_TYPE[task.type];
            const TaskIcon = getTaskIcon(task.type);
            const isSelected = selectedTaskIds.has(task.id);
            const canSelect = task.status !== 'completed';
            
            const priorityColors = {
              urgent: 'border-l-4 border-l-danger-500',
              high: 'border-l-4 border-l-warning-500',
              medium: 'border-l-4 border-l-primary-500',
              low: 'border-l-4 border-l-success-500',
            };
            
            return (
              <Card 
                key={task.id}
                className={`${priorityColors[task.priority]} animate-fade-in-up ${
                  task.priority === 'urgent' && task.status !== 'completed' ? 'animate-breathe' : ''
                } ${isSelected ? 'ring-2 ring-primary-400' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardBody>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      {canSelect && (
                        <button
                          onClick={() => toggleTaskSelection(task.id)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {isSelected 
                            ? <CheckSquare size={18} className="text-primary-600" /> 
                            : <Square size={18} className="text-neutral-400 hover:text-primary-400" />
                          }
                        </button>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${
                          task.type === 'phone' ? 'bg-primary-50 text-primary-500' :
                          task.type === 'sms' ? 'bg-success-50 text-success-500' : 'bg-warning-50 text-warning-500'
                        }`}>
                          {TaskIcon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-700 flex items-center gap-2">
                            {patient?.name || '未知患者'}
                            {latestAssessment && <RiskBadge score={latestAssessment.totalScore} showLabel={false} size="sm" />}
                          </h4>
                          <p className="text-sm text-neutral-500">{typeConfig.label}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge 
                        variant={
                          statusConfig.color === 'neutral' ? 'neutral' : 
                          statusConfig.color as 'success' | 'warning' | 'danger' | 'primary'
                        } 
                        size="sm"
                      >
                        {statusConfig.label}
                      </Badge>
                      <Badge 
                        variant={
                          priorityConfig.color === 'neutral' ? 'neutral' : 
                          priorityConfig.color as 'success' | 'warning' | 'danger' | 'primary'
                        } 
                        size="sm"
                      >
                        优先级：{priorityConfig.label}
                      </Badge>
                    </div>
                  </div>
                  
                  {patient && (
                    <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <User size={14} className="text-neutral-400" />
                          {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <Calendar size={14} className="text-neutral-400" />
                          初诊：{patient.firstVisitDate}
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <Clock size={14} className="text-neutral-400" />
                          计划：{getRelativeDate(task.scheduledDate)}
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <FileText size={14} className="text-neutral-400" />
                          {patient.medicalRecordNo}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 mt-2 pt-2 border-t border-neutral-200">
                        主诉：{patient.chiefComplaint}
                      </p>
                    </div>
                  )}
                  
                  {task.assignedTo && (
                    <p className="text-xs text-neutral-500 mb-3">
                      执行人：{task.assignedTo}
                      {task.completedAt && ` · 完成时间：${task.completedAt}`}
                    </p>
                  )}
                  
                  {task.conclusion && (
                    <div className="mb-3 p-3 bg-success-50 rounded-lg border border-success-200">
                      <p className="text-xs text-success-600 font-medium mb-1">随访结论</p>
                      <p className="text-sm text-neutral-700">{task.conclusion}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => navigate(`/assessment/${task.patientId}`)}
                    >
                      查看详情
                    </Button>
                    
                    {task.status === 'pending' && (
                      <Button 
                        size="sm"
                        leftIcon={task.type === 'phone' ? <PhoneCall size={14} /> : <Send size={14} />}
                        onClick={() => handleStartTask(task)}
                      >
                        开始{typeConfig.label}
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button 
                        size="sm"
                        leftIcon={<CheckCircle size={14} />}
                        onClick={() => {
                          setSelectedTask(task);
                          setShowContactModal(true);
                        }}
                      >
                        完成随访
                      </Button>
                    )}
                    
                    {task.status === 'overdue' && (
                      <Button 
                        size="sm"
                        variant="danger"
                        leftIcon={<AlertCircle size={14} />}
                        onClick={() => handleStartTask(task)}
                      >
                        立即处理
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
        
        {displayedTasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
            <CheckCircle className="mx-auto text-neutral-300 mb-4" size={48} />
            <p className="text-neutral-500">暂无{activeTab === 'all' ? '' : TASK_STATUS[activeTab as keyof typeof TASK_STATUS]?.label}任务</p>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="完成随访"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowContactModal(false)}>取消</Button>
            <Button onClick={handleCompleteTask} leftIcon={<Save size={18} />}>
              确认完成
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {selectedTask && (
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm font-medium text-neutral-700 mb-1">
                正在为 <span className="text-primary-600">{getPatientById(selectedTask.patientId)?.name}</span> 完成随访
              </p>
              <p className="text-xs text-neutral-500">
                任务类型：{TASK_TYPE[selectedTask.type].label} · 计划日期：{selectedTask.scheduledDate}
              </p>
            </div>
          )}
          
          <Select
            label="触达结果"
            options={[
              { value: 'success', label: '成功联系到患者' },
              { value: 'no_answer', label: '无人接听' },
              { value: 'failed', label: '联系失败' },
            ]}
            value={contactResult}
            onChange={(e) => setContactResult(e.target.value as typeof contactResult)}
          />
          
          <Textarea
            label="沟通内容"
            placeholder="请详细记录与患者的沟通内容，包括患者反馈、症状变化、用药情况等..."
            value={contactContent}
            onChange={(e) => setContactContent(e.target.value)}
            rows={4}
          />
          
          <Textarea
            label="随访结论"
            placeholder="请填写本次随访的结论和建议，包括是否需要调整治疗方案、下次随访时间建议等..."
            value={taskConclusion}
            onChange={(e) => setTaskConclusion(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showBatchRescheduleModal}
        onClose={() => setShowBatchRescheduleModal(false)}
        title="批量改期"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBatchRescheduleModal(false)}>取消</Button>
            <Button onClick={handleBatchReschedule} leftIcon={<CalendarClock size={18} />}>
              确认改期（{selectedTaskIds.size} 项）
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-700">
              将为已选中的 <span className="font-semibold">{selectedTaskIds.size}</span> 项任务统一改期。
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">统一改期至</label>
            <input
              type="date"
              value={batchRescheduleDate}
              min={getToday()}
              onChange={(e) => setBatchRescheduleDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
            <p className="text-xs text-neutral-500 mt-2">
              提示：改期后任务状态将自动重置为"待随访"
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBatchCreateModal}
        onClose={() => setShowBatchCreateModal(false)}
        title="批量安排随访"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBatchCreateModal(false)}>取消</Button>
            <Button onClick={handleBatchCreatePhoneFollowups} leftIcon={<Users size={18} />}>
              生成随访任务
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-700">
              为满足条件且当前没有待办/进行中任务的患者批量生成随访。
            </p>
          </div>
          <Select
            label="目标风险分层"
            options={[
              { value: 'both', label: '中度 + 重度（推荐）' },
              { value: 'severe', label: '仅重度 (PSQI ≥ 15)' },
              { value: 'moderate', label: '仅中度 (8 ≤ PSQI ≤ 14)' },
            ]}
            value={batchCreateRiskLevel}
            onChange={(e) => setBatchCreateRiskLevel(e.target.value as typeof batchCreateRiskLevel)}
          />
          <Select
            label="随访方式"
            options={[
              { value: 'phone', label: '电话随访' },
              { value: 'sms', label: '短信提醒' },
            ]}
            value={batchCreateType}
            onChange={(e) => setBatchCreateType(e.target.value as typeof batchCreateType)}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">计划随访日期</label>
            <input
              type="date"
              value={batchCreateDate}
              min={getToday()}
              onChange={(e) => setBatchCreateDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default FollowupPlan;
