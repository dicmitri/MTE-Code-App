import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as path from 'path';

// Extractor rules/constants identical to TPPTContent.tsx
const SESSION_TYPES = [
  "General Educational",
  "Other",
  "Hands-on",
  "Streaming",
  "Case Study"
];

// Helper functions matching TPPTContent.tsx exactly:

function normalizeCapitalization(text) {
  if (!text) return "";
  const trimmed = text.trim();
  
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(line => normalizeCapitalization(line)).join('\n');
  }
  
  if (trimmed.includes('•') || trimmed.includes('|') || trimmed.includes(':')) {
    const segments = trimmed.split(/([•|:])+/);
    return segments.map(seg => {
      if (/[•|:]/.test(seg)) return seg;
      return normalizeCapitalization(seg);
    }).join('');
  }

  const words = trimmed.split(/(\s+)/);
  let letterWordCount = 0;
  
  const minorWords = ["of", "the", "a", "an", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "with", "from"];
  const acronyms = ["eus", "ercp", "tppt", "hcp", "hcps", "mri", "ct", "iv", "or", "gi", "esd", "poem", "emr", "mte", "md", "phd"];

  const processedWords = words.map((word) => {
    if (/^\s+$/.test(word)) return word;
    const hasLetters = /[a-zA-Z]/.test(word);
    if (!hasLetters) return word;
    
    letterWordCount++;
    const letters = word.replace(/[^a-zA-Z]/g, '');
    const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();
    
    if (isAllCaps) {
      const cleanWord = letters.toLowerCase();
      if (acronyms.includes(cleanWord)) {
        return word.toUpperCase();
      }
      if (minorWords.includes(cleanWord) && letterWordCount > 1) {
        return word.toLowerCase();
      }
      return word.replace(/([a-zA-Z])([a-zA-Z]*)/g, (m, first, rest) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    }
    return word;
  });

  return processedWords.join('');
}

const timePatternBoth = /(?:^|\b)(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|to)\s*(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/i;
const timePatternSingle = /(?:^|\b)(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/i;

function convertTo24Hour(hStr, mStr, amPm) {
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

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function calculateDuration(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === 0 && e === 0 && start !== '00:00') return 0;
  let dur = e - s;
  if (dur < 0) {
    dur += 24 * 60;
  }
  return dur;
}

function getSuggestedEventName(inputText) {
  if (!inputText) return "My MedTech Event";
  const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (const line of lines) {
    if (timePatternBoth.test(line) || timePatternSingle.test(line)) {
      continue;
    }
    if (line.length < 4) continue;
    
    let cleaned = line;
    cleaned = cleaned.replace(timePatternBoth, '').replace(timePatternSingle, '').trim();
    cleaned = cleaned.replace(/^[•\-*–—◦▪▫◆◇▶►➔→\.\·]|^[a-zA-Z0-9]+[\.\)]|^\([a-zA-Z0-9]+\)/, '').trim();
    
    if (cleaned.length > 3) {
      return normalizeCapitalization(cleaned);
    }
  }
  return "My MedTech Event";
}

function isDayChangeLine(trimmedText) {
  if (trimmedText.length > 60) return false;
  const lower = trimmedText.toLowerCase();
  const hasDayWord = /\bday\s*\d+\b|\bday\s*(?:one|two|three|four|five)\b/i.test(lower);
  const hasDayName = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower);
  return hasDayWord || hasDayName;
}

function isSectionHeader(trimmedText) {
  if (trimmedText.length > 60) return false;
  const lower = trimmedText.toLowerCase();
  const stopKeywords = [
    "sponsor", "venue", "faculty", "committee", "organizer",
    "general information", "participant",
    "acknowledgement", "disclaimer", "patronage", "rational", "razionale",
    "target audience", "course director",
    "dissecting room", "workshop faculty", "scientific confirmed", "industry confirmed",
    "official language", "printed program", "intellectual property", "security",
    "organizing committee", "sapphire sponsorship", "bronze sponsorship",
    "gold sponsorship", "silver sponsorship", "platinum sponsorship"
  ];
  
  const isStopWord = stopKeywords.some(kw => lower.includes(kw));
  
  // ALL CAPS heuristic: only trigger on short lines that look like structural headers,
  // not generic session content like "OPERATIVE" or "DEMONSTRATION"
  const isAllCaps = trimmedText.length > 3 && trimmedText.length < 50
    && trimmedText === trimmedText.toUpperCase() && /[A-Z]/.test(trimmedText);
  const sectionKeywords = ["program", "programme", "schedule", "agenda", "timetable",
    "faculty", "speaker", "moderator", "committee", "director", "sponsor",
    "registration", "venue", "objective", "disclaimer", "confirmed",
    "session", "workshop", "lecture", "practical"];
  const hasStructuralWord = isAllCaps && sectionKeywords.some(kw => lower.includes(kw));
  
  return isStopWord || hasStructuralWord;
}

function isHighLevelHeader(title, duration) {
  const lower = title.toLowerCase();
  const hasHighLevelWord = /\bcourse\b|\bprogramme\b|\bprogram\b|\bsymposium\b|\bconference\b|\bmeeting\b/i.test(lower);
  return duration >= 180 && hasHighLevelWord;
}

function parseTextToSessions(inputText) {
  const lines = inputText.split('\n');
  const sessionChunks = [];
  let currentSession = null;
  let currentSectionTitle = "";
  let isNewDayPending = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matchBoth = trimmed.match(timePatternBoth);
    const matchSingle = trimmed.match(timePatternSingle);
    const hasTime = matchBoth || matchSingle;

    // Only check day boundaries and section headers on lines WITHOUT a time
    if (!hasTime) {
      // Detect explicit day boundary line
      if (isDayChangeLine(trimmed)) {
        isNewDayPending = true;
        if (currentSession) {
          sessionChunks.push(currentSession);
          currentSession = null;
        }
        continue;
      }

      // If it's a section header, update context but do NOT destroy current session
      if (isSectionHeader(trimmed)) {
        currentSectionTitle = trimmed;
        // Push current session if one exists, but keep the flow going
        if (currentSession) {
          sessionChunks.push(currentSession);
          currentSession = null;
        }
        continue;
      }
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
        // Link previous session's end time if it was missing
        if (!currentSession.endTime) {
          currentSession.endTime = startTimeNorm;
        }
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
  
  return sessionChunks.map((s) => {
    let cleanTitle = s.title.replace(/[ \t]+/g, ' ').trim();
    cleanTitle = cleanTitle.replace(/^(?:am|pm|a\.m\.|p\.m\.)\b\s*/i, '').trim();
    
    // Strip leading "|" if any from formatting
    if (cleanTitle.startsWith('|')) {
      cleanTitle = cleanTitle.substring(1).trim();
    }
    
    cleanTitle = normalizeCapitalization(cleanTitle);

    let type = "General Educational";
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
      if (secLower.includes("hands-on") || secLower.includes("cadaver") || secLower.includes("dissect")) {
        type = "Hands-on";
      } else if (secLower.includes("live") || secLower.includes("streaming") || secLower.includes("demonstration")) {
        type = "Streaming";
      } else if (secLower.includes("practical") || secLower.includes("case") || secLower.includes("discussion") || secLower.includes("roundtable")) {
        type = "Case Study";
      }
    }

    let durationMinutes = 0;
    if (s.startTime && s.endTime) {
      durationMinutes = calculateDuration(s.startTime, s.endTime);
    }
    
    // Prepend section context to title for visibility
    if (s.sectionTitle && s.sectionTitle.trim()) {
      const normalizedSection = normalizeCapitalization(s.sectionTitle);
      cleanTitle = '[' + normalizedSection + ']\n' + cleanTitle;
    }

    return {
      title: cleanTitle || 'Untitled Session',
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes,
      type
    };
  });
}

// Extraction logic from TPPTContent.tsx
async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
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
  return fullText.replace(/\n{3,}/g, '\n\n');
}

// Run analysis
async function runAnalysis() {
  const agendasDir = 'c:/Users/dicmi/Documents/GitHub/MTE-Code-App/TPPT agendas';
  const outDir = 'c:/Users/dicmi/Documents/GitHub/MTE-Code-App/scratch/extracted';
  const parsedDir = 'c:/Users/dicmi/Documents/GitHub/MTE-Code-App/scratch/parsed';
  
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(parsedDir, { recursive: true });
  
  const files = fs.readdirSync(agendasDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`\n=== Starting Analysis of ${files.length} PDF Agendas ===\n`);
  
  let reportMarkdown = `# Agenda Parsing Analysis Report\n\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
  reportMarkdown += `| File Name | Extracted Event Name (Suggested) | Pages | Sessions | Total Duration | Hands-on Duration (%) | Practical Duration (%) | Passes Agenda? |\n`;
  reportMarkdown += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const file of files) {
    const filePath = path.join(agendasDir, file);
    try {
      console.log(`Processing: ${file}...`);
      const extractedText = await extractPdfText(filePath);
      
      // Save raw text
      const txtFile = file.replace(/\.pdf$/i, '.txt');
      fs.writeFileSync(path.join(outDir, txtFile), extractedText);
      
      const suggestedName = getSuggestedEventName(extractedText);
      const parsedSessions = parseTextToSessions(extractedText);
      
      // Save parsed sessions
      const jsonFile = file.replace(/\.pdf$/i, '_sessions.json');
      fs.writeFileSync(path.join(parsedDir, jsonFile), JSON.stringify(parsedSessions, null, 2));

      // Calculate totals
      let total = 0;
      let handsOn = 0;
      let practical = 0;

      parsedSessions.forEach(s => {
        const dur = s.durationMinutes || 0;
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
      const passes = meetsHandsOn && meetsPractical;

      const formatHrs = (mins) => {
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return `${h}h ${m}m`;
      };

      const handsOnPct = total > 0 ? ((handsOn / total) * 100).toFixed(1) : '0';
      const practicalPct = total > 0 ? ((practical / total) * 100).toFixed(1) : '0';

      reportMarkdown += `| \`${file}\` | **${suggestedName}** | \`${parsedSessions.length > 0 ? 'Success' : 'Empty'}\` (${parsedSessions.length}) | ${parsedSessions.length} | ${formatHrs(total)} | ${formatHrs(handsOn)} (${handsOnPct}%) | ${formatHrs(practical)} (${practicalPct}%) | ${passes ? '✅ PASS' : '❌ FAIL'} |\n`;
      console.log(`  - Extracted Name: "${suggestedName}"`);
      console.log(`  - Sessions parsed: ${parsedSessions.length}`);
      console.log(`  - Total Duration: ${formatHrs(total)}`);
      console.log(`  - Hands-on: ${formatHrs(handsOn)} (${handsOnPct}%)`);
      console.log(`  - Practical: ${formatHrs(practical)} (${practicalPct}%)`);
      console.log(`  - Passes Agenda: ${passes ? 'YES' : 'NO'}`);
      console.log(`-----------------------------------------------`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
      reportMarkdown += `| \`${file}\` | *Error* | - | - | - | - | - | ❌ ERROR |\n`;
    }
  }

  fs.writeFileSync('c:/Users/dicmi/Documents/GitHub/MTE-Code-App/scratch/agenda_analysis_report.md', reportMarkdown);
  console.log(`\n=== Analysis Complete! ===\nSummary saved to: scratch/agenda_analysis_report.md\n`);
}

runAnalysis();
