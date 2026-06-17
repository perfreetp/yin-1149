import React, { useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PatientCard } from '@/components/PatientCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAppStore } from '@/store/useAppStore';
import { RISK_LEVELS } from '@/types';
import { getToday } from '@/utils/date';
import { getRiskLevel } from '@/utils/psqi';

const PatientList: React.FC = () => {
  const {
    patients,
    getFilteredPatients,
    searchQuery,
    filterRiskLevel,
    setSearchQuery,
    setFilterRiskLevel,
    addPatient,
    getHighRiskPatients,
    getPendingTasks,
    assessments,
    followupTasks,
  } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    age: 0,
    phone: '',
    medicalRecordNo: '',
    chiefComplaint: '',
    medicalHistory: '',
    medicationHistory: '',
  });
  
  const filteredPatients = getFilteredPatients();
  const highRiskCount = getHighRiskPatients().length;
  const pendingTaskCount = getPendingTasks().length;
  const totalAssessments = assessments.length;
  
  const handleAddPatient = () => {
    const patient = addPatient({
      ...newPatient,
      firstVisitDate: getToday(),
      riskLevel: 'mild',
    });
    setIsModalOpen(false);
    setNewPatient({
      name: '',
      gender: 'male',
      age: 0,
      phone: '',
      medicalRecordNo: '',
      chiefComplaint: '',
      medicalHistory: '',
      medicationHistory: '',
    });
  };
  
  const stats = [
    { label: '总患者数', value: patients.length, color: 'primary' },
    { label: '高风险患者', value: highRiskCount, color: 'danger' },
    { label: '待随访任务', value: pendingTaskCount, color: 'warning' },
    { label: '评估总数', value: totalAssessments, color: 'success' },
  ];
  
  return (
    <Layout 
      title="患者列表" 
      subtitle={`共 ${filteredPatients.length} 位患者，点击卡片查看详情或录入评估`}
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="搜索患者姓名、病历号、电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-72 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-neutral-500" />
              <select
                value={filterRiskLevel}
                onChange={(e) => setFilterRiskLevel(e.target.value)}
                className="px-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="">全部风险等级</option>
                {Object.entries(RISK_LEVELS).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <Button 
            leftIcon={<Plus size={18} />}
            onClick={() => setIsModalOpen(true)}
          >
            新增患者
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((patient, index) => (
            <PatientCard key={patient.id} patient={patient} index={index} />
          ))}
        </div>
        
        {filteredPatients.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
            <p className="text-neutral-500">暂无符合条件的患者</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsModalOpen(true)}
            >
              新增第一位患者
            </Button>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新增患者"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button onClick={handleAddPatient}>确认添加</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="患者姓名"
              placeholder="请输入患者姓名"
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
            />
            <Select
              label="性别"
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
              ]}
              value={newPatient.gender}
              onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as 'male' | 'female' })}
            />
            <Input
              label="年龄"
              type="number"
              placeholder="请输入年龄"
              value={newPatient.age || ''}
              onChange={(e) => setNewPatient({ ...newPatient, age: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="联系电话"
              placeholder="请输入联系电话"
              value={newPatient.phone}
              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
            />
            <Input
              label="病历号"
              placeholder="请输入病历号"
              value={newPatient.medicalRecordNo}
              onChange={(e) => setNewPatient({ ...newPatient, medicalRecordNo: e.target.value })}
            />
          </div>
          <Textarea
            label="主诉"
            placeholder="请输入患者主要症状及持续时间"
            value={newPatient.chiefComplaint}
            onChange={(e) => setNewPatient({ ...newPatient, chiefComplaint: e.target.value })}
          />
          <Textarea
            label="既往病史"
            placeholder="请输入患者既往病史"
            value={newPatient.medicalHistory}
            onChange={(e) => setNewPatient({ ...newPatient, medicalHistory: e.target.value })}
          />
          <Textarea
            label="用药史"
            placeholder="请输入患者当前或近期用药情况"
            value={newPatient.medicationHistory}
            onChange={(e) => setNewPatient({ ...newPatient, medicationHistory: e.target.value })}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default PatientList;
