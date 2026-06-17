import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PatientList from "@/pages/PatientList";
import Assessment from "@/pages/Assessment";
import FollowupPlan from "@/pages/FollowupPlan";
import AlertBoard from "@/pages/AlertBoard";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/patients" replace />} />
        <Route path="/patients" element={<PatientList />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/assessment/:patientId" element={<Assessment />} />
        <Route path="/followup" element={<FollowupPlan />} />
        <Route path="/alerts" element={<AlertBoard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/patients" replace />} />
      </Routes>
    </Router>
  );
}
