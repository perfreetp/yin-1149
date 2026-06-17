import React, { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/store/useAppStore';
import { RISK_LEVELS, PSQI_COMPONENTS } from '@/types';
import { getRiskLevel } from '@/utils/psqi';
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
    getLatestAssessment,
    getPatientAssessments,
  } = useAppStore();

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
    </Layout>
  );
};

export default Reports;
