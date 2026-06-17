import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, FileText, Calendar, TrendingUp, Save, Plus, Pill, Activity } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PSQIForm } from '@/components/PSQIForm';
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
import { formatDate, formatDateTime, getRelativeDate } from '@/utils/date';
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
    addAssessment,
    addIntervention,
  } = useAppStore();
  
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [showNewAssessment, setShowNewAssessment] = useState(!patientId);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
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
  const latestAssessment = assessments[0];
  const previousAssessment = assessments[1];
  
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);
  
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
                        <p className="text-xl font-semibold text-neutral-700">
                          {getRelativeDate(getSuggestedFollowupDate(latestAssessment.assessmentDate, latestAssessment.totalScore))}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {getSuggestedFollowupDate(latestAssessment.assessmentDate, latestAssessment.totalScore)}
                        </p>
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
                    patientId={selectedPatientId}
                    onSubmit={handleAssessmentSubmit}
                    initialData={{ assessmentType: assessments.length === 0 ? 'initial' : 'followup' }}
                  />
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-neutral-200">
                    <Button variant="ghost" onClick={() => setShowNewAssessment(false)}>取消</Button>
                    <Button 
                      leftIcon={<Save size={18} />}
                      onClick={() => {
                        const form = document.querySelector('form');
                        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
                      }}
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
