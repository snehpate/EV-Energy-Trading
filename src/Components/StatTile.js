import React from "react";

const StatTile = ({ label, value, hint }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
    {hint && <span className="stat-hint">{hint}</span>}
  </div>
);

export default StatTile;
