import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as mammoth from 'mammoth';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { AppIcon } from './AppIcons';

// Initialize PDFJS Worker and PDFMake Virtual Filesystem
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl as string;
(pdfMake as any).vfs = pdfFonts.pdfMake ? (pdfFonts.pdfMake as any).vfs : (pdfFonts as any).vfs;

const SESSION_TYPES = [
  "General Educational",
  "Other",
  "Hands-on",
  "Streaming",
  "Case Study"
] as const;

type SessionType = typeof SESSION_TYPES[number];

interface Session {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: SessionType;
}

const typeStyles: Record<SessionType, string> = {
  "General Educational": "bg-neutral-50 text-neutral-600 border-neutral-200",
  "Other": "bg-stone-50 text-stone-600 border-stone-200",
  "Hands-on": "bg-[#0099A7]/10 text-[#0099A7] border-[#0099A7]/20",
  "Streaming": "bg-sky-50 text-sky-700 border-sky-200",
  "Case Study": "bg-indigo-50 text-indigo-700 border-indigo-200"
};

function normalizeCapitalization(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  
  // Split by newline if present
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(line => normalizeCapitalization(line)).join('\n');
  }
  
  // If there are bullet points or separators, split and normalize each segment
  if (trimmed.includes('•') || trimmed.includes('|') || trimmed.includes(':')) {
    const segments = trimmed.split(/([•|:])+/);
    return segments.map(seg => {
      if (/[•|:]/.test(seg)) return seg; // Return the separator/bullet point as-is
      return normalizeCapitalization(seg);
    }).join('');
  }

  // Split into words, preserving spaces
  const words = trimmed.split(/(\s+)/);
  let letterWordCount = 0; // to keep track of the first actual word with letters
  
  const minorWords = ["of", "the", "a", "an", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "with", "from"];
  const acronyms = ["eus", "ercp", "tppt", "hcp", "hcps", "mri", "ct", "iv", "or", "gi", "esd", "poem", "emr", "mte", "md", "phd"];

  const processedWords = words.map((word) => {
    // If it's whitespace, return as-is
    if (/^\s+$/.test(word)) return word;
    
    // Check if the word has letters
    const hasLetters = /[a-zA-Z]/.test(word);
    if (!hasLetters) return word;
    
    letterWordCount++;
    
    // Check if the word is ALL CAPS
    // Extract only the letter characters to check if they are all uppercase.
    const letters = word.replace(/[^a-zA-Z]/g, '');
    const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();
    
    if (isAllCaps) {
      // Clean word for acronym check
      const cleanWord = letters.toLowerCase();
      
      // If it is a known acronym, keep it in uppercase
      if (acronyms.includes(cleanWord)) {
        return word.toUpperCase();
      }
      
      // If it is a minor word and not the first word of the title, lowercase it
      if (minorWords.includes(cleanWord) && letterWordCount > 1) {
        return word.toLowerCase();
      }
      
      // Otherwise, convert it to Title Case
      // e.g., "DAY'S" -> "Day's", "(EVALUATION)" -> "(Evaluation)"
      return word.replace(/([a-zA-Z])([a-zA-Z]*)/g, (m, first, rest) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    }
    
    return word;
  });

  return processedWords.join('');
}

function renderHighlightedTitle(title: string, type: SessionType) {
  if (!title) return <span>Untitled Session</span>;

  let keywords: string[] = [];
  if (type === "Hands-on") {
    keywords = ["hands on", "hands-on", "practical exercise", "skills", "cadaver", "lab", "simulation", "workshop", "dry lab", "wet lab"];
  } else if (type === "Streaming") {
    keywords = ["streaming", "live surgery", "live surgeries", "demonstration", "live demo", "transmission"];
  } else if (type === "Case Study") {
    keywords = ["case study", "case studies", "case-based", "clinical case", "case presentation"];
  } else if (type === "Other") {
    keywords = ["break", "lunch", "dinner", "registration", "welcome", "closing", "discussion", "q&a", "q & a", "reception", "coffee"];
  }

  if (keywords.length === 0) return <span>{title}</span>;

  const escapedKeywords = keywords.map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = title.split(regex);
  
  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = regex.test(part);
        if (isMatch) {
          let colorClass = "font-bold underline decoration-2 decoration-amber-500 text-amber-600 bg-amber-50/50 px-1 rounded";
          if (type === "Hands-on") {
            colorClass = "font-bold underline decoration-2 decoration-[#0099A7] text-[#0099A7] bg-[#0099A7]/5 px-1 rounded";
          } else if (type === "Streaming") {
            colorClass = "font-bold underline decoration-2 decoration-sky-500 text-sky-700 bg-sky-50 px-1 rounded";
          } else if (type === "Case Study") {
            colorClass = "font-bold underline decoration-2 decoration-indigo-500 text-indigo-700 bg-indigo-50 px-1 rounded";
          } else if (type === "Other") {
            colorClass = "font-medium underline decoration-2 decoration-stone-400 text-stone-600 bg-stone-50 px-1 rounded";
          }
          return <span key={idx} className={colorClass}>{part}</span>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

const generateId = () => Math.random().toString(36).substring(2, 9);

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function calculateDuration(start: string, end: string) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === 0 && e === 0 && start !== '00:00') return 0;
  let dur = e - s;
  if (dur < 0) {
    dur += 24 * 60;
  }
  return dur;
}

// Regex patterns to identify time blocks like 08:30 - 09:00 (supporting optional am/pm)
const timePatternBoth = /(?:^|\b)(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|to)\s*(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/i;
const timePatternSingle = /(?:^|\b)(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/i;

function convertTo24Hour(hStr: string, mStr: string, amPm?: string): string {
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ap = amPm ? amPm.toLowerCase().replace(/\./g, '') : null;
  if (ap === 'pm' && h < 12) {
    h += 12;
  } else if (ap === 'am' && h === 12) {
    h = 0;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}

function isDayChangeLine(trimmedText: string): boolean {
  if (trimmedText.length > 60) return false;
  const lower = trimmedText.toLowerCase();
  const hasDayWord = /\bday\s*\d+\b|\bday\s*(?:one|two|three|four|five)\b/i.test(lower);
  const hasDayName = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower);
  return hasDayWord || hasDayName;
}

function isSectionHeader(trimmedText: string): boolean {
  if (trimmedText.length > 60) return false;
  const lower = trimmedText.toLowerCase();
  const stopKeywords = [
    "sponsor", "venue", "registration", "faculty", "committee", "organizer",
    "welcome", "general information", "objective", "aims", "participant",
    "acknowledgement", "disclaimer", "patronage", "rational", "razionale",
    "target audience", "speakers", "moderators", "chairpersons", "course director",
    "dissecting room", "workshop faculty", "scientific confirmed", "industry confirmed",
    "official language", "printed program", "recording", "intellectual property", "security"
  ];
  
  const isStopWord = stopKeywords.some(kw => lower.includes(kw));
  const isAllCaps = trimmedText.length > 3 && trimmedText === trimmedText.toUpperCase() && /[A-Z]/.test(trimmedText);
  
  return isStopWord || isAllCaps;
}

function isHighLevelHeader(title: string, duration: number): boolean {
  const lower = title.toLowerCase();
  const hasHighLevelWord = /\bcourse\b|\bprogramme\b|\bprogram\b|\bsymposium\b|\bconference\b|\bmeeting\b/i.test(lower);
  return duration >= 180 && hasHighLevelWord;
}

function getSuggestedEventName(inputText: string): string {
  if (!inputText) return "My MedTech Event";
  const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (const line of lines) {
    // Ignore lines that look purely like a time range f.ex "08:00 - 09:00"
    if (timePatternBoth.test(line) || timePatternSingle.test(line)) {
      continue;
    }
    // Ignore lines that are too short (less than 4 characters)
    if (line.length < 4) continue;
    
    // Clean time markers if any
    let cleaned = line;
    cleaned = cleaned.replace(timePatternBoth, '').replace(timePatternSingle, '').trim();
    
    // Clean leading bullets
    cleaned = cleaned.replace(/^[•\-*–—◦▪▫◆◇▶►➔→\.\·]|^[a-zA-Z0-9]+[\.\)]|^\([a-zA-Z0-9]+\)/, '').trim();
    
    if (cleaned.length > 3) {
      return normalizeCapitalization(cleaned);
    }
  }
  return "My MedTech Event";
}

interface TPPTContentProps {
  setActiveSection: (section: string | null) => void;
  setActiveId: (id: string) => void;
}

export const TPPTContent: React.FC<TPPTContentProps> = ({ setActiveSection, setActiveId }) => {
  const [inputText, setInputText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [result, setResult] = useState<{
    total: number;
    handsOn: number;
    practical: number;
    passesAgenda: boolean;
  } | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [eventNameInput, setEventNameInput] = useState("");

  type Answer = "Yes" | "No" | "I am not sure" | null;
  const [qVenue, setQVenue] = useState<Answer>(null);
  const [qStandalone, setQStandalone] = useState<Answer>(null);
  const [qSize, setQSize] = useState<Answer>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Restore state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tppt_autosave_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputText) setInputText(parsed.inputText);
        if (parsed.sessions && parsed.sessions.length > 0) setSessions(parsed.sessions);
        if (parsed.qVenue) setQVenue(parsed.qVenue);
        if (parsed.qStandalone) setQStandalone(parsed.qStandalone);
        if (parsed.qSize) setQSize(parsed.qSize);
      }
    } catch (e) {
      console.error("Could not restore state", e);
    }
  }, []);

  // Autosave when key data changes
  useEffect(() => {
    try {
      const stateToSave = { inputText, sessions, qVenue, qStandalone, qSize };
      localStorage.setItem('tppt_autosave_state', JSON.stringify(stateToSave));
    } catch (e) {
      // Ignore storage errors in restricted domains
    }
  }, [inputText, sessions, qVenue, qStandalone, qSize]);

  const handleParseText = () => {
    const lines = inputText.split('\n');
    const sessionChunks: any[] = [];
    let currentSession: any = null;
    let currentSectionTitle = "";
    let isNewDayPending = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect explicit day boundary line
      if (isDayChangeLine(trimmed)) {
        isNewDayPending = true;
        // Do not append day boundary line as regular text to the previous session!
        if (currentSession) {
          sessionChunks.push(currentSession);
          currentSession = null;
        }
        continue;
      }

      const matchBoth = trimmed.match(timePatternBoth);
      const matchSingle = trimmed.match(timePatternSingle);
      const hasTime = matchBoth || matchSingle;

      // If it's a section header and has no time, handle it as a separator stop
      if (!hasTime && isSectionHeader(trimmed)) {
        currentSectionTitle = trimmed;
        if (currentSession) {
          sessionChunks.push(currentSession);
          currentSession = null;
        }
        continue;
      }

      if (matchBoth) {
        const startH = matchBoth[1];
        const startM = matchBoth[2];
        const startAmPm = matchBoth[3] || matchBoth[6] || "";
        const endH = matchBoth[4];
        const endM = matchBoth[5];
        const endAmPm = matchBoth[6] || matchBoth[3] || "";
        
        const startTimeNorm = convertTo24Hour(startH, startM, startAmPm);
        const endTimeNorm = convertTo24Hour(endH, endM, endAmPm);
        
        const sessionTitle = trimmed.replace(matchBoth[0], '').trim();
        const dur = calculateDuration(startTimeNorm, endTimeNorm);
        
        // Filter out high-level program/timetable outline banners (e.g. "One-Day Course (9:00-18:00)")
        if (isHighLevelHeader(sessionTitle, dur)) {
          continue;
        }

        if (currentSession) {
          sessionChunks.push(currentSession);
        }
        
        currentSession = {
          title: sessionTitle,
          startTime: startTimeNorm,
          endTime: endTimeNorm,
          sectionTitle: currentSectionTitle
        };
        isNewDayPending = false;
        continue;
      }

      if (matchSingle) {
         const startH = matchSingle[1];
         const startM = matchSingle[2];
         const startAmPm = matchSingle[3] || "";
         const startTimeNorm = convertTo24Hour(startH, startM, startAmPm);

         if (currentSession) {
           const prevStartMin = timeToMinutes(currentSession.startTime);
           const nextStartMin = timeToMinutes(startTimeNorm);
           
           const isImplicitDayChange = nextStartMin < prevStartMin;
           
           if (isNewDayPending || isImplicitDayChange) {
             // Boundary crossed: push previous session as-is (no automatic endTime population)
             sessionChunks.push(currentSession);
           } else {
             // Normal chronological flow on same day: set previous session's end time to current start time
             if (!currentSession.endTime) {
               currentSession.endTime = startTimeNorm;
             }
             sessionChunks.push(currentSession);
           }
         }
         
         currentSession = {
           title: trimmed.replace(matchSingle[0], '').trim(),
           startTime: startTimeNorm,
           endTime: "",
           sectionTitle: currentSectionTitle
         };
         isNewDayPending = false;
         continue;
      }

      if (currentSession) {
        const prevTitle = currentSession.title;
        // If the line starts with a bullet point or standard prefix, join it as a sub-session newline
        const isBullet = /^[•\-*–—◦▪▫◆◇▶►➔→\.\·]|^[a-zA-Z0-9]+[\.\)]|^\([a-zA-Z0-9]+\)/.test(trimmed);
        
        if (isBullet) {
          currentSession.title += (prevTitle ? '\n' : '') + trimmed;
        } else if (prevTitle.endsWith('-')) {
          currentSession.title = prevTitle.slice(0, -1) + trimmed;
        } else {
          currentSession.title += (prevTitle ? ' ' : '') + trimmed;
        }
      }
    }
    if (currentSession) sessionChunks.push(currentSession);
    
    const parsedSessions: Session[] = sessionChunks.map((s) => {
      let cleanTitle = s.title.replace(/[ \t]+/g, ' ').trim();
      cleanTitle = cleanTitle.replace(/^(?:am|pm|a\.m\.|p\.m\.)\b\s*/i, '').trim();
      
      // Strip leading "|" if any from formatting
      if (cleanTitle.startsWith('|')) {
        cleanTitle = cleanTitle.substring(1).trim();
      }
      
      cleanTitle = normalizeCapitalization(cleanTitle);

      let type: SessionType = "General Educational";
      const lowerTitle = cleanTitle.toLowerCase();
      
      // Extract first line for break/social/other events to prevent bullets from turning lectures into "Other"
      const firstLine = cleanTitle.split('\n')[0].toLowerCase();
      
      const isMainOther = 
        firstLine.includes("break") || 
        firstLine.includes("lunch") || 
        firstLine.includes("dinner") || 
        firstLine.includes("registration") || 
        firstLine.includes("welcome") || 
        firstLine.includes("closing") || 
        firstLine.includes("reception") ||
        firstLine.includes("coffee") ||
        firstLine.includes("farewell") ||
        firstLine.includes("buffet") ||
        firstLine.includes("tea") ||
        firstLine.includes("opening");

      const isHandsOn = 
        lowerTitle.includes("hands on") || 
        lowerTitle.includes("hands-on") || 
        lowerTitle.includes("practical exercise") || 
        lowerTitle.includes("skills") || 
        lowerTitle.includes("cadaver") ||
        lowerTitle.includes("simulation") ||
        lowerTitle.includes("workshop") ||
        lowerTitle.includes("dry lab") ||
        lowerTitle.includes("wet lab") ||
        lowerTitle.includes("dissection") ||
        lowerTitle.includes("dissect") ||
        lowerTitle.includes("cadaveric") ||
        lowerTitle.includes("wet-lab") ||
        lowerTitle.includes("dry-lab") ||
        lowerTitle.includes("anatomical lab") ||
        lowerTitle.includes("bone model") ||
        lowerTitle.includes("implants");

      const isStreaming = 
        lowerTitle.includes("streaming") || 
        lowerTitle.includes("live surgery") || 
        lowerTitle.includes("live surgeries") || 
        lowerTitle.includes("demonstration") || 
        lowerTitle.includes("live demo") ||
        lowerTitle.includes("transmission") ||
        lowerTitle.includes("live broadcast") ||
        lowerTitle.includes("live transmission") ||
        lowerTitle.includes("operative demonstration") ||
        lowerTitle.includes("live case");

      const isCase = 
        lowerTitle.includes("case") || 
        lowerTitle.includes("case study") || 
        lowerTitle.includes("case studies") ||
        lowerTitle.includes("case-based") ||
        lowerTitle.includes("clinical case") ||
        lowerTitle.includes("case presentation") ||
        lowerTitle.includes("discussion cases") ||
        lowerTitle.includes("cases discussion") ||
        lowerTitle.includes("roundtable") ||
        lowerTitle.includes("panel discussion");

      const isShortQA = 
        firstLine.includes("discussion") || 
        firstLine.includes("q&a") || 
        firstLine.includes("q & a") || 
        firstLine.includes("questions");

      if (isMainOther) {
        type = "Other";
      } else if (isHandsOn) {
        type = "Hands-on";
      } else if (isStreaming) {
        type = "Streaming";
      } else if (isCase) {
        type = "Case Study";
      } else if (isShortQA) {
        type = "Other";
      } else if (s.sectionTitle) {
        // Fallback to section header context
        const secLower = s.sectionTitle.toLowerCase();
        if (secLower.includes("practical") || secLower.includes("hands-on") || secLower.includes("cadaver") || secLower.includes("dissect")) {
          type = "Hands-on";
        } else if (secLower.includes("live") || secLower.includes("streaming") || secLower.includes("demonstration")) {
          type = "Streaming";
        } else if (secLower.includes("case") || secLower.includes("discussion") || secLower.includes("roundtable")) {
          type = "Case Study";
        }
      }

      let durationMinutes = 0;
      if (s.startTime && s.endTime) {
        durationMinutes = calculateDuration(s.startTime, s.endTime);
      }
      
      return {
        id: generateId(),
        title: cleanTitle || 'Untitled Session',
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes,
        type
      };
    });

    setSessions(parsedSessions);
    setResult(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let fullText = "";

      if (file.name.toLowerCase().endsWith('.pdf')) {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          let lastY = -1;
          let pageText = "";
          
          for (const item of textContent.items) {
            if ('str' in item) {
              const currentY = Math.abs(item.transform[5]);
              if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                if (!pageText.endsWith('\n')) {
                  pageText += '\n';
                }
              }
              pageText += item.str;
              if (item.hasEOL) {
                pageText += '\n';
              } else {
                pageText += ' ';
              }
              lastY = currentY;
            }
          }
          fullText += pageText + "\n\n";
        }
      } else if (file.name.toLowerCase().match(/\.docx?$/)) {
        try {
          const res = await mammoth.extractRawText({ arrayBuffer });
          fullText = res.value;
        } catch (docxErr) {
          console.error("Error reading docx:", docxErr);
          throw new Error("Could not read Word document.");
        }
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or Word document.");
      }
      
      setInputText(fullText.replace(/\n{3,}/g, '\n\n'));
    } catch (error: any) {
      console.error("Error extracting document:", error);
      alert(error.message || "Could not extract text from document. Please make sure the file is not corrupted.");
    } finally {
      setIsExtracting(false);
      if (e.target) e.target.value = '';
    }
  };

  const addSession = () => {
    setSessions([
      ...sessions,
      {
        id: generateId(),
        title: "New Session",
        startTime: "",
        endTime: "",
        durationMinutes: 0,
        type: "General Educational"
      }
    ]);
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    setResult(null);
  };

  const updateSession = (id: string, field: keyof Session, value: any) => {
    setSessions(sessions.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      
      if (field === 'startTime' || field === 'endTime') {
        updated.durationMinutes = calculateDuration(updated.startTime, updated.endTime);
      }
      return updated;
    }));
    setResult(null);
  };

  const handleCalculate = () => {
    let total = 0;
    let handsOn = 0;
    let practical = 0;

    sessions.forEach(s => {
      const dur = Number(s.durationMinutes) || 0;
      total += dur;
      
      if (s.type === "Hands-on") {
        handsOn += dur;
        practical += dur;
      } else if (s.type === "Streaming" || s.type === "Case Study") {
        practical += dur;
      }
    });

    const meetsHandsOn = total > 0 && (handsOn >= total / 3);
    const meetsPractical = total > 0 && (practical > total / 2);
    
    setResult({
      total,
      handsOn,
      practical,
      passesAgenda: meetsHandsOn && meetsPractical
    });
    setQVenue(null);
    setQStandalone(null);
    setQSize(null);
  };

  const formatHrs = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  const getFinalResult = () => {
    if (!result) return null;
    if (!result.passesAgenda) return 'TPOEE';
    if (qVenue && qStandalone && qSize) {
      if (qVenue === 'Yes' && qStandalone === 'No' && qSize === 'Yes') return 'TPPT';
      if (qVenue === 'No' && qStandalone === 'Yes' && qSize === 'No') return 'TPOEE';
      return 'MIXED';
    }
    return null;
  };

  const finalOutcome = getFinalResult();

  const handleExportPDF = (eventName: string) => {
    const pdfTypeColors: Record<SessionType, string> = {
      "General Educational": "#52525b",
      "Other": "#57534e",
      "Hands-on": "#0099A7",
      "Streaming": "#0369a1",
      "Case Study": "#4338ca"
    };

    const docDefinition: any = {
      content: [
        { text: 'MedTech TPPT Classifier Report', style: 'header' },
        { text: `Generated on ${new Date().toLocaleDateString()}`, style: 'subheader', margin: [0, 0, 0, 5] },
        { text: `Event Name: ${eventName.trim() || 'Unspecified Event'}`, style: 'eventTitle', margin: [0, 0, 0, 15] },
        
        { text: 'Disclaimer', style: 'sectionHeader' },
        { 
          text: 'This tool is not intended to certify or validate in any way or form the nature of an Event. Its aim is to help and support companies in calculating the duration according to strictly numerical thresholds derived from the rules (the 1/3 and 1/2 formulas). This calculation only covers the time/agenda aspect as entered by the user and must be corroborated with qualitative analysis by Member Companies, as this tool does not make use of AI in pre-determining the type of a session, it uses keywords to do it, and a contextual analysis can often be needed to determine the true category of a session.', 
          style: 'disclaimer' 
        },

        { text: '1. Input Source Code', style: 'sectionHeader' },
        { text: inputText.trim() || 'No source text provided.', style: 'code', margin: [0, 0, 0, 15] },

        { text: '2. Session Analysis', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto'],
            body: [
              [
                { text: 'Start', style: 'tableHeader' }, 
                { text: 'End', style: 'tableHeader' }, 
                { text: 'Title', style: 'tableHeader' }, 
                { text: 'Type', style: 'tableHeader' }, 
                { text: 'Mins', style: 'tableHeader', alignment: 'right' }
              ],
              ...sessions.map(s => [
                s.startTime || '-', 
                s.endTime || '-', 
                s.title.replace(/\n/g, ' '), 
                { text: s.type, color: pdfTypeColors[s.type], bold: true }, 
                { text: s.durationMinutes.toString(), alignment: 'right' }
              ])
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 10, 0, 15]
        },

        { text: '3. Duration Calculation', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Total Duration', style: 'tableHeader', alignment: 'center' },
                { text: 'Hands-on Specific', style: 'tableHeader', alignment: 'center' },
                { text: 'Total Practical', style: 'tableHeader', alignment: 'center' }
              ],
              [
                { text: formatHrs(result?.total || 0), alignment: 'center', style: 'highlight' },
                { 
                  text: `${formatHrs(result?.handsOn || 0)}\n\n${(((result?.handsOn || 0) / Math.max(result?.total || 1, 1)) * 100).toFixed(1)}% of total\nRequired: >= 33.3%`, 
                  alignment: 'center',
                  color: (result?.handsOn || 0) >= ((result?.total || 0) / 3) ? '#634488' : '#0099A7'
                },
                { 
                  text: `${formatHrs(result?.practical || 0)}\n\n${(((result?.practical || 0) / Math.max(result?.total || 1, 1)) * 100).toFixed(1)}% of total\nRequired: > 50%`, 
                  alignment: 'center',
                  color: (result?.practical || 0) > ((result?.total || 0) / 2) ? '#634488' : '#0099A7'
                }
              ]
            ]
          },
          layout: {
            hLineWidth: (i: number) => 1,
            vLineWidth: (i: number) => 1,
            hLineColor: (i: number) => '#e5e7eb',
            vLineColor: (i: number) => '#e5e7eb',
            paddingTop: (i: number) => 10,
            paddingBottom: (i: number) => 10,
          },
          margin: [0, 10, 0, 15]
        },
        
        { text: `Agenda Result: ${result?.passesAgenda ? 'PASSES' : 'DOES NOT PASS'} TIME REQUIREMENTS`, 
          style: 'outcomeText', 
          color: result?.passesAgenda ? '#634488' : '#0099A7',
          margin: [0, 0, 0, 20]
        },

        { text: '4. Eligibility Questionnaire', style: 'sectionHeader' },
        {
          ul: [
            { text: `Venue is clinical environment or simulation setting? \nAnswer: ${qVenue || 'Not Provided'}`, margin: [0, 0, 0, 10] },
            { text: `Stand-alone event (not part of larger conference)? \nAnswer: ${qStandalone || 'Not Provided'}`, margin: [0, 0, 0, 10] },
            { text: `Size allows for real hands-on experience? \nAnswer: ${qSize || 'Not Provided'}`, margin: [0, 0, 0, 10] }
          ],
          margin: [0, 10, 0, 20]
        },

        { text: '5. Proposed Classification', style: 'sectionHeader' },
        {
          text: finalOutcome === 'TPPT' 
            ? 'Would in principle qualify as a Third Party Procedure Training' 
            : 'Would NOT in principle qualify as Third Party Procedure Training; it may qualify as a Third Party Organised Educational Event',
          style: 'finalOutcome',
          color: finalOutcome === 'TPPT' ? '#634488' : '#0099A7'
        }
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: '#111827' },
        subheader: { fontSize: 11, italics: true, color: '#6b7280' },
        eventTitle: { fontSize: 13, bold: true, color: '#634488' },
        sectionHeader: { fontSize: 16, bold: true, color: '#634488', margin: [0, 15, 0, 8] },
        tableHeader: { bold: true, fontSize: 11, color: '#374151' },
        disclaimer: { fontSize: 9.5, color: '#0099A7', italics: true, margin: [0, 0, 0, 15], lineHeight: 1.35 },
        code: { fontSize: 8.5, color: '#4b5563' },
        highlight: { bold: true, fontSize: 14 },
        outcomeText: { fontSize: 14, bold: true },
        finalOutcome: { fontSize: 15, bold: true, margin: [0, 10, 0, 0], lineHeight: 1.3 }
      },
      defaultStyle: {
        fontSize: 10,
        color: '#1f2937'
      }
    };

    pdfMake.createPdf(docDefinition).download('MedTech_TPPT_Report.pdf');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50/50 custom-scrollbar pb-24">
      {/* Top Banner and Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <button
          onClick={() => {
            setActiveSection(null);
            setActiveId('home');
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#634488] transition-colors mb-6 cursor-pointer"
        >
          ← Back to Home Hub
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-[#634488]/10 text-[#634488] border border-[#634488]/20 shadow-sm shrink-0">
            <AppIcon name="Calculator" size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">TPPT Checker</h1>
            <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
              Support tool to help companies determine if an event qualifies as a Third Party Procedural Training meeting
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 p-5 rounded-2xl flex items-start gap-4 text-amber-800 shadow-sm mb-8">
          <div className="text-amber-600 shrink-0 mt-0.5">
            <AppIcon name="AlertCircle" size={20} />
          </div>
          <div className="text-sm">
            <p className="font-bold mb-1">Disclaimer</p>
            <p className="font-light leading-relaxed">This tool is intended as a helpful guide for preliminary assessment only and <strong>does not certify</strong> the official status of any event under the MedTech Europe Code. The user is solely responsible for entering accurate data. This tool is not intended to fully substitute a Member's internal checks and verification. It only aims to help with that process. Always verify the results and independently ensure compliance with the rules of the Code.</p>
          </div>
        </div>

        {/* Input Ingestion Form */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 shadow-sm rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#634488]" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Step 1: Import Agenda</h2>
              <p className="text-xs text-gray-500 mt-1 font-light leading-relaxed">
                Paste text, or upload a PDF/Word document. <span className="font-bold underline text-gray-700">Please review and edit the text before parsing.</span> The system can ignore irrelevant parts of the document, but it is recommended to edit them out before processing the text.
              </p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="flex items-center justify-center gap-2 text-xs font-bold text-[#634488] bg-[#634488]/10 hover:bg-[#634488]/20 px-4 py-2.5 rounded-xl border border-[#634488]/20 transition-all cursor-pointer shrink-0 disabled:opacity-50 min-w-[130px]"
            >
              {isExtracting ? (
                <AppIcon name="Loader2" size={14} className="animate-spin" />
              ) : (
                <AppIcon name="Upload" size={14} />
              )}
              Upload Agenda
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>

          <div className="relative">
            {isExtracting && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-xl border border-slate-100">
                <AppIcon name="Loader2" size={32} className="text-[#634488] animate-spin mb-3" />
                <span className="text-sm font-bold text-gray-700">Extracting text...</span>
              </div>
            )}
            <textarea
              className="w-full h-72 p-4 rounded-xl border border-gray-200 outline-none focus:border-[#634488] focus:ring-1 focus:ring-[#634488] text-xs font-mono resize-y bg-gray-50 leading-relaxed shadow-inner"
              placeholder="08:00 - 08:30 Registration & Welcome&#10;08:30 - 10:00 Hands-on Cadaver Lab..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              handleParseText();
              setTimeout(() => {
                const element = document.getElementById('review-sessions-header');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }}
            disabled={!inputText.trim()}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#634488] hover:bg-[#533873] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm sm:text-base cursor-pointer"
          >
            Parse Text to Sessions <AppIcon name="FileText" size={18} />
          </button>
        </div>

        {/* Quick Rules Banner */}
        <div className="bg-[#634488]/5 p-4 rounded-2xl border border-[#634488]/10 flex flex-col sm:flex-row sm:items-center gap-3 w-full mb-8">
          <div className="flex items-center gap-2 text-[#634488] font-bold text-xs shrink-0">
            <AppIcon name="Info" size={14} /> Evaluation Rules:
          </div>
          <ul className="text-xs text-[#634488] font-light flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-1 sm:items-center list-none pl-0 m-0 w-full">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#634488]/40"></span> <strong>Hands-on sessions</strong> &ge; <strong>1/3</strong> total duration.</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#634488]/40"></span> <strong>Practical sessions</strong> &gt; <strong>50%</strong> total duration.</li>
          </ul>
        </div>

        {/* Review Sessions area */}
        <div className="flex flex-col gap-6" id="review-sessions-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Step 2: Review Sessions & Calculate</h2>
              <p className="text-xs text-gray-500 mt-1 font-light">Double-check parsed sessions, times, and types. Calculate when ready.</p>
            </div>
            
            <button
              onClick={addSession}
              className="flex items-center gap-1.5 text-xs font-bold text-[#0099A7] hover:text-[#008692] bg-[#0099A7]/10 px-3 py-1.5 rounded-xl border border-[#0099A7]/20 transition-all cursor-pointer shadow-sm"
            >
              <AppIcon name="Plus" size={12} /> Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="border border-dashed border-gray-200 bg-white/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center text-gray-400">
              <div className="mb-3 text-gray-300">
                <AppIcon name="FileText" size={32} />
              </div>
              <p className="font-bold text-sm text-gray-600">No sessions parsed yet</p>
              <p className="text-xs mt-1 max-w-sm font-light leading-relaxed">Paste agenda text above and parse it, or add sessions manually to start calculating.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`group bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-sm border relative transition-all hover:shadow-md ${
                    session.durationMinutes > 99 
                      ? 'border-orange-300 bg-orange-50/15 shadow-sm shadow-orange-50/50' 
                      : 'border-slate-100/80'
                  }`}
                >
                  <button
                    onClick={() => removeSession(session.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 md:opacity-100 cursor-pointer"
                    title="Remove Session"
                  >
                    <AppIcon name="Trash2" size={16} />
                  </button>

                  <div className="pr-8 mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                      <span></span>
                      {editingSessionId === session.id ? (
                        <span className="text-[9px] font-semibold text-[#634488] normal-case bg-[#634488]/10 px-1.5 py-0.5 rounded animate-pulse">Editing</span>
                      ) : (
                        <span className="text-[9px] font-medium text-gray-400 normal-case">Click to Edit</span>
                      )}
                    </label>
                    {editingSessionId === session.id ? (
                      <textarea
                        value={session.title}
                        onChange={(e) => updateSession(session.id, 'title', e.target.value)}
                        onBlur={() => setEditingSessionId(null)}
                        autoFocus
                        className="w-full text-sm font-semibold text-gray-800 border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-[#634488] focus:ring-1 focus:ring-[#634488] transition-all resize-y leading-relaxed shadow-inner"
                        rows={Math.max(3, session.title.split('\n').length)}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingSessionId(session.id)}
                        className="w-full text-sm font-semibold text-gray-800 border border-transparent hover:border-slate-100 hover:bg-slate-50/20 p-1.5 -ml-1.5 rounded-lg outline-none transition-all leading-relaxed cursor-text min-h-[36px] whitespace-pre-line"
                      >
                        {renderHighlightedTitle(session.title, session.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100/60">
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1.5">
                         <input
                           type="time"
                           value={session.startTime}
                           onChange={(e) => updateSession(session.id, 'startTime', e.target.value)}
                           className="w-24 text-xs font-semibold text-gray-700 rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-[#634488] bg-white shadow-inner"
                         />
                         <span className="text-gray-300 text-xs">-</span>
                         <input
                           type="time"
                           value={session.endTime}
                           onChange={(e) => updateSession(session.id, 'endTime', e.target.value)}
                           className="w-24 text-xs font-semibold text-gray-700 rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-[#634488] bg-white shadow-inner"
                         />
                       </div>
                    </div>
                    
                    <div className="flex-1 min-w-[180px]">
                      <select
                        value={session.type}
                        onChange={(e) => updateSession(session.id, 'type', e.target.value as SessionType)}
                        className={`w-full text-xs font-bold rounded-lg border px-3 py-1.5 outline-none transition-all appearance-none ${typeStyles[session.type]}`}
                        style={{ cursor: "pointer" }}
                      >
                        {SESSION_TYPES.map(t => (
                          <option key={t} value={t} className="bg-white text-gray-800 font-medium">{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <div className="flex items-center gap-2">
                        {session.durationMinutes > 99 && (
                          <span className="text-[9px] font-bold text-orange-700 bg-orange-100 border border-orange-200/80 px-2 py-1.5 rounded-lg flex items-center gap-1 animate-pulse" title="Long session duration (> 99 min)">
                            ⚠️ Check
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={session.durationMinutes}
                            onChange={(e) => updateSession(session.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                            className={`w-16 text-xs text-right font-bold rounded-lg border px-2 py-1.5 outline-none focus:ring-1 shadow-inner transition-all ${
                              session.durationMinutes > 99
                                ? "border-orange-400 bg-orange-50 text-orange-700 focus:border-orange-500 focus:ring-orange-500 font-extrabold"
                                : "border-gray-200 bg-white text-gray-700 focus:border-[#634488] focus:ring-[#634488]"
                            }`}
                          />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessions.length > 0 && (
            <div className="mt-4 flex flex-col items-center border-t border-slate-100 pt-8">
              <button
                onClick={handleCalculate}
                className="flex items-center justify-center gap-2 py-3 px-8 bg-[#634488] hover:bg-[#533873] text-white rounded-full font-extrabold text-base sm:text-lg hover:shadow-md transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <AppIcon name="Calculator" size={18} /> Calculate Eligibility
              </button>
            </div>
          )}

          {/* Results Summary and Questionnaire */}
          {result && (
            <div className="mt-6 flex flex-col gap-6 w-full animate-fade-in">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Duration */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-100/80 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Duration</span>
                  <span className="text-2xl font-black text-gray-800">{formatHrs(result.total)}</span>
                  <span className="text-xs font-light text-gray-500 mt-1">{result.total} minutes sum</span>
                </div>
                
                {/* Hands-on Duration */}
                <div className={`bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-sm border flex flex-col items-center justify-center text-center relative overflow-hidden ${
                  (result.total > 0 && result.handsOn >= result.total / 3) ? "border-[#634488]/20 ring-1 ring-[#634488]/5" : "border-[#0099A7]/20 ring-1 ring-[#0099A7]/5"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Hands-on Duration</span>
                  <span className="text-2xl font-black text-gray-800">{formatHrs(result.handsOn)}</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                      (result.total > 0 && result.handsOn >= result.total / 3) ? "bg-[#634488]/10 text-[#634488] border border-[#634488]/20" : "bg-[#0099A7]/10 text-[#0099A7] border border-[#0099A7]/20"
                    }`}>
                      {result.total > 0 ? Math.round((result.handsOn / result.total) * 100) : 0}%
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">of total</span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 font-medium">Required: &ge; 33.3%</div>
                </div>
                
                {/* Total Practical Duration */}
                <div className={`bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-sm border flex flex-col items-center justify-center text-center relative overflow-hidden ${
                  (result.total > 0 && result.practical > result.total / 2) ? "border-[#634488]/20 ring-1 ring-[#634488]/5" : "border-[#0099A7]/20 ring-1 ring-[#0099A7]/5"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Practical</span>
                  <span className="text-2xl font-black text-gray-800">{formatHrs(result.practical)}</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                      (result.total > 0 && result.practical > result.total / 2) ? "bg-[#634488]/10 text-[#634488] border border-[#634488]/20" : "bg-[#0099A7]/10 text-[#0099A7] border border-[#0099A7]/20"
                    }`}>
                      {result.total > 0 ? Math.round((result.practical / result.total) * 100) : 0}%
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">of total</span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 font-medium">Required: &gt; 50%</div>
                </div>
              </div>

              {/* Fail warning if criteria not met */}
              {!result.passesAgenda && (
                <div className="flex flex-col gap-3 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900 shadow-inner animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-gray-900">
                    <div className="text-[#0099A7] shrink-0"><AppIcon name="AlertCircle" size={18} /></div>
                    Agenda Requirements Not Fully Met
                  </div>
                  <div className="text-xs sm:text-sm space-y-2 leading-relaxed text-gray-700">
                    <p className="font-semibold text-gray-900">Current status details:</p>
                    <ul className="list-disc pl-5 space-y-1.5 font-light">
                      {result.total > 0 && result.handsOn < result.total / 3 && (
                        <li>Hands-on sessions represent less than 1/3 (33.3%) of the total duration.</li>
                      )}
                      {result.total > 0 && result.practical <= result.total / 2 && (
                        <li>Total practical sessions (Hands-on + Streaming + Case Study) do not exceed 50% of the total duration.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Questionnaire if agenda passes */}
              {result.passesAgenda && (
                <div className="flex flex-col gap-6 mt-4 animate-fade-in">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
                     Step 3: Eligibility Questionnaire
                  </h2>
                  
                  {/* Q1: Venue */}
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-100/80 shadow-sm">
                     <div className="text-xs font-bold text-[#634488] uppercase tracking-wider mb-1.5">1. Venue & Location</div>
                     <p className="text-sm sm:text-base text-gray-800 font-semibold mb-4 leading-relaxed">Is the Event being organised in a clinical environment or in a place suitable for medical procedures?</p>
                     
                     <div className="flex flex-wrap gap-2.5 mb-5">
                        {(["Yes", "No", "I am not sure"] as const).map(opt => (
                            <button 
                              key={opt} 
                              onClick={() => setQVenue(opt)} 
                              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                                qVenue === opt 
                                  ? 'bg-[#634488] border-[#634488] text-white shadow-md' 
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                                {opt}
                            </button>
                        ))}
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl text-xs text-gray-500 font-light leading-relaxed border border-gray-100">
                        TPPTs’ hands-on sessions are typically organised in either a clinical environment or in places suitable for medical procedures. Examples of a clinical environment include hospitals or clinics, where medical treatment on real patients is given (f.ex. operating room, cath lab). Examples of simulation settings include conference or meeting rooms which are appropriately equipped with relevant simulation devices/systems, or experimental laboratories suitable for training on cadavers, skin models, synthetic bones, live animals in accordance to applicable regulations and ethical rules, etc.
                     </div>
                  </div>

                  {/* Q2: Stand-alone event */}
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-100/80 shadow-sm">
                     <div className="text-xs font-bold text-[#634488] uppercase tracking-wider mb-1.5">2. Event Scope</div>
                     <p className="text-sm sm:text-base text-gray-800 font-semibold mb-4 leading-relaxed">Is the Event taking place around, next to or in connection with a larger Educational Event?</p>
                     
                     <div className="flex flex-wrap gap-2.5 mb-5">
                        {(["Yes", "No", "I am not sure"] as const).map(opt => (
                            <button 
                              key={opt} 
                              onClick={() => setQStandalone(opt)} 
                              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                                qStandalone === opt 
                                  ? 'bg-[#634488] border-[#634488] text-white shadow-md' 
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                                {opt}
                            </button>
                        ))}
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl text-xs text-gray-500 font-light leading-relaxed border border-gray-100">
                        TPPTs must be stand-alone. Where the majority of the training is not given in a clinical environment, for example where the training is organised in connection with, adjacent to, or at the same time as a larger Third-Party Organised Educational Conference, that training will not qualify as a TPPT as defined in the Code.
                     </div>
                  </div>

                  {/* Q3: Size */}
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-100/80 shadow-sm">
                     <div className="text-xs font-bold text-[#634488] uppercase tracking-wider mb-1.5">3. Size & Engagement</div>
                     <p className="text-sm sm:text-base text-gray-800 font-semibold mb-4 leading-relaxed">Does the expected number of attendants per session allow for real hands-on experiences?</p>
                     
                     <div className="flex flex-wrap gap-2.5 mb-5">
                        {(["Yes", "No", "I am not sure"] as const).map(opt => (
                            <button 
                              key={opt} 
                              onClick={() => setQSize(opt)} 
                              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                                qSize === opt 
                                  ? 'bg-[#634488] border-[#634488] text-white shadow-md' 
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                                {opt}
                            </button>
                        ))}
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl text-xs text-gray-500 font-light leading-relaxed border border-gray-100">
                        Given the essential practical and hands-on element of a TPPT and given the fact that Member Companies would know the identity of the HCPs participating in the course, the size of such training is usually relatively small. However, provided that the above criteria are met, size may not be a determining factor.
                     </div>
                  </div>

                </div>
              )}

              {/* TPOEE Final Outcome */}
              {finalOutcome === 'TPOEE' && (
                <div className="mt-4 p-8 rounded-2xl border border-[#0099A7]/30 bg-[#0099A7]/5 shadow-[0_8px_30px_rgba(0,153,167,0.06)] text-center animate-fade-in">
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-[#0099A7]">
                    Would NOT in principle qualify as Third Party Procedure Training; it may qualify as a Third Party Organised Educational Event
                  </h3>
                  <p className="mt-3 text-xs text-slate-500 font-light max-w-lg mx-auto leading-relaxed">Please note: This outcome is a preliminary assessment based on the provided inputs and does not constitute a formal certification. Please double-check all requirements.</p>
                </div>
              )}

              {/* TPPT Final Outcome */}
              {finalOutcome === 'TPPT' && (
                <div className="mt-4 p-8 rounded-2xl border border-[#634488]/30 bg-[#634488]/5 shadow-[0_8px_30px_rgba(99,68,136,0.06)] text-center animate-fade-in">
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-[#634488]">
                    Would in principle qualify as a Third Party Procedure Training
                  </h3>
                  <p className="mt-3 text-xs text-slate-500 font-light max-w-lg mx-auto leading-relaxed">Please note: This outcome is a preliminary assessment based on the provided inputs and does not constitute a formal certification. Please double-check all requirements.</p>
                </div>
              )}

              {/* MIXED Final Outcome */}
              {finalOutcome === 'MIXED' && (
                <div className="mt-4 p-8 rounded-2xl border border-[#0099A7]/30 bg-[#0099A7]/5 shadow-[0_8px_30px_rgba(0,153,167,0.06)] text-center animate-fade-in">
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-[#0099A7]">
                    Would NOT in principle qualify as Third Party Procedure Training; it may qualify as a Third Party Organised Educational Event
                  </h3>
                  <p className="mt-3 text-xs text-slate-500/80 font-light max-w-lg mx-auto leading-relaxed">Please double check the different elements. This is a preliminary assessment based on the provided inputs and does not constitute a formal certification.</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* PDF Export Button */}
        {finalOutcome && (
          <div className="mt-10 flex justify-center pb-12 animate-fade-in">
             <button
               onClick={() => {
                 const suggestion = getSuggestedEventName(inputText);
                 setEventNameInput(suggestion);
                 setShowExportModal(true);
               }}
               className="flex items-center justify-center gap-2.5 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-base transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
             >
               <AppIcon name="Download" size={20} />
               Export Assessment to PDF
             </button>
          </div>
        )}
      </div>

      {/* Event Name Suggestions Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl max-w-md w-full p-6 sm:p-8 relative overflow-hidden flex flex-col gap-6 animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#634488]" />
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#634488]/10 text-[#634488] shrink-0">
                <AppIcon name="Download" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Event Name</h3>
                <p className="text-xs text-gray-400 mt-0.5">Please confirm the name of your event for the PDF report</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Event Name</label>
              <input
                type="text"
                value={eventNameInput}
                onChange={(e) => setEventNameInput(e.target.value)}
                placeholder="e.g. 3rd Annual Endoscopy Workshop"
                className="w-full text-sm font-semibold text-gray-800 border border-gray-200 bg-gray-50 px-4 py-3 rounded-xl outline-none focus:border-[#634488] focus:bg-white focus:ring-2 focus:ring-[#634488]/15 transition-all shadow-inner"
                autoFocus
              />
              <p className="text-[11px] text-[#0099A7] font-light leading-relaxed">
                💡 We extracted this suggestion from the top of your parsed agenda. Please correct it if needed to ensure the report is accurate.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  handleExportPDF(eventNameInput);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#634488] hover:bg-[#533873] shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
