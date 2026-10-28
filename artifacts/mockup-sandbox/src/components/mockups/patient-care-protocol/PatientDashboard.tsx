import "./PatientCareTeam.css";
import PatientDashboardJournal from "../../../ds/stillwell-design-system/mockups/PatientDashboardJournal";

export default function PatientDashboard() {
  return (
    <div className="stillwell-patient-preview">
      <PatientDashboardJournal initialView="dashboard" />
    </div>
  );
}
