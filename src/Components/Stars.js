import React from "react";

// Read-only star display, or a 1-5 picker when `onRate` is given
const Stars = ({ value = 0, count, onRate, disabled }) => {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onRate ? (
          <button
            key={n}
            className="star-button"
            title={`Rate ${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onRate(n)}
            disabled={disabled}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= rounded ? "star filled" : "star"}>★</span>
        )
      )}
      {count !== undefined && (
        <span className="muted"> {count > 0 ? `${value.toFixed(1)} (${count})` : "No ratings"}</span>
      )}
    </span>
  );
};

export default Stars;
