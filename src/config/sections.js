/**
 * Centralized section registry.
 * Adding a new section to the app is as simple as adding an entry here.
 */
export const SECTIONS = [
  {
    id: 'code',
    title: 'The Code',
    subtitle: 'MedTech Europe Code of Ethical Business Practice',
    description: 'Browse chapters, sections, Q&As, and the full legal text of the MedTech Europe Code.',
    icon: 'FileText',
    color: '#0099A7',
    available: true,
  },
  {
    id: 'trees',
    title: 'Decision Trees',
    subtitle: 'Interactive compliance decision guides',
    description: 'Step through interactive decision trees to assess compliance scenarios based on the Code.',
    icon: 'GitBranch',
    color: '#e67e22',
    available: true,
  },
  {
    id: 'quiz',
    title: 'Knowledge Quiz',
    subtitle: 'Test your understanding of the Code',
    description: 'Assess your compliance knowledge with interactive multiple-choice questions.',
    icon: 'BookOpen',
    color: '#ec4899', // A nice pink/rose color that stands out
    available: true,
  },
  // Future sections:
  // {
  //   id: 'materials',
  //   title: 'Materials',
  //   subtitle: 'Supplementary compliance resources',
  //   description: '...',
  //   icon: 'Package',
  //   color: '#8b5cf6',
  //   available: false,
  // },
];
