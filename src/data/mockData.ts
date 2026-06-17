import type { Patient, PSQIAssessment, FollowupTask, Intervention, ContactRecord } from '@/types';
import { getRiskLevel } from '@/utils/psqi';
import { addDays, formatDate } from '@/utils/date';

const generateId = () => Math.random().toString(36).substring(2, 15);

const patientNames = [
  '张明华', '李雪梅', '王建国', '赵晓东', '刘美玲', '陈志强', '杨秀兰', '周伟',
  '吴丽娟', '郑海涛', '孙梦琪', '黄丽华', '朱军', '林淑芬', '许阳', '何静',
  '高鹏飞', '罗敏', '谢伟明', '韩雪'
];

const complaints = [
  '入睡困难3个月，夜间易醒', '多梦，睡眠浅', '早醒，醒后无法再入睡', '打鼾，白天嗜睡',
  '睡眠呼吸暂停', '睡眠质量差，白天乏力', '失眠伴焦虑', '夜间频繁醒来',
  '睡眠不足，注意力不集中', '失眠伴抑郁情绪'
];

const medicalHistories = [
  '高血压病史5年', '糖尿病', '无特殊病史', '过敏性鼻炎', '颈椎病',
  '抑郁症病史', '焦虑症', '甲状腺功能异常', '心脏病', '无慢性病史'
];

const medications = [
  '苯二氮卓类药物', '非苯二氮卓类催眠药', '抗抑郁药', '降压药', '无规律用药', '中药调理'
];

export const generateMockPatients = (): Patient[] => {
  const patients: Patient[] = [];
  
  for (let i = 0; i < 20; i++) {
    const scores = {
      sleepQuality: Math.floor(Math.random() * 4),
      sleepLatency: Math.floor(Math.random() * 4),
      sleepDuration: Math.floor(Math.random() * 4),
      sleepEfficiency: Math.floor(Math.random() * 4),
      sleepDisturbance: Math.floor(Math.random() * 4),
      hypnoticUse: Math.floor(Math.random() * 4),
      daytimeDysfunction: Math.floor(Math.random() * 4),
    };
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    const firstVisitDate = addDays(new Date(), -Math.floor(Math.random() * 90) - 7);
    
    patients.push({
      id: generateId(),
      name: patientNames[i],
      gender: Math.random() > 0.5 ? 'male' : 'female',
      age: 25 + Math.floor(Math.random() * 50),
      phone: `1${3 + Math.floor(Math.random() * 6)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      medicalRecordNo: `SL${String(i + 1).padStart(5, '0')}`,
      firstVisitDate: formatDate(firstVisitDate),
      chiefComplaint: complaints[Math.floor(Math.random() * complaints.length)],
      medicalHistory: medicalHistories[Math.floor(Math.random() * medicalHistories.length)],
      medicationHistory: medications[Math.floor(Math.random() * medications.length)],
      riskLevel: getRiskLevel(totalScore),
      createdAt: formatDateTime(firstVisitDate),
      updatedAt: formatDateTime(new Date()),
    });
  }
  
  return patients;
};

export const generateMockAssessments = (patients: Patient[]): PSQIAssessment[] => {
  const assessments: PSQIAssessment[] = [];
  
  patients.forEach((patient) => {
    const assessmentCount = 1 + Math.floor(Math.random() * 4);
    const baseDate = new Date(patient.firstVisitDate);
    
    for (let i = 0; i < assessmentCount; i++) {
      const assessmentDate = addDays(baseDate, i * (7 + Math.floor(Math.random() * 14)));
      
      const scores = {
        sleepQuality: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        sleepLatency: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        sleepDuration: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        sleepEfficiency: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        sleepDisturbance: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        hypnoticUse: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
        daytimeDysfunction: Math.max(0, Math.min(3, Math.floor(Math.random() * 4))),
      };
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      
      assessments.push({
        id: generateId(),
        patientId: patient.id,
        ...scores,
        totalScore,
        assessmentType: i === 0 ? 'initial' : 'followup',
        notes: '',
        assessmentDate: formatDate(assessmentDate),
        createdAt: formatDateTime(assessmentDate),
      });
    }
  });
  
  return assessments;
};

export const generateMockFollowupTasks = (patients: Patient[], assessments: PSQIAssessment[]): FollowupTask[] => {
  const tasks: FollowupTask[] = [];
  const statuses: FollowupTask['status'][] = ['pending', 'in_progress', 'completed', 'overdue'];
  const priorities: FollowupTask['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const types: FollowupTask['type'][] = ['phone', 'sms', 'visit'];
  const operators = ['张医生', '李护士', '王专员', '赵护士'];
  
  assessments.forEach((assessment) => {
    if (Math.random() > 0.7) return;
    
    const riskLevel = getRiskLevel(assessment.totalScore);
    const interval = riskLevel === 'severe' ? 7 : riskLevel === 'moderate' ? 14 : 30;
    const scheduledDate = addDays(assessment.assessmentDate, interval);
    const statusIndex = Math.floor(Math.random() * 4);
    const status = statuses[statusIndex];
    
    tasks.push({
      id: generateId(),
      patientId: assessment.patientId,
      type: riskLevel === 'severe' ? 'phone' : types[Math.floor(Math.random() * 3)],
      scheduledDate: formatDate(scheduledDate),
      status,
      priority: riskLevel === 'severe' ? 'urgent' : riskLevel === 'moderate' ? 'high' : priorities[Math.floor(Math.random() * 2)],
      conclusion: status === 'completed' ? '随访完成，患者情况稳定' : '',
      assignedTo: status !== 'pending' ? operators[Math.floor(Math.random() * operators.length)] : '',
      createdAt: formatDateTime(addDays(scheduledDate, -3)),
      completedAt: status === 'completed' ? formatDateTime(addDays(scheduledDate, Math.floor(Math.random() * 3))) : '',
    });
  });
  
  return tasks;
};

export const generateMockInterventions = (patients: Patient[]): Intervention[] => {
  const interventions: Intervention[] = [];
  const medicationNames = ['唑吡坦', '右佐匹克隆', '艾司唑仑', '阿普唑仑', '米氮平', '曲唑酮'];
  const nonMedicationNames = ['CBT-I认知行为治疗', '睡眠限制疗法', '放松训练', '正念冥想', '经颅磁刺激'];
  
  patients.forEach((patient) => {
    if (Math.random() > 0.6) return;
    
    const isMedication = Math.random() > 0.5;
    const names = isMedication ? medicationNames : nonMedicationNames;
    const startDate = addDays(new Date(patient.firstVisitDate), Math.floor(Math.random() * 14));
    
    interventions.push({
      id: generateId(),
      patientId: patient.id,
      type: isMedication ? 'medication' : 'non_medication',
      name: names[Math.floor(Math.random() * names.length)],
      dosage: isMedication ? `${5 + Math.floor(Math.random() * 10)}mg` : '1次/日',
      frequency: isMedication ? '睡前服用' : '每周3次',
      startDate: formatDate(startDate),
      endDate: formatDate(addDays(startDate, 30 + Math.floor(Math.random() * 60))),
      notes: '',
      createdAt: formatDateTime(startDate),
    });
  });
  
  return interventions;
};

export const generateMockContactRecords = (patients: Patient[], tasks: FollowupTask[]): ContactRecord[] => {
  const records: ContactRecord[] = [];
  const contents = [
    '电话联系患者，提醒按时服药，患者表示睡眠情况有所改善',
    '短信发送随访提醒，患者回复确认',
    '电话随访，患者主诉仍有入睡困难，建议调整用药',
    '短信发送睡眠健康指导',
    '电话确认复诊时间',
    '患者未接电话，稍后再联系',
  ];
  const results: ContactRecord['result'][] = ['success', 'failed', 'no_answer'];
  const operators = ['张医生', '李护士', '王专员'];
  
  tasks.forEach((task) => {
    if (task.status === 'pending') return;
    
    records.push({
      id: generateId(),
      patientId: task.patientId,
      followupTaskId: task.id,
      type: task.type,
      content: contents[Math.floor(Math.random() * contents.length)],
      result: results[Math.floor(Math.random() * results.length)],
      operator: operators[Math.floor(Math.random() * operators.length)],
      contactTime: formatDateTime(addDays(new Date(task.scheduledDate), Math.floor(Math.random() * 3))),
    });
  });
  
  return records;
};

function formatDateTime(date: Date): string {
  return formatDate(date) + ' ' + 
    String(Math.floor(Math.random() * 10 + 8)).padStart(2, '0') + ':' + 
    String(Math.floor(Math.random() * 60)).padStart(2, '0');
}

export const mockPatients = generateMockPatients();
export const mockAssessments = generateMockAssessments(mockPatients);
export const mockFollowupTasks = generateMockFollowupTasks(mockPatients, mockAssessments);
export const mockInterventions = generateMockInterventions(mockPatients);
export const mockContactRecords = generateMockContactRecords(mockPatients, mockFollowupTasks);
