import React from 'react';
import { User } from '../types/user';

// Temporary mock data so we can test the UI!
const mockUsers: User[] = [
  { id: 1, username: 'EcoWarrior', email: 'eco@test.com', reputation_score: 150, trust_level: 'Expert', badges: ['Verified Reporter', 'First Responder'] },
  { id: 2, username: 'sanskarcoder29', email: 'sanskar@test.com', reputation_score: 120, trust_level: 'Advanced', badges: ['Verified Reporter'] },
];

export const Leaderboard = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🏆 Community Leaderboard</h2>
      <p className="text-gray-600 mb-6">Top contributors keeping our environment clean.</p>
      
      <ul className="space-y-3">
        {mockUsers.sort((a, b) => b.reputation_score - a.reputation_score).map((user, index) => (
          <li key={user.id} className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-gray-400">#{index + 1}</span>
              <div>
                <p className="font-semibold text-gray-800">{user.username}</p>
                <p className="text-sm text-gray-500">{user.trust_level} • {user.badges.length} Badges</p>
              </div>
            </div>
            <span className="font-bold text-green-600 text-lg">{user.reputation_score} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
