export type Role = 'Citizen' | 'Engineer' | 'Officer';
export type Status = 'Verifying' | 'Approved' | 'Assigned' | 'Resolved' | 'Overdue' | 'Rejected';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type Report = {
  id: string;
  ticket: string;
  title: string;
  description: string;
  category: string;
  location: string;
  ward: string;
  severity: Severity;
  status: Status;
  created: string;
  votes: number;
  due: string;
  image?: string;
};

export type Post = { id: string; author: string; initials: string; location: string; time: string; body: string; votes: number; comments: number };

export const seedReports: Report[] = [
  { id: '2057', ticket: 'CL-2057', title: 'Large pothole near the bus stop', description: 'Deep hole on the left lane. Two-wheelers swerve to avoid it.', category: 'Pothole', location: 'MG Road, Panaji', ward: 'Ward 4', severity: 'High', status: 'Verifying', created: 'Today, 3:40 PM', votes: 41, due: '6 h left' },
  { id: '2049', ticket: 'CL-2049', title: 'Water pooling near the school gate', description: 'Drain is blocked after the rain.', category: 'Drain', location: 'Dona Paula Rd', ward: 'Ward 4', severity: 'Medium', status: 'Approved', created: 'Today, 11:10 AM', votes: 24, due: '3 d left' },
  { id: '2031', ticket: 'CL-2031', title: 'Manhole cover is loose', description: 'The cover moves when vehicles pass.', category: 'Manhole cover', location: 'Caranzalem Junction', ward: 'Ward 4', severity: 'Medium', status: 'Assigned', created: 'Yesterday', votes: 9, due: '2 d left' },
  { id: '2024', ticket: 'CL-2024', title: 'Broken streetlight', description: 'Light has been out for two nights.', category: 'Streetlight', location: 'Porvorim Link Rd', ward: 'Ward 4', severity: 'Low', status: 'Resolved', created: '18 Nov', votes: 12, due: 'Verified' },
];

export const seedPosts: Post[] = [
  { id: 'p1', author: 'Anita Fernandes', initials: 'AF', location: 'Dona Paula · 2 h ago', time: 'Open', body: 'Water pooling outside the school gate again after the rain. Third time this month.', votes: 24, comments: 6 },
  { id: 'p2', author: 'Rohan Gaonkar', initials: 'RG', location: 'MG Road · 5 h ago', time: 'Verified', body: 'Crew patched the hole near the bus stop. Looks level to me. Confirming on the ticket.', votes: 41, comments: 9 },
];

export const categories = [
  { name: 'Pothole', hint: 'Road surface' },
  { name: 'Manhole cover', hint: 'Open or broken' },
  { name: 'Streetlight', hint: 'Not working' },
  { name: 'Garbage', hint: 'Overflowing bin' },
  { name: 'Water leak', hint: 'Pipe or hydrant' },
  { name: 'Drain', hint: 'Blocked or flooded' },
];
