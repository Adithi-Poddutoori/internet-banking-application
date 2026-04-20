export default function StatCard({ label, value, helper }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__helper">{helper}</div>
    </div>
  );
}
