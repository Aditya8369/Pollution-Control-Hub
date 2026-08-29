import React, { useState } from "react";

const CommuteForm = ({ onSearch }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedStart = start.trim();
    const trimmedEnd = end.trim();
    if (trimmedStart && trimmedEnd) {
      onSearch(trimmedStart, trimmedEnd);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="commute-form" data-testid="commute-form">
      <div className="commute-input-group">
        <label htmlFor="commute-start">Start Location</label>
        <input
          id="commute-start"
          type="text"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          placeholder="Enter start location"
          required
        />
      </div>
      <div className="commute-input-group">
        <label htmlFor="commute-end">Destination</label>
        <input
          id="commute-end"
          type="text"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="Enter destination"
          required
        />
      </div>
      <button type="submit" className="commute-search-btn">
        Search Routes
      </button>
    </form>
  );
};

export default CommuteForm;
