import React, { useEffect, useState } from 'react';

type Location = {
  id: string;
  name: string;
};

const LocationSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Location[]>([]);

  useEffect(() => {
    const fetchLocations = async (term: string) => {
      if (!term) {
        setResults([]);
        return;
      }

      const response = await fetch(`/api/locations?query=${encodeURIComponent(term)}`);
      const data = await response.json();
      setResults(data);
    };

    fetchLocations(searchTerm);
  }, [searchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search locations"
      />
      <ul>
        {results.map((location) => (
          <li key={location.id}>{location.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default LocationSearch;
