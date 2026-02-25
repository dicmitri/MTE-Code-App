export const AppIcon = ({ name, size = 18, className = "" }) => {
  const isNumeric = !isNaN(name);

  if (isNumeric) {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-bold border-2 ${className}`}
        style={{
          width: size * 1.4,
          height: size * 1.4,
          fontSize: size * 0.7,
          borderColor: 'currentColor'
        }}
      >
        {name}
      </div>
    );
  }

  const icons = {
    // --- existing icons (keep yours) ---
    Home: <g><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22" /></g>,
    Info: <path d="M12 16h.01M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
    ShieldCheck: <g><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></g>,
    Globe: <g><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></g>,
    FileText: <g><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></g>,
    Menu: <g><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></g>,
    X: <g><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></g>,
    HelpCircle: <g><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></g>,
    ChevronRight: <polyline points="9 18 15 12 9 6"/>,
    List: <g><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></g>,
    Eye: <g><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></g>,
    EyeOff: <g><path d="M9.88 9.88L1 12s4-8 11-8a11.64 11.64 0 0 1 4.94 1.12"/><path d="M15.42 15.42A11.75 11.75 0 0 1 12 16c-7 0-11-8-11-8a19 19 0 0 1 2.37-3.12"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/></g>,
    CVSIcon: <g>
      <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" opacity="0.15" />
      <text
        x="12"
        y="13.5"
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontSize: '11px',
          fontWeight: '200',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.4px'
        }}
      >
        CVS
      </text>
    </g>,
    Search: <path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />,
    Download: <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></g>,

    // --- NEW ICONS you requested (consistent stroke style) ---

    // Administering the Code: 3 rectangles hierarchy with connecting lines
    AdminHierarchy: (
      <g>
        <rect x="9" y="3" width="6" height="4" />
        <rect x="3" y="14" width="6" height="4" />
        <rect x="15" y="14" width="6" height="4" />
        <line x1="12" y1="7" x2="6" y2="14" />
        <line x1="12" y1="7" x2="18" y2="14" />
      </g>
    ),

    // Introduction: big "I"
    IntroI: (
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        fill="currentColor"
      >
        I
      </text>
    ),

    // Complaint handling and dispute resolution: justice balance-scale
    JusticeScale: (
      <g>
        {/* mast */}
        <line x1="12" y1="3" x2="12" y2="20" />
        {/* beam */}
        <line x1="6" y1="7" x2="18" y2="7" />
        {/* left pan */}
        <path d="M6 7l-3 5h6l-3-5z" />
        {/* right pan */}
        <path d="M18 7l-3 5h6l-3-5z" />
        {/* base */}
        <line x1="9" y1="20" x2="15" y2="20" />
      </g>
    ),

    // Glossary: "ABC"
    ABC: (
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        fill="currentColor"
      >
        ABC
      </text>
    ),

    // Annex II & IV: Euro symbol
    Euro: (
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        fill="currentColor"
      >
        €
      </text>
    ),

    // Annex VII: person with a mask
    MaskPerson: (
      <g>
        {/* head */}
        <circle cx="12" cy="8" r="4" />
        {/* mask */}
        <path d="M8 8h8v2H8z" />
        {/* straps */}
        <line x1="8" y1="9" x2="6" y2="10" />
        <line x1="16" y1="9" x2="18" y2="10" />
        {/* shoulders / torso hint */}
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};