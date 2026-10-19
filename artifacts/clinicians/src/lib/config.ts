export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export function sendPatientToDashboard() {
  window.location.assign('/dashboard');
}
