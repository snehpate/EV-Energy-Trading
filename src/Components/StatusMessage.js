import React from "react";

const StatusMessage = ({ status }) => {
  if (!status?.message) return null;
  return <p className={`status status-${status.type}`}>{status.message}</p>;
};

export default StatusMessage;
