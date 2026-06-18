import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, FileText, Calendar, TrendingUp, Save, Plus, Pill, Activity, PhoneCall, MessageSquare, CheckCircle, XCircle, AlertCircle, Clock, Filter, History, CalendarClock, AlertTriangle, Stethoscope } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PSQIForm, type PSQIFormRef } from '@/components/PSQIForm';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RiskBadge } from '@/components/RiskBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAppStore } from '@/store/useAppStore';
import type { PSQIAssessment, Intervention } from '@/types';
import { getSuggestedFollowupDate, getRiskLevelLabel } from '@/utils/psqi';
import { formatDate, formatDateTime, getRelativeDate, getToday } from '@/utils/date';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

const Assessment: React.FC = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const {
    getPatientById,
    getPatientAssessments,
    getPatientInterventions,
    getPatientTasks,
    getPatientContactRecords,
    getNextFollowupTask,
    addAssessment,
    addIntervention,
  } = useAppStore();
  
  const psqiFormRef = React.useRef<PSQIFormRef>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [showNewAssessment, setShowNewAssessment] = useState(!patientId);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'assessment' | 'followup' | 'intervention' | 'contact' | 'abnormal' | 'revisit'>('all');
  const [newIntervention, setNewIntervention] = useState({
    type: 'medication' as 'medication' | 'non_medication',
    name: '',
    dosage: '',
    frequency: '',
    startDate: formatDate(new Date()),
    endDate: '',
    notes: '',
  });
  
  const patient = selectedPatientId ? getPatientById(selectedPatientId) : null;
  const assessments = selectedPatientId ? getPatientAssessments(selectedPatientId) : [];
  const interventions = selectedPatientId ? getPatientInterventions(selectedPatientId) : [];
  const tasks = selectedPatientId ? getPatientTasks(selectedPatientId) : [];
  const contactRecords = selectedPatientId ? getPatientContactRecords(selectedPatientId) : [];
  const nextTask = selectedPatientId ? getNextFollowupTask(selectedPatientId) : undefined;
  const latestAssessment = assessments[0];
  const previousAssessment = assessments[1];
  
  const timeline = useMemo(() => {
    if (!patient) return [];
    const items: any[] = [];
    const sortedAssessments = [...assessments].sort((a, b) =>
      new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime()
    );

    items.push({
      id: `profile-${patient.id}`,
      type: 'profile' as const,
      date: patient.firstVisitDate,
      time: `${patient.firstVisitDate} 09:00`,
      title: '患者建档',
      content: `${patient.gender === 'male' ? '男' : '女'}，${patient.age}岁，主诉：${patient.chiefComplaint}`,
      color: 'primary',
      icon: User,
      abnormal: false,
      revisit: false,
    });

    sortedAssessments.forEach((a, idx) => {
      const riskLabel = getRiskLevelLabel(a.totalScore);
      const prev = idx > 0 ? sortedAssessments[idx - 1] : null;
      const worsened = prev ? a.totalScore - prev.totalScore >= 3 : false;
      const severe = a.totalScore >= 15;
      items.push({
        id: `assessment-${a.id}`,
        type: 'assessment' as const,
        date: a.assessmentDate,
        time: a.createdAt,
        title: `PSQI 评估 - ${a.assessmentType === 'initial' ? '初诊' : '复诊'}`,
        score: a.totalScore,
        risk: riskLabel,
        riskLevel: severe ? 'danger' : a.totalScore >= 8 ? 'warning' : 'success',
        content: a.notes || `总分 ${a.totalScore} 分，${riskLabel}${prev ? `，较上次 ${a.totalScore > prev.totalScore ? '+' : ''}${a.totalScore - prev.totalScore}` : ''}`,
        color: severe ? 'danger' : worsened ? 'warning' : a.totalScore >= 8 ? 'warning' : 'success',
        icon: Activity,
        abnormal: severe || worsened,
        revisit: severe || (a.assessmentType === 'followup' && worsened),
      });
    });

    interventions.forEach((i) => {
      items.push({
        id: `intervention-${i.id}`,
        type: 'intervention' as const,
        date: i.startDate,
        time: `${i.startDate} 09:00`,
        title: `${i.type === 'medication' ? '药物' : '非药物'}干预方案`,
        content: i.name + (i.dosage ? ` ${i.dosage}` : '') + (i.frequency ? ` ${i.frequency}` : '') + (i.notes ? `，${i.notes}` : ''),
        color: 'success',
        icon: Pill,
        abnormal: false,
        revisit: i.type === 'medication',
      });
      if (i.adjustmentHistory) {
        i.adjustmentHistory.forEach((adj, adjIdx) => {
          items.push({
            id: `intervention-${i.id}-adj-${adjIdx}`,
            type: 'intervention_adjust' as const,
            date: adj.time.split(' ')[0],
            time: adj.time,
            title: '干预方案调整',
            content: `${adj.operator}：${adj.note}`,
            color: 'warning',
            icon: Pill,
            abnormal: true,
            revisit: true,
          });
        });
      }
    });

    tasks.forEach((t) => {
      if (t.rescheduleHistory && t.rescheduleHistory.length > 0) {
        t.rescheduleHistory.forEach((r, rIdx) => {
          items.push({
            id: `task-${t.id}-resched-${rIdx}`,
            type: 'reschedule' as const,
            date: r.time.split(' ')[0],
            time: r.time,
            title: `随访改期 - ${t.type === 'phone' ? '电话' : t.type === 'sms' ? '短信' : '门诊'}`,
            content: `${r.operator}：从 ${r.fromDate} 改到 ${r.toDate}${r.reason ? `（${r.reason}）` : ''}`,
            color: 'warning',
            icon: CalendarClock,
            abnormal: true,
            revisit: false,
          });
        });
      }
      if (t.status === 'overdue') {
        items.push({
          id: `task-${t.id}-overdue`,
          type: 'followup_overdue' as const,
          date: t.scheduledDate,
          time: `${t.scheduledDate} 23:59`,
          title: `随访已逾期 - ${t.type === 'phone' ? '电话' : t.type === 'sms' ? '短信' : '门诊'}`,
          content: `原计划 ${t.scheduledDate}，当前未完成`,
          color: 'danger',
          icon: AlertCircle,
          abnormal: true,
          revisit: true,
        });
      }
      if (t.status === 'completed') {
        items.push({
          id: `task-${t.id}`,
          type: 'followup' as const,
          date: t.scheduledDate,
          time: t.completedAt || `${t.scheduledDate} 10:00`,
          title: `随访结论 - ${t.type === 'phone' ? '电话' : t.type === 'sms' ? '短信' : '门诊'}`,
          result: 'success' as const,
          content: t.conclusion || '随访完成',
          color: 'success' as const,
          icon: PhoneCall,
          abnormal: false,
          revisit: t.type === 'visit' || (t.conclusion && (t.conclusion.includes('复诊') || t.conclusion.includes('加号'))),
        });
      }
    });

    const contactByTask = new Map<string, number>();
    contactRecords.forEach((c) => {
      const prevCount = contactByTask.get(c.followupTaskId) || 0;
      contactByTask.set(c.followupTaskId, prevCount + 1);
      const isReattempt = prevCount > 0;
      const isFailed = c.result !== 'success';
      items.push({
        id: `contact-${c.id}`,
        type: 'contact' as const,
        date: c.contactTime.split(' ')[0],
        time: c.contactTime,
        title: `${isReattempt ? '重新' : ''}触达记录 - ${c.type === 'phone' ? '电话' : c.type === 'sms' ? '短信' : '门诊'}`,
        result: c.result,
        operator: c.operator,
        content: (isReattempt ? `【第${prevCount + 1}次尝试】` : '') + (c.content || '无沟通内容'),
        color: isFailed ? (c.result === 'failed' ? 'danger' : 'warning') : 'success',
        icon: c.type === 'phone' ? PhoneCall : c.type === 'sms' ? MessageSquare : User,
        abnormal: isFailed || isReattempt,
        revisit: isFailed,
      });
    });

    return items
      .filter((i) => {
        if (timelineFilter === 'all') return true;
        if (timelineFilter === 'assessment') return i.type === 'assessment';
        if (timelineFilter === 'followup') return i.type === 'followup' || i.type === 'followup_overdue';
        if (timelineFilter === 'intervention') return i.type === 'intervention' || i.type === 'intervention_adjust';
        if (timelineFilter === 'contact') return i.type === 'contact' || i.type === 'reschedule';
        if (timelineFilter === 'abnormal') return i.abnormal;
        if (timelineFilter === 'revisit') return i.revisit;
        return true;
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [patient, assessments, interventions, tasks, contactRecords, timelineFilter]);
  
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);

  useEffect(() => {
    if (patient && assessments.length === 0) {
      setShowNewAssessment(true);
    }
  }, [patient, assessments.length]);
  
  const handleAssessmentSubmit = (data: Omit<PSQIAssessment, 'id' | 'createdAt'>) => {
    if (!selectedPatientId) return;
    addAssessment(data);
    setShowNewAssessment(false);
  };
  
  const handleAddIntervention = () => {
    if (!selectedPatientId) return;
    addIntervention({
      patientId: selectedPatientId,
      ...newIntervention,
    });
    setShowInterventionModal(false);
    setNewIntervention({
      type: 'medication',
      name: '',
      dosage: '',
      frequency: '',
      startDate: formatDate(new Date()),
      endDate: '',
      notes: '',
    });
  };
  
  const trendData = assessments.slice().reverse().map((a) => ({
    date: a.assessmentDate,
    总分: a.totalScore,
    睡眠质量: a.sleepQuality,
    入睡时间: a.sleepLatency,
    睡眠时间: a.sleepDuration,
  }));
  
  const radarData = latestAssessment ? [
    { subject: '睡眠质量', A: latestAssessment.sleepQuality, fullMark: 3 },
    { subject: '入睡时间', A: latestAssessment.sleepLatency, fullMark: 3 },
    { subject: '睡眠时间', A: latestAssessment.sleepDuration, fullMark: 3 },
    { subject: '睡眠效率', A: latestAssessment.sleepEfficiency, fullMark: 3 },
    { subject: '睡眠障碍', A: latestAssessment.sleepDisturbance, fullMark: 3 },
    { subject: '催眠药物', A: latestAssessment.hypnoticUse, fullMark: 3 },
    { subject: '日间功能', A: latestAssessment.daytimeDysfunction, fullMark: 3 },
  ] : [];
  
  const patients = useAppStore((state) => state.patients);
  
  const scoreDiff = previousAssessment && latestAssessment 
    ? latestAssessment.totalScore - previousAssessment.totalScore 
    : 0;
  
  return (
    <Layout 
      title="评估录入" 
      subtitle={patient ? `${patient.name} 的 PSQI 睡眠质量评估` : '选择患者进行 PSQI 睡眠质量评估'}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/patients')}
          >
            返回列表
          </Button>
          
          {!patientId && (
            <Select
              className="w-72"
              options={[
                { value: '', label: '请选择患者' },
                ...patients.map((p) => ({ value: p.id, label: `${p.name} - ${p.medicalRecordNo}` })),
              ]}
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                if (e.target.value) {
                  navigate(`/assessment/${e.target.value}`);
                }
              }}
            />
          )}
        </div>
        
        {patient && (
          <>
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                      <User className="text-primary-500" size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-neutral-700">{patient.name}</h3>
                        {latestAssessment && <RiskBadge score={latestAssessment.totalScore} />}
                      </div>
                      <p className="text-sm text-neutral-500 mb-2">
                        {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · {patient.medicalRecordNo}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                        <span className="flex items-center gap-1.5">
                          <Phone size={14} className="text-neutral-400" />
                          {patient.phone}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-neutral-400" />
                          初诊：{patient.firstVisitDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {latestAssessment && (
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">最新评分</p>
                        <p className="text-4xl font-bold font-mono text-primary-600">{latestAssessment.totalScore}</p>
                        {previousAssessment && (
                          <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${scoreDiff < 0 ? 'text-success-600' : scoreDiff > 0 ? 'text-danger-600' : 'text-neutral-500'}`}>
                            <TrendingUp size={14} className={scoreDiff < 0 ? 'rotate-180' : ''} />
                            {scoreDiff > 0 ? '+' : ''}{scoreDiff} 较上次
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">下次随访</p>
                        {nextTask ? (
                          <>
                            <p className="text-xl font-semibold text-neutral-700">
                              {getRelativeDate(nextTask.scheduledDate)}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-2">
                              <span>{nextTask.scheduledDate}</span>
                              <Badge variant={nextTask.status === 'overdue' ? 'danger' : nextTask.status === 'in_progress' ? 'primary' : 'neutral'} size="xs">
                                {nextTask.status === 'pending' ? '待随访' : nextTask.status === 'in_progress' ? '进行中' : '已逾期'}
                              </Badge>
                              {nextTask.type === 'phone' ? '电话' : nextTask.type === 'sms' ? '短信' : '门诊'}
                            </p>
                          </>
                        ) : latestAssessment ? (
                          <>
                            <p className="text-xl font-semibold text-neutral-700">
                              {getRelativeDate(getSuggestedFollowupDate(latestAssessment.assessmentDate, latestAssessment.totalScore))}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {getSuggestedFollowupDate(latestAssessment.assessmentDate, latestAssessment.totalScore)}（建议）
                            </p>
                          </>
                        ) : null}
                      </div>
                      <Button 
                        leftIcon={<Plus size={18} />}
                        onClick={() => setShowNewAssessment(true)}
                      >
                        新增评估
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-50">
                      <FileText className="text-primary-500" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-0.5">主诉</p>
                      <p className="text-sm text-neutral-700">{patient.chiefComplaint}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning-50">
                      <Activity className="text-warning-500" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-0.5">既往病史</p>
                      <p className="text-sm text-neutral-700">{patient.medicalHistory}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success-50">
                      <Pill className="text-success-500" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-0.5">用药史</p>
                      <p className="text-sm text-neutral-700">{patient.medicationHistory}</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {showNewAssessment && (
              <Card>
                <CardHeader>
                  <CardTitle>PSQI 睡眠质量评估量表</CardTitle>
                </CardHeader>
                <CardBody>
                  <PSQIForm
                    ref={psqiFormRef}
                    formId="psqi-assessment-form"
                    patientId={selectedPatientId}
                    onSubmit={handleAssessmentSubmit}
                    initialData={{ assessmentType: assessments.length === 0 ? 'initial' : 'followup' }}
                  />
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-neutral-200">
                    <Button variant="ghost" onClick={() => setShowNewAssessment(false)}>取消</Button>
                    <Button 
                      leftIcon={<Save size={18} />}
                      form="psqi-assessment-form"
                      type="submit"
                    >
                      保存评估
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
            
            {!showNewAssessment && latestAssessment && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>评分趋势</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {trendData.length > 1 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E6EB" />
                            <XAxis dataKey="date" fontSize={12} stroke="#86909C" />
                            <YAxis domain={[0, 21]} fontSize={12} stroke="#86909C" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #E5E6EB',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }} 
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="总分" 
                              stroke="#165DFF" 
                              strokeWidth={3}
                              dot={{ fill: '#165DFF', strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line type="monotone" dataKey="睡眠质量" stroke="#00B42A" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="入睡时间" stroke="#FF7D00" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="睡眠时间" stroke="#F53F3F" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-neutral-500">
                        需要至少2次评估才能显示趋势图
                      </div>
                    )}
                  </CardBody>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>分项雷达图</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#E5E6EB" />
                          <PolarAngleAxis dataKey="subject" fontSize={12} tick={{ fill: '#4E5969' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fill: '#86909C', fontSize: 10 }} />
                          <Radar
                            name="当前评分"
                            dataKey="A"
                            stroke="#165DFF"
                            fill="#165DFF"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>历史评估记录</CardTitle>
                    <Badge variant="neutral" size="sm">{assessments.length} 条记录</Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {assessments.map((assessment, index) => (
                      <div 
                        key={assessment.id}
                        className={`p-4 rounded-lg border transition-colors ${index === 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-neutral-700">
                              {assessment.assessmentType === 'initial' ? '初诊评估' : '复诊评估'}
                            </span>
                            <RiskBadge score={assessment.totalScore} showLabel={false} size="sm" />
                          </div>
                          <span className="text-xs text-neutral-500">{assessment.assessmentDate}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <span>质量 {assessment.sleepQuality}</span>
                          <span>入睡 {assessment.sleepLatency}</span>
                          <span>时长 {assessment.sleepDuration}</span>
                          <span>效率 {assessment.sleepEfficiency}</span>
                          <span>障碍 {assessment.sleepDisturbance}</span>
                          <span>药物 {assessment.hypnoticUse}</span>
                          <span>日间 {assessment.daytimeDysfunction}</span>
                        </div>
                        {assessment.notes && (
                          <p className="text-xs text-neutral-600 mt-2 pt-2 border-t border-neutral-100">
                            备注：{assessment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>干预方案</CardTitle>
                    <Button 
                      size="sm" 
                      variant="outline"
                      leftIcon={<Plus size={14} />}
                      onClick={() => setShowInterventionModal(true)}
                    >
                      添加干预
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {interventions.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500">
                        暂无干预记录，点击上方按钮添加
                      </div>
                    ) : (
                      interventions.map((intervention) => (
                        <div 
                          key={intervention.id}
                          className="p-4 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={intervention.type === 'medication' ? 'primary' : 'success'} 
                                size="sm"
                              >
                                {intervention.type === 'medication' ? '药物' : '非药物'}
                              </Badge>
                              <span className="text-sm font-medium text-neutral-700">{intervention.name}</span>
                            </div>
                            <span className="text-xs text-neutral-500">
                              {intervention.startDate} ~ {intervention.endDate || '持续中'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span>剂量：{intervention.dosage}</span>
                            <span>频次：{intervention.frequency}</span>
                          </div>
                          {intervention.notes && (
                            <p className="text-xs text-neutral-600 mt-2 pt-2 border-t border-neutral-100">
                              备注：{intervention.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>随访任务</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      暂无随访任务
                    </div>
                  ) : (
                    tasks.slice(0, 5).map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'urgent' ? 'bg-danger-500' :
                            task.priority === 'high' ? 'bg-warning-500' :
                            task.priority === 'medium' ? 'bg-primary-500' : 'bg-success-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-neutral-700">
                              {task.type === 'phone' ? '电话随访' : task.type === 'sms' ? '短信提醒' : '门诊复诊'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              计划：{task.scheduledDate}
                              {task.assignedTo && ` · 执行人：${task.assignedTo}`}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            task.status === 'completed' ? 'success' :
                            task.status === 'overdue' ? 'danger' :
                            task.status === 'in_progress' ? 'primary' : 'neutral'
                          } 
                          size="sm"
                        >
                          {task.status === 'pending' ? '待随访' : 
                           task.status === 'in_progress' ? '进行中' :
                           task.status === 'completed' ? '已完成' : '已逾期'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall size={18} className="text-primary-500" />
                    触达记录
                  </CardTitle>
                  <Badge variant="neutral" size="sm">{contactRecords.length} 条记录</Badge>
                </div>
              </CardHeader>
              <CardBody>
                {contactRecords.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    暂无触达记录，完成随访任务后会自动记录
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {contactRecords.map((record) => {
                      const recordIcon = record.type === 'phone' ? <PhoneCall size={16} /> : record.type === 'sms' ? <MessageSquare size={16} /> : <User size={16} />;
                      const resultConfig = {
                        success: { icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-50', border: 'border-success-200', label: '成功联系' },
                        failed: { icon: XCircle, color: 'text-danger-500', bg: 'bg-danger-50', border: 'border-danger-200', label: '联系失败' },
                        no_answer: { icon: AlertCircle, color: 'text-warning-500', bg: 'bg-warning-50', border: 'border-warning-200', label: '无人接听' },
                      };
                      const config = resultConfig[record.result];
                      const ResultIcon = config.icon;
                      
                      return (
                        <div 
                          key={record.id}
                          className={`p-4 rounded-lg border ${config.border} ${config.bg}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`p-1.5 rounded-md ${config.bg} ${config.color}`}>
                                {recordIcon}
                              </span>
                              <div>
                                <span className="text-sm font-medium text-neutral-700">
                                  {record.type === 'phone' ? '电话随访' : record.type === 'sms' ? '短信提醒' : '门诊复诊'}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                                  <Clock size={12} />
                                  {record.contactTime}
                                </div>
                              </div>
                            </div>
                            <Badge 
                              variant={record.result === 'success' ? 'success' : record.result === 'failed' ? 'danger' : 'warning'} 
                              size="sm"
                            >
                              <ResultIcon size={12} className="mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="mt-2 pt-2 border-t border-neutral-200">
                            <p className="text-xs text-neutral-500 mb-1">沟通内容：</p>
                            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{record.content || '无记录'}</p>
                          </div>
                          <p className="text-xs text-neutral-400 mt-2">操作人：{record.operator}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <History size={18} className="text-primary-500" />
                    就诊时间轴
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Filter size={14} />
                      筛选：
                    </div>
                    {([
                      { key: 'all', label: '全部' },
                      { key: 'assessment', label: 'PSQI评估' },
                      { key: 'followup', label: '随访结论' },
                      { key: 'intervention', label: '干预方案' },
                      { key: 'contact', label: '触达记录' },
                      { key: 'abnormal', label: '仅异常' },
                      { key: 'revisit', label: '需复诊' },
                    ] as const).map((f) => (
                      <Badge
                        key={f.key}
                        variant={timelineFilter === f.key ? (f.key === 'abnormal' ? 'danger' : f.key === 'revisit' ? 'warning' : 'primary') : 'neutral'}
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setTimelineFilter(f.key)}
                      >
                        {f.key === 'abnormal' && <AlertTriangle size={12} className="mr-1 inline" />}
                        {f.key === 'revisit' && <Stethoscope size={12} className="mr-1 inline" />}
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    暂无记录
                  </div>
                ) : (
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-neutral-200" />
                    {timeline.map((item, index) => {
                      const Icon = item.icon;
                      const dotColors: Record<string, string> = {
                        primary: 'bg-primary-500 ring-primary-100',
                        success: 'bg-success-500 ring-success-100',
                        warning: 'bg-warning-500 ring-warning-100',
                        danger: 'bg-danger-500 ring-danger-100',
                      };
                      const borderColors: Record<string, string> = {
                        primary: 'border-primary-200 bg-primary-50/50',
                        success: 'border-success-200 bg-success-50/50',
                        warning: 'border-warning-200 bg-warning-50/50',
                        danger: 'border-danger-200 bg-danger-50/50',
                      };
                      const textColors: Record<string, string> = {
                        primary: 'text-primary-600',
                        success: 'text-success-600',
                        warning: 'text-warning-600',
                        danger: 'text-danger-600',
                      };
                      
                      return (
                        <div key={item.id} className="relative pb-8 last:pb-0 animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                          <div className={`absolute -left-[22px] top-0.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ${dotColors[item.color as keyof typeof dotColors]}`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <div className={`p-4 rounded-lg border ${borderColors[item.color as keyof typeof borderColors]}`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <h5 className={`font-semibold text-sm ${textColors[item.color as keyof typeof textColors]}`}>
                                  {item.title}
                                </h5>
                                {item.score !== undefined && (
                                  <Badge variant={item.riskLevel as 'success' | 'warning' | 'danger'} size="sm">
                                    PSQI {item.score}分 · {item.risk}
                                  </Badge>
                                )}
                                {item.result && (
                                  <Badge variant={item.result === 'success' ? 'success' : item.result === 'failed' ? 'danger' : 'warning'} size="sm">
                                    {item.result === 'success' ? '成功' : item.result === 'failed' ? '失败' : '未接通'}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-neutral-500 flex-shrink-0">
                                <Clock size={12} />
                                {item.time}
                              </div>
                            </div>
                            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{item.content}</p>
                            {item.operator && (
                              <p className="text-xs text-neutral-400 mt-2">操作人：{item.operator}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
        
        {!patient && !patientId && (
          <Card>
            <CardBody className="text-center py-16">
              <User className="mx-auto text-neutral-300 mb-4" size={48} />
              <p className="text-neutral-500 mb-4">请先选择一位患者</p>
              <Link to="/patients">
                <Button leftIcon={<User size={18} />}>前往患者列表</Button>
              </Link>
            </CardBody>
          </Card>
        )}
      </div>
      
      <Modal
        isOpen={showInterventionModal}
        onClose={() => setShowInterventionModal(false)}
        title="添加干预方案"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowInterventionModal(false)}>取消</Button>
            <Button onClick={handleAddIntervention}>确认添加</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="干预类型"
              options={[
                { value: 'medication', label: '药物干预' },
                { value: 'non_medication', label: '非药物干预' },
              ]}
              value={newIntervention.type}
              onChange={(e) => setNewIntervention({ ...newIntervention, type: e.target.value as 'medication' | 'non_medication' })}
            />
            <Input
              label="干预名称"
              placeholder={newIntervention.type === 'medication' ? '如：唑吡坦' : '如：CBT-I认知行为治疗'}
              value={newIntervention.name}
              onChange={(e) => setNewIntervention({ ...newIntervention, name: e.target.value })}
            />
            <Input
              label="剂量"
              placeholder={newIntervention.type === 'medication' ? '如：10mg' : '如：1次/日'}
              value={newIntervention.dosage}
              onChange={(e) => setNewIntervention({ ...newIntervention, dosage: e.target.value })}
            />
            <Input
              label="频次"
              placeholder={newIntervention.type === 'medication' ? '如：睡前服用' : '如：每周3次'}
              value={newIntervention.frequency}
              onChange={(e) => setNewIntervention({ ...newIntervention, frequency: e.target.value })}
            />
            <Input
              label="开始日期"
              type="date"
              value={newIntervention.startDate}
              onChange={(e) => setNewIntervention({ ...newIntervention, startDate: e.target.value })}
            />
            <Input
              label="结束日期（选填）"
              type="date"
              value={newIntervention.endDate}
              onChange={(e) => setNewIntervention({ ...newIntervention, endDate: e.target.value })}
            />
          </div>
          <Textarea
            label="备注"
            placeholder="请输入干预方案的备注信息..."
            value={newIntervention.notes}
            onChange={(e) => setNewIntervention({ ...newIntervention, notes: e.target.value })}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default Assessment;
