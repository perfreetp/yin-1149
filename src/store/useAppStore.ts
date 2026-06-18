import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient, PSQIAssessment, FollowupTask, Intervention, ContactRecord } from '@/types';
import { mockPatients, mockAssessments, mockFollowupTasks, mockInterventions, mockContactRecords } from '@/data/mockData';
import { generateFollowupTask, getRiskLevel } from '@/utils/psqi';
import { formatDateTime, getToday } from '@/utils/date';

interface AppState {
  patients: Patient[];
  assessments: PSQIAssessment[];
  followupTasks: FollowupTask[];
  interventions: Intervention[];
  contactRecords: ContactRecord[];
  currentPatient: Patient | null;
  selectedPatientId: string | null;
  searchQuery: string;
  filterRiskLevel: string;
  filterTaskStatus: string;
  
  setCurrentPatient: (patient: Patient | null) => void;
  setSelectedPatientId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterRiskLevel: (level: string) => void;
  setFilterTaskStatus: (status: string) => void;
  
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  getPatientById: (id: string) => Patient | undefined;
  getPatientAssessments: (patientId: string) => PSQIAssessment[];
  getPatientTasks: (patientId: string) => FollowupTask[];
  getPatientInterventions: (patientId: string) => Intervention[];
  getPatientContactRecords: (patientId: string) => ContactRecord[];
  getLatestAssessment: (patientId: string) => PSQIAssessment | undefined;
  
  addAssessment: (assessment: Omit<PSQIAssessment, 'id' | 'createdAt'>) => void;
  addFollowupTask: (task: Omit<FollowupTask, 'id' | 'createdAt'>) => void;
  updateFollowupTask: (id: string, updates: Partial<FollowupTask>) => void;
  addContactRecord: (record: Omit<ContactRecord, 'id'>) => void;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'createdAt'>) => void;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  getNextFollowupTask: (patientId: string) => FollowupTask | undefined;
  getTasksByOperator: (operator: string) => FollowupTask[];
  
  getHighRiskPatients: () => Patient[];
  getOverdueTasks: () => FollowupTask[];
  getPendingTasks: () => FollowupTask[];
  getFilteredPatients: () => Patient[];
  getFilteredTasks: () => FollowupTask[];
  
  initMockData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  patients: [],
  assessments: [],
  followupTasks: [],
  interventions: [],
  contactRecords: [],
  currentPatient: null,
  selectedPatientId: null,
  searchQuery: '',
  filterRiskLevel: '',
  filterTaskStatus: '',
  
  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterRiskLevel: (level) => set({ filterRiskLevel: level }),
  setFilterTaskStatus: (status) => set({ filterTaskStatus: status }),
  
  addPatient: (patientData) => {
    const newPatient: Patient = {
      ...patientData,
      id: generateId(),
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
    };
    set((state) => ({
      patients: [...state.patients, newPatient],
    }));
    return newPatient;
  },
  
  updatePatient: (id, updates) => {
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: formatDateTime(new Date()) } : p
      ),
    }));
  },
  
  getPatientById: (id) => {
    return get().patients.find((p) => p.id === id);
  },
  
  getPatientAssessments: (patientId) => {
    return get().assessments
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
  },
  
  getPatientTasks: (patientId) => {
    return get().followupTasks
      .filter((t) => t.patientId === patientId)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  },
  
  getPatientInterventions: (patientId) => {
    return get().interventions
      .filter((i) => i.patientId === patientId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },
  
  getPatientContactRecords: (patientId) => {
    return get().contactRecords
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => new Date(b.contactTime).getTime() - new Date(a.contactTime).getTime());
  },
  
  getLatestAssessment: (patientId) => {
    const assessments = get().getPatientAssessments(patientId);
    return assessments[0];
  },
  
  addAssessment: (assessmentData) => {
    const newAssessment: PSQIAssessment = {
      ...assessmentData,
      id: generateId(),
      createdAt: formatDateTime(new Date()),
    };
    
    set((state) => ({
      assessments: [...state.assessments, newAssessment],
    }));
    
    const riskLevel = getRiskLevel(assessmentData.totalScore);
    get().updatePatient(assessmentData.patientId, { riskLevel });
    
    const taskData = generateFollowupTask(assessmentData.patientId, newAssessment);
    get().addFollowupTask({
      ...taskData,
      completedAt: '',
    });
    
    return newAssessment;
  },
  
  addFollowupTask: (taskData) => {
    const newTask: FollowupTask = {
      ...taskData,
      id: generateId(),
      createdAt: formatDateTime(new Date()),
    };
    set((state) => ({
      followupTasks: [...state.followupTasks, newTask],
    }));
    return newTask;
  },
  
  updateFollowupTask: (id, updates) => {
    set((state) => ({
      followupTasks: state.followupTasks.map((t) => {
        if (t.id !== id) return t;
        if (updates.scheduledDate && updates.scheduledDate !== t.scheduledDate) {
          const historyEntry = {
            fromDate: t.scheduledDate,
            toDate: updates.scheduledDate,
            operator: (updates as any)._operator || '系统',
            time: formatDateTime(new Date()),
            reason: (updates as any)._rescheduleReason,
          };
          const cleanedUpdates = { ...updates };
          delete (cleanedUpdates as any)._operator;
          delete (cleanedUpdates as any)._rescheduleReason;
          return {
            ...t,
            ...cleanedUpdates,
            rescheduleHistory: [...(t.rescheduleHistory || []), historyEntry],
          };
        }
        return { ...t, ...updates };
      }),
    }));
  },
  
  addContactRecord: (recordData) => {
    const newRecord: ContactRecord = {
      ...recordData,
      id: generateId(),
    };
    set((state) => ({
      contactRecords: [...state.contactRecords, newRecord],
    }));
    return newRecord;
  },
  
  addIntervention: (interventionData) => {
    const newIntervention: Intervention = {
      ...interventionData,
      id: generateId(),
      createdAt: formatDateTime(new Date()),
    };
    set((state) => ({
      interventions: [...state.interventions, newIntervention],
    }));
    return newIntervention;
  },
  
  updateIntervention: (id, updates) => {
    set((state) => ({
      interventions: state.interventions.map((i) => {
        if (i.id !== id) return i;
        const operator = (updates as any)._operator || '医生';
        const note = (updates as any)._adjustmentNote || '方案调整';
        const cleanedUpdates = { ...updates };
        delete (cleanedUpdates as any)._operator;
        delete (cleanedUpdates as any)._adjustmentNote;
        return {
          ...i,
          ...cleanedUpdates,
          adjustmentHistory: [...(i.adjustmentHistory || []), {
            time: formatDateTime(new Date()),
            operator,
            note,
          }],
        };
      }),
    }));
  },
  
  getNextFollowupTask: (patientId) => {
    return get().followupTasks
      .filter((t) => t.patientId === patientId && t.status !== 'completed')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
  },
  
  getTasksByOperator: (operator) => {
    return get().followupTasks.filter((t) => t.assignedTo === operator);
  },
  
  getHighRiskPatients: () => {
    return get().patients.filter((p) => p.riskLevel === 'severe');
  },
  
  getOverdueTasks: () => {
    const today = getToday();
    return get().followupTasks.filter(
      (t) => t.status !== 'completed' && t.scheduledDate < today
    );
  },
  
  getPendingTasks: () => {
    return get().followupTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  },
  
  getFilteredPatients: () => {
    const { patients, searchQuery, filterRiskLevel } = get();
    return patients.filter((p) => {
      const matchesSearch = !searchQuery || 
        p.name.includes(searchQuery) || 
        p.medicalRecordNo.includes(searchQuery) ||
        p.phone.includes(searchQuery);
      const matchesRisk = !filterRiskLevel || p.riskLevel === filterRiskLevel;
      return matchesSearch && matchesRisk;
    });
  },
  
  getFilteredTasks: () => {
    const { followupTasks, filterTaskStatus } = get();
    return followupTasks
      .filter((t) => !filterTaskStatus || t.status === filterTaskStatus)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  },
  
  initMockData: () => {
    set({
      patients: mockPatients,
      assessments: mockAssessments,
      followupTasks: mockFollowupTasks,
      interventions: mockInterventions,
      contactRecords: mockContactRecords,
    });
  },
    }),
    {
      name: 'sleep-clinic-storage',
      partialize: (state) => ({
        patients: state.patients,
        assessments: state.assessments,
        followupTasks: state.followupTasks,
        interventions: state.interventions,
        contactRecords: state.contactRecords,
      }),
    }
  )
);
