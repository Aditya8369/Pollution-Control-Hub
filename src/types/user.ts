export interface User {
  id: number | string;
  username: string;
  email: string;
  
  // Issue #926: Community Reputation System Fields
  reputation_score: number;
  trust_level: string;
  badges: string[];
}
