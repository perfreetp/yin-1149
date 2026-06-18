import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { RISK_LEVELS, PSQI_COMPONENTS } from '@/types';
import { getRiskLevel, getRiskLevelLabel } from '@/utils/psqi';
import { getToday, formatDate, addDays } from '@/utils/date';
import {
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Pill,
  BarChart3,
  PieChart,
  Target,
  Download,
  CalendarDays,
  Filter,
  UserRound,
  XCircle,
  Eye,
} from 'lucide-react';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

const Reports: React.FC = () => {
  const {
    patients,
    assessments,
    followupTasks,
    interventions,
    contactRecords,
    getLatestAssessment,
    getPatientAssessments,
    getPatientById,
  } = useAppStore();

  const [reportStartDate, setReportStartDate] = useState(formatDate(addDays(new Date(), -30)));
  const [reportEndDate, setReportEndDate] = useState(getToday());
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [showOperatorDetail, setShowOperatorDetail] = useState(false);

  const inDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= reportStartDate && dateStr <= reportEndDate;
  };

  const followupSummary = useMemo(() => {
    const newPatients = patients.filter(p => inDateRange(p.firstVisitDate));
    const completedAssessments = assessments.filter(a => inDateRange(a.assessmentDate));
    const completedFollowups = followupTasks.filter(t => t.status === 'completed' && t.completedAt && inDateRange(t.completedAt.split(' ')[0]));
    const totalContacts = contactRecords.filter(c => inDateRange(c.contactTime.split(' ')[0]));

    const patientIdsWithChange = new Set<string>();
    let improvedCount = 0;
    let worsenedCount = 0;
    let stableCount = 0;
    let severeCount = 0;

    completedAssessments.forEach(a => {
      if (a.totalScore >= 15) severeCount++;
      if (!patientIdsWithChange.has(a.patientId)) {
        const history = getPatientAssessments(a.patientId).slice().reverse();
        if (history.length >= 2) {
          const prev = history[history.length - 2].totalScore;
          const cur = a.totalScore;
          if (cur - prev >= 3) worsenedCount++;
          else if (prev - cur >= 3) improvedCount++;
          else stableCount++;
        }
        patientIdsWithChange.add(a.patientId);
      }
    });

    const avgScore = completedAssessments.length > 0
      ? (completedAssessments.reduce((s, a) => s + a.totalScore, 0) / completedAssessments.length).toFixed(1)
      : '0';

    return {
      newPatients: newPatients.length,
      completedAssessments: completedAssessments.length,
      completedFollowups: completedFollowups.length,
      totalContacts: totalContacts.length,
      improvedCount,
      worsenedCount,
      stableCount,
      severeCount,
      avgScore,
      newPatientsList: newPatients,
      completedAssessmentsList: completedAssessments,
      completedFollowupsList: completedFollowups,
    };
  }, [patients, assessments, followupTasks, interventions, contactRecords, reportStartDate, reportEndDate, getPatientAssessments]);

  const operatorStats = useMemo(() => {
    const operatorMap = new Map<string, {
      name: string;
      pending: number;
      completed: number;
      overdue: number;
      failedContacts: number;
      totalContacts: number;
      taskIds: string[];
    }>();

    const ensure = (name: string) => {
      if (!operatorMap.has(name)) {
        operatorMap.set(name, {
          name: name || '未分配',
          pending: 0,
          completed: 0,
          overdue: 0,
          failedContacts: 0,
          totalContacts: 0,
          taskIds: [],
        });
      }
      return operatorMap.get(name)!;
    };

    followupTasks.forEach((t) => {
      const operator = t.assignedTo || '未分配';
      const row = ensure(operator);
      if (t.status === 'pending' || t.status === 'in_progress') row.pending++;
      if (t.status === 'completed') row.completed++;
      if (t.status === 'overdue') row.overdue++;
      if (operator !== '未分配') row.taskIds.push(t.id);
    });

    contactRecords.forEach((c) => {
      const row = ensure(c.operator || '未分配');
      row.totalContacts++;
      if (c.result === 'failed' || c.result === 'no_answer') row.failedContacts++;
    });

    return Array.from(operatorMap.values())
      .filter(r => r.name !== '未分配' || r.pending + r.completed + r.overdue + r.totalContacts > 0)
      .sort((a, b) => (b.completed + b.pending) - (a.completed + a.pending));
  }, [followupTasks, contactRecords]);

  const selectedOperatorData = useMemo(() => {
    if (!selectedOperator) return null;
    const tasks = followupTasks.filter(t => t.assignedTo === selectedOperator)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    const contacts = contactRecords.filter(c => c.operator === selectedOperator)
      .sort((a, b) => new Date(b.contactTime).getTime() - new Date(a.contactTime).getTime());
    return { tasks, contacts };
  }, [selectedOperator, followupTasks, contactRecords]);

  const handleExportCSV = () => {
    const lines: string[] = [];
    const encode = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    lines.push('# 睡眠门诊复诊随访汇总报表');
    lines.push(`统计周期,${reportStartDate},${reportEndDate}`);
    lines.push('');
    lines.push('核心指标');
    lines.push('指标,数值');
    lines.push(`新增建档患者,${followupSummary.newPatients}`);
    lines.push(`完成PSQI评估,${followupSummary.completedAssessments}`);
    lines.push(`完成随访任务,${followupSummary.completedFollowups}`);
    lines.push(`触达总次数,${followupSummary.totalContacts}`);
    lines.push(`周期平均PSQI,${followupSummary.avgScore}`);
    lines.push(`症状改善(下降≥3),${followupSummary.improvedCount}`);
    lines.push(`症状稳定(波动<3),${followupSummary.stableCount}`);
    lines.push(`症状加重(上升≥3),${followupSummary.worsenedCount}`);
    lines.push(`重度评估次数(≥15),${followupSummary.severeCount}`);
    lines.push('');
    lines.push('新增患者明细');
    lines.push('姓名,性别,年龄,病历号,初诊日期,主诉,当前风险分层');
    followupSummary.newPatientsList.forEach(p => {
      lines.push([
        p.name, p.gender === 'male' ? '男' : '女', p.age,
        p.medicalRecordNo, p.firstVisitDate, p.chiefComplaint,
        RISK_LEVELS[p.riskLevel].label,
      ].map(encode).join(','));
    });
    lines.push('');
    lines.push('评估明细');
    lines.push('姓名,评估日期,评估类型,PSQI总分,风险分层,备注');
    followupSummary.completedAssessmentsList.forEach(a => {
      const p = getPatientById(a.patientId);
      lines.push([
        p?.name || '', a.assessmentDate, a.assessmentType === 'initial' ? '初诊' : '复诊',
        a.totalScore, getRiskLevelLabel(a.totalScore), a.notes,
      ].map(encode).join(','));
    });
    lines.push('');
    lines.push('随访完成明细');
    lines.push('姓名,随访方式,计划日期,完成日期,优先级,随访结论');
    followupSummary.completedFollowupsList.forEach(t => {
      const p = getPatientById(t.patientId);
      const typeLabel = t.type === 'phone' ? '电话' : t.type === 'sms' ? '短信' : '门诊';
      const priLabel = t.priority === 'urgent' ? '紧急' : t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低';
      lines.push([
        p?.name || '', typeLabel, t.scheduledDate, t.completedAt?.split(' ')[0] || '',
        priLabel, t.conclusion,
      ].map(encode).join(','));
    });

    const bom = '\uFEFF';
    const csv = bom + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `睡眠门诊复诊随访汇总_${reportStartDate}_${reportEndDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const totalAssessments = assessments.length;
    const avgScore = totalAssessments > 0
      ? (assessments.reduce((sum, a) => sum + a.totalScore, 0) / totalAssessments).toFixed(1)
      : '0';
    
    const highRiskCount = patients.filter(p => p.riskLevel === 'severe').length;
    const highRiskPercent = totalPatients > 0 
      ? ((highRiskCount / totalPatients) * 100).toFixed(1)
      : '0';
    
    const completedTasks = followupTasks.filter(t => t.status === 'completed').length;
    const totalTasks = followupTasks.length;
    const completionRate = totalTasks > 0
      ? ((completedTasks / totalTasks) * 100).toFixed(1)
      : '0';
    
    const medicationCount = interventions.filter(i => i.type === 'medication').length;
    const nonMedicationCount = interventions.filter(i => i.type === 'non_medication').length;

    return [
      { label: '建档患者', value: totalPatients, suffix: '人', color: 'primary', icon: Users },
      { label: '评估总量', value: totalAssessments, suffix: '次', color: 'primary', icon: FileText },
      { label: '平均 PSQI', value: avgScore, suffix: '分', color: 'warning', icon: Activity },
      { label: '高风险占比', value: highRiskPercent, suffix: '%', color: 'danger', icon: AlertTriangle },
      { label: '随访完成率', value: completionRate, suffix: '%', color: 'success', icon: CheckCircle },
      { label: '干预方案', value: interventions.length, suffix: '项', color: 'primary', icon: Target },
    ];
  }, [patients, assessments, followupTasks, interventions]);

  const riskDistribution = useMemo(() => {
    const distribution = {
      mild: 0,
      moderate: 0,
      severe: 0,
    };
    
    patients.forEach(p => {
      distribution[p.riskLevel]++;
    });

    return [
      { name: '轻度 (0-7分)', value: distribution.mild, color: '#00B42A' },
      { name: '中度 (8-14分)', value: distribution.moderate, color: '#FF7D00' },
      { name: '重度 (15-21分)', value: distribution.severe, color: '#F53F3F' },
    ];
  }, [patients]);

  const monthlyTrend = useMemo(() => {
    const monthlyData: Record<string, { month: string; assessments: number; avgScore: number; totalScore: number }> = {};
    
    assessments.forEach(assessment => {
      const date = new Date(assessment.assessmentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, assessments: 0, avgScore: 0, totalScore: 0 };
      }
      
      monthlyData[monthKey].assessments++;
      monthlyData[monthKey].totalScore += assessment.totalScore;
    });

    return Object.values(monthlyData)
      .map(d => ({
        ...d,
        avgScore: d.assessments > 0 ? Number((d.totalScore / d.assessments).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [assessments]);

  const componentAvgScores = useMemo(() => {
    const latestAssessments = patients
      .map(p => getLatestAssessment(p.id))
      .filter(Boolean) as typeof assessments;
    
    if (latestAssessments.length === 0) {
      return Object.entries(PSQI_COMPONENTS).map(([key, config]) => ({
        subject: config.label,
        current: 0,
        fullMark: 3,
      }));
    }

    const componentSums: Record<string, number> = {
      sleepQuality: 0,
      sleepLatency: 0,
      sleepDuration: 0,
      sleepEfficiency: 0,
      sleepDisturbance: 0,
      hypnoticUse: 0,
      daytimeDysfunction: 0,
    };

    latestAssessments.forEach(assessment => {
      Object.keys(componentSums).forEach(key => {
        componentSums[key] += assessment[key as keyof typeof componentSums] as number;
      });
    });

    return Object.entries(PSQI_COMPONENTS).map(([key, config]) => ({
      subject: config.label,
      current: Number((componentSums[key] / latestAssessments.length).toFixed(1)),
      fullMark: 3,
    }));
  }, [patients, getLatestAssessment]);

  const followupStats = useMemo(() => {
    const taskTypeCounts = {
      phone: 0,
      sms: 0,
      visit: 0,
    };
    
    const taskStatusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    };

    followupTasks.forEach(task => {
      taskTypeCounts[task.type]++;
      taskStatusCounts[task.status]++;
    });

    return {
      byType: [
        { name: '电话随访', value: taskTypeCounts.phone, color: '#165DFF' },
        { name: '短信提醒', value: taskTypeCounts.sms, color: '#00B42A' },
        { name: '门诊复诊', value: taskTypeCounts.visit, color: '#FF7D00' },
      ],
      byStatus: [
        { name: '待随访', value: taskStatusCounts.pending, color: '#C9CDD4' },
        { name: '进行中', value: taskStatusCounts.in_progress, color: '#165DFF' },
        { name: '已完成', value: taskStatusCounts.completed, color: '#00B42A' },
        { name: '已逾期', value: taskStatusCounts.overdue, color: '#F53F3F' },
      ],
    };
  }, [followupTasks]);

  const interventionEffect = useMemo(() => {
    const patientsWithIntervention = patients.filter(p => {
      const patientInterventions = interventions.filter(i => i.patientId === p.id);
      return patientInterventions.length > 0;
    });

    const effectData = patientsWithIntervention
      .map(patient => {
        const patientAssessments = getPatientAssessments(patient.id);
        if (patientAssessments.length < 2) return null;
        
        const firstScore = patientAssessments[patientAssessments.length - 1].totalScore;
        const latestScore = patientAssessments[0].totalScore;
        const improvement = firstScore - latestScore;
        
        return {
          name: patient.name,
          初始评分: firstScore,
          最新评分: latestScore,
          改善值: improvement,
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    return effectData;
  }, [patients, interventions, getPatientAssessments]);

  const improvementStats = useMemo(() => {
    const improved = interventionEffect.filter(d => d && d.改善值 > 0).length;
    const stable = interventionEffect.filter(d => d && d.改善值 === 0).length;
    const worsened = interventionEffect.filter(d => d && (d as any).改善值 < 0).length;

    return [
      { name: '症状改善', value: improved, color: '#00B42A' },
      { name: '保持稳定', value: stable, color: '#165DFF' },
      { name: '症状加重', value: worsened, color: '#F53F3F' },
    ];
  }, [interventionEffect]);

  const ageDistribution = useMemo(() => {
    const ageGroups = [
      { name: '18-30岁', count: 0, range: [18, 30] },
      { name: '31-45岁', count: 0, range: [31, 45] },
      { name: '46-60岁', count: 0, range: [46, 60] },
      { name: '60岁以上', count: 0, range: [61, 120] },
    ];

    patients.forEach(patient => {
      const group = ageGroups.find(g => patient.age >= g.range[0] && patient.age <= g.range[1]);
      if (group) group.count++;
    });

    return ageGroups.map(g => ({
      name: g.name,
      患者数: g.count,
    }));
  }, [patients]);

  return (
    <Layout 
      title="统计报表" 
      subtitle="门诊睡眠质量数据概览与趋势分析，辅助临床决策"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, index) => {
            const colorClasses = {
              primary: 'bg-primary-50 text-primary-600 border-primary-200',
              danger: 'bg-danger-50 text-danger-600 border-danger-200',
              warning: 'bg-warning-50 text-warning-600 border-warning-200',
              success: 'bg-success-50 text-success-600 border-success-200',
            };
            const iconBgClasses = {
              primary: 'bg-primary-100',
              danger: 'bg-danger-100',
              warning: 'bg-warning-100',
              success: 'bg-success-100',
            };
            const Icon = stat.icon;
            
            return (
              <div 
                key={stat.label}
                className={`p-4 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]} animate-fade-in-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${iconBgClasses[stat.color as keyof typeof iconBgClasses]}`}>
                    <Icon size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {stat.value}<span className="text-sm font-normal ml-1">{stat.suffix}</span>
                </p>
                <p className="text-xs opacity-70 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <Card className="animate-fade-in-up">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays size={20} className="text-primary-500" />
                复诊随访汇总
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-neutral-500" />
                  <span className="text-sm text-neutral-600">时间范围：</span>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                  <span className="text-neutral-500">至</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    min={reportStartDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Download size={16} />}
                  onClick={handleExportCSV}
                >
                  导出 CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: '新增建档患者', value: followupSummary.newPatients, suffix: '人', color: 'primary', icon: Users },
                { label: '完成 PSQI 评估', value: followupSummary.completedAssessments, suffix: '次', color: 'primary', icon: FileText },
                { label: '完成随访任务', value: followupSummary.completedFollowups, suffix: '项', color: 'success', icon: CheckCircle },
                { label: '周期平均 PSQI', value: followupSummary.avgScore, suffix: '分', color: 'warning', icon: Activity },
                { label: '触达总次数', value: followupSummary.totalContacts, suffix: '次', color: 'primary', icon: Clock },
              ].map((stat, index) => {
                const colorClasses = {
                  primary: 'bg-primary-50 text-primary-600 border-primary-200',
                  danger: 'bg-danger-50 text-danger-600 border-danger-200',
                  warning: 'bg-warning-50 text-warning-600 border-warning-200',
                  success: 'bg-success-50 text-success-600 border-success-200',
                };
                const iconBgClasses = {
                  primary: 'bg-primary-100',
                  danger: 'bg-danger-100',
                  warning: 'bg-warning-100',
                  success: 'bg-success-100',
                };
                const Icon = stat.icon;
                return (
                  <div 
                    key={stat.label}
                    className={`p-4 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2 rounded-lg ${iconBgClasses[stat.color as keyof typeof iconBgClasses]}`}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-mono">
                      {stat.value}<span className="text-sm font-normal ml-1">{stat.suffix}</span>
                    </p>
                    <p className="text-xs opacity-70 mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-neutral-200">
              <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-center">
                <TrendingUp size={24} className="text-success-500 mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-success-600">{followupSummary.improvedCount}</p>
                <p className="text-xs text-success-700 mt-1">症状改善（PSQI 下降 ≥ 3）</p>
              </div>
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-center">
                <Activity size={24} className="text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-primary-600">{followupSummary.stableCount}</p>
                <p className="text-xs text-primary-700 mt-1">保持稳定（波动 {'<'} 3）</p>
              </div>
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-center">
                <AlertTriangle size={24} className="text-danger-500 mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-danger-600">{followupSummary.worsenedCount}</p>
                <p className="text-xs text-danger-700 mt-1">症状加重（PSQI 上升 ≥ 3）</p>
              </div>
              <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-center">
                <Target size={24} className="text-warning-500 mx-auto mb-2" />
                <p className="text-2xl font-bold font-mono text-warning-600">{followupSummary.severeCount}</p>
                <p className="text-xs text-warning-700 mt-1">重度评估（PSQI ≥ 15）</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-4 text-center">
              提示：点击"导出 CSV"可将本周期数据导出，用于科室周会汇报，文件包含新增患者、评估明细、随访完成明细。
            </p>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart size={18} className="text-primary-500" />
                风险分层分布
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#C9CDD4', strokeWidth: 1 }}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {riskDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-neutral-600">
                      {item.name}: {item.value}人
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary-500" />
                月度评分趋势
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#165DFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#165DFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E6EB" />
                    <XAxis dataKey="month" stroke="#86909C" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#86909C" fontSize={12} domain={[0, 21]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#86909C" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E5E6EB',
                        borderRadius: '8px',
                      }} 
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgScore"
                      name="平均 PSQI"
                      stroke="#165DFF"
                      strokeWidth={2}
                      fill="url(#colorScore)"
                      dot={{ fill: '#165DFF', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="assessments"
                      name="评估次数"
                      stroke="#FF7D00"
                      strokeWidth={2}
                      dot={{ fill: '#FF7D00', strokeWidth: 2, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={18} className="text-primary-500" />
                各分项得分均值
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={componentAvgScores}>
                    <PolarGrid stroke="#E5E6EB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#4E5969' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fontSize: 11 }} />
                    <Radar
                      name="平均得分"
                      dataKey="current"
                      stroke="#165DFF"
                      fill="#165DFF"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {componentAvgScores.map((item, index) => (
                  <Badge key={index} variant="neutral" size="sm">
                    {item.subject}: {item.current}分
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={18} className="text-primary-500" />
                随访任务统计
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-3">任务类型分布</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={followupStats.byType}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ value }) => value}
                        >
                          {followupStats.byType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {followupStats.byType.map((item, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-neutral-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-3">任务状态分布</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={followupStats.byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ value }) => value}
                        >
                          {followupStats.byStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {followupStats.byStatus.map((item, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-neutral-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary-500" />
                年龄分布
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E6EB" />
                    <XAxis dataKey="name" stroke="#86909C" fontSize={12} />
                    <YAxis stroke="#86909C" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E5E6EB',
                        borderRadius: '8px',
                      }} 
                    />
                    <Bar 
                      dataKey="患者数" 
                      fill="#165DFF" 
                      radius={[4, 4, 0, 0]}
                      barSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill size={18} className="text-primary-500" />
                干预效果分析
              </CardTitle>
            </CardHeader>
            <CardBody>
              {interventionEffect.length === 0 ? (
                <div className="h-72 flex items-center justify-center">
                  <p className="text-neutral-500">暂无足够数据进行干预效果分析</p>
                </div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={interventionEffect}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E6EB" />
                        <XAxis dataKey="name" stroke="#86909C" fontSize={11} />
                        <YAxis stroke="#86909C" fontSize={12} domain={[0, 21]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #E5E6EB',
                            borderRadius: '8px',
                          }} 
                        />
                        <Legend />
                        <Bar 
                          dataKey="初始评分" 
                          fill="#F53F3F" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="最新评分" 
                          fill="#00B42A" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-neutral-200">
                    {improvementStats.map((item, index) => (
                      <div key={index} className="text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                          style={{ backgroundColor: `${item.color}20` }}
                        >
                          <span 
                            className="text-lg font-bold"
                            style={{ color: item.color }}
                          >
                            {item.value}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound size={18} className="text-primary-500" />
              随访质控视图
            </CardTitle>
          </CardHeader>
          <CardBody>
            {operatorStats.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <UserRound size={40} className="mx-auto mb-2 text-neutral-300" />
                <p>暂无随访专员数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">随访专员</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">待办</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">已完成</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">已逾期</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">触达失败</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">触达总数</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorStats.map((op, index) => {
                      const failedRate = op.totalContacts > 0
                        ? ((op.failedContacts / op.totalContacts) * 100).toFixed(1)
                        : '0';
                      return (
                        <tr key={op.name} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-xs">
                                {op.name.slice(0, 1)}
                              </div>
                              <span className="font-medium text-neutral-700">{op.name}</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="warning" size="sm">{op.pending}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="success" size="sm">{op.completed}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="danger" size="sm">{op.overdue}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <XCircle size={14} className="text-danger-500" />
                              <span className={op.failedContacts > 0 ? 'text-danger-600 font-medium' : 'text-neutral-500'}>
                                {op.failedContacts}
                              </span>
                              <span className="text-xs text-neutral-400">({failedRate}%)</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 text-neutral-600">
                            {op.totalContacts}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Button
                              size="xs"
                              variant="ghost"
                              leftIcon={<Eye size={14} />}
                              onClick={() => {
                                setSelectedOperator(op.name);
                                setShowOperatorDetail(true);
                              }}
                            >
                              查看详情
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-4">
              提示：护士长可根据待办和逾期情况分配工作，触达失败率较高的专员建议进行沟通技巧培训。
            </p>
          </CardBody>
        </Card>

        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} className="text-primary-500" />
              数据摘要说明
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-primary-50 rounded-lg">
                <h4 className="font-medium text-primary-700 mb-2">PSQI 评分标准</h4>
                <ul className="space-y-1 text-sm text-primary-600">
                  <li>• 0-7 分：轻度睡眠问题</li>
                  <li>• 8-14 分：中度睡眠问题</li>
                  <li>• 15-21 分：重度睡眠问题</li>
                </ul>
              </div>
              <div className="p-4 bg-warning-50 rounded-lg">
                <h4 className="font-medium text-warning-700 mb-2">随访间隔建议</h4>
                <ul className="space-y-1 text-sm text-warning-600">
                  <li>• 轻度：每 30 天随访</li>
                  <li>• 中度：每 14 天随访</li>
                  <li>• 重度：每 7 天随访</li>
                </ul>
              </div>
              <div className="p-4 bg-success-50 rounded-lg">
                <h4 className="font-medium text-success-700 mb-2">干预效果判定</h4>
                <ul className="space-y-1 text-sm text-success-600">
                  <li>• PSQI 下降 ≥ 3 分：显著改善</li>
                  <li>• PSQI 波动 ±2 分：保持稳定</li>
                  <li>• PSQI 上升 ≥ 3 分：症状加重</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={showOperatorDetail && !!selectedOperator}
        onClose={() => {
          setShowOperatorDetail(false);
          setSelectedOperator(null);
        }}
        title={`随访专员详情 - ${selectedOperator || ''}`}
        size="xl"
        footer={
          <Button variant="ghost" onClick={() => {
            setShowOperatorDetail(false);
            setSelectedOperator(null);
          }}>关闭</Button>
        }
      >
        {selectedOperatorData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-warning-50 border border-warning-200 text-center">
                <p className="text-xs text-warning-600">待办任务</p>
                <p className="text-2xl font-bold font-mono text-warning-700 mt-1">
                  {selectedOperatorData.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success-50 border border-success-200 text-center">
                <p className="text-xs text-success-600">已完成</p>
                <p className="text-2xl font-bold font-mono text-success-700 mt-1">
                  {selectedOperatorData.tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-center">
                <p className="text-xs text-danger-600">已逾期</p>
                <p className="text-2xl font-bold font-mono text-danger-700 mt-1">
                  {selectedOperatorData.tasks.filter(t => t.status === 'overdue').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50 border border-primary-200 text-center">
                <p className="text-xs text-primary-600">触达总次数</p>
                <p className="text-2xl font-bold font-mono text-primary-700 mt-1">
                  {selectedOperatorData.contacts.length}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-1.5">
                <Clock size={16} className="text-primary-500" />
                处理中的随访任务
              </h4>
              {selectedOperatorData.tasks.filter(t => t.status !== 'completed').length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-sm bg-neutral-50 rounded-lg">
                  暂无待处理任务
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedOperatorData.tasks
                    .filter(t => t.status !== 'completed')
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                    .map((task) => {
                    const patient = getPatientById(task.patientId);
                    const latest = patient ? getLatestAssessment(patient.id) : null;
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-700">{patient?.name || '未知患者'}</span>
                            {latest && <Badge variant={latest.totalScore >= 15 ? 'danger' : latest.totalScore >= 8 ? 'warning' : 'success'} size="xs">
                              PSQI {latest.totalScore}
                            </Badge>}
                            <Badge variant={task.status === 'overdue' ? 'danger' : task.status === 'in_progress' ? 'primary' : 'neutral'} size="xs">
                              {task.status === 'pending' ? '待随访' : task.status === 'in_progress' ? '进行中' : '已逾期'}
                            </Badge>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-3 flex-wrap">
                            <span>计划：{task.scheduledDate}</span>
                            <span>{task.type === 'phone' ? '电话' : task.type === 'sms' ? '短信' : '门诊'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-1.5">
                <CheckCircle size={16} className="text-success-500" />
                已完成随访（带结论）
              </h4>
              {selectedOperatorData.tasks.filter(t => t.status === 'completed').length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-sm bg-neutral-50 rounded-lg">
                  暂无已完成随访
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedOperatorData.tasks
                    .filter(t => t.status === 'completed')
                    .sort((a, b) => new Date(b.completedAt || b.scheduledDate).getTime() - new Date(a.completedAt || a.scheduledDate).getTime())
                    .map((task) => {
                    const patient = getPatientById(task.patientId);
                    const latest = patient ? getLatestAssessment(patient.id) : null;
                    return (
                      <div key={task.id} className="p-3 rounded-lg border border-success-200 bg-success-50/40 hover:bg-success-50/70 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-700">{patient?.name || '未知患者'}</span>
                            {latest && <Badge variant={latest.totalScore >= 15 ? 'danger' : latest.totalScore >= 8 ? 'warning' : 'success'} size="xs">
                              PSQI {latest.totalScore}
                            </Badge>}
                            <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'neutral'} size="xs">
                              {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </Badge>
                          </div>
                          <span className="text-xs text-neutral-500">
                            完成：{task.completedAt || task.scheduledDate}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-3 flex-wrap mb-2">
                          <span>原计划：{task.scheduledDate}</span>
                          <span>{task.type === 'phone' ? '电话' : task.type === 'sms' ? '短信' : '门诊'}随访</span>
                        </div>
                        <div className="p-2.5 rounded-md bg-white border border-success-100">
                          <p className="text-xs text-neutral-500 mb-0.5">随访结论：</p>
                          <p className="text-sm text-neutral-700">
                            {task.conclusion || <span className="text-neutral-400 italic">未填写结论</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-1.5">
                <CheckCircle size={16} className="text-success-500" />
                最近触达记录
              </h4>
              {selectedOperatorData.contacts.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-sm bg-neutral-50 rounded-lg">
                  暂无触达记录
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedOperatorData.contacts.slice(0, 20).map((c) => {
                    const patient = getPatientById(c.patientId);
                    return (
                      <div key={c.id} className="p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-700">{patient?.name || '未知患者'}</span>
                            <Badge variant={c.result === 'success' ? 'success' : 'danger'} size="xs">
                              {c.result === 'success' ? '联系成功' : c.result === 'no_answer' ? '无人接听' : '联系失败'}
                            </Badge>
                          </div>
                          <span className="text-xs text-neutral-500">{c.contactTime}</span>
                        </div>
                        {c.content && (
                          <p className="text-sm text-neutral-600 line-clamp-2">{c.content}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Reports;
