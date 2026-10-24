import React from "react";
import { ECO_SOURCES } from "../utils/web3";

const EnergySourceSelect = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">Select an energy source</option>
    {ECO_SOURCES.map((source) => (
      <option key={source} value={source}>{source}</option>
    ))}
  </select>
);

export default EnergySourceSelect;
