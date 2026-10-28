import "./PatientCareTeam.css";
import PatientDashboardJournal from "../../../ds/stillwell-design-system/mockups/PatientDashboardJournal";

export default function PatientCareTeam() {
  return (
    <div className="stillwell-patient-preview">
      <PatientDashboardJournal initialView="care-team" />
    </div>
  );
}
