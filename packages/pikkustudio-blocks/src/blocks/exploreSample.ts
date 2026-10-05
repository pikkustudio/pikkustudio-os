export type Question = { id: string; q: string; hue: 'teal' | 'petrol' | 'sea'; ask: string[] }

export const questions: Question[] = [
  { id: 'away', q: 'What happened while I was away?', hue: 'teal', ask: ['Show me what went wrong last night', 'Anything odd this week?'] },
  { id: 'secrets', q: 'Where are my passwords kept?', hue: 'sea', ask: ['Add a password or key', 'Who used them?'] },
  { id: 'cost', q: 'How much has this cost?', hue: 'petrol', ask: ['How much did the AI cost this week?', 'Can I lower it?'] },
  { id: 'who', q: 'Who is allowed in?', hue: 'sea', ask: ['Invite my sister to help', 'Who can edit this?'] },
  { id: 'own', q: 'What runs by itself?', hue: 'petrol', ask: ['Send a reminder every Monday', 'What runs at night?'] },
  { id: 'mem', q: 'What does it remember?', hue: 'teal', ask: ['What do you remember about my customers?', 'Where are the bookings?'] },
  { id: 'well', q: 'Is everything healthy?', hue: 'sea', ask: ['Is everything working?', 'Tell me if something breaks'] },
  { id: 'ai', q: 'Who is the assistant?', hue: 'teal', ask: ['What can the assistant do?', 'Let me try it'] },
  { id: 'plug', q: 'What is plugged in?', hue: 'petrol', ask: ['Connect card payments', 'What is plugged in?'] },
]
