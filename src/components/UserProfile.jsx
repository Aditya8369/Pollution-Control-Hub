import React from 'react';
import { useAuth } from '../context/AuthContext';

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return <div className="p-6">Please log in to view your user profile.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <div className="mb-4">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Challenge Points:</strong> {user.challengePoints ?? 0}</p>
      </div>
      <button 
        onClick={logout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
}
