export const SESSION_TYPES = [
  "General Educational",
  "Other",
  "Hands-on",
  "Streaming",
  "Case Study"
];

export const SESSION_TYPE_KEYWORDS = {
  "Hands-on": [
    "hands on",
    "hands-on",
    "practical exercise",
    "cadaver",
    "cadaveric",
    "dissection",
    "dissect",
    "simulation",
    "simulator",
    "dry lab",
    "wet lab",
    "dry-lab",
    "wet-lab",
    "anatomical lab",
    "live tissue",
    "ex vivo",
    "bone model"
  ],
  "Streaming": [
    "streaming",
    "live surgery",
    "live surgeries",
    "demonstration",
    "live demo",
    "transmission",
    "live broadcast",
    "live transmission",
    "operative demonstration",
    "live case",
    "pre-recorded operative"
  ],
  "Case Study": [
    "case study",
    "case studies",
    "case-based",
    "clinical case",
    "case presentation",
    "case discussion",
    "discussion cases",
    "cases discussion",
    "roundtable",
    "panel discussion"
  ],
  "Other": [
    "break",
    "lunch",
    "dinner",
    "registration",
    "welcome",
    "closing",
    "close",
    "discussion",
    "q&a",
    "q & a",
    "reception",
    "coffee",
    "refreshment",
    "exhibition",
    "farewell",
    "buffet",
    "tea",
    "opening",
    "certificate"
  ]
};

const MINOR_WORDS = new Set([
  "of",
  "the",
  "a",
  "an",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "on",
  "at",
  "to",
  "by",
  "in",
  "with",
  "from"
]);

const ACRONYMS = new Set([
  "eus",
  "ercp",
  "tppt",
  "hcp",
  "hcps",
  "mri",
  "ct",
  "iv",
  "gi",
  "esd",
  "poem",
  "emr",
  "mte",
  "md",
  "phd",
  "fna",
  "fnb",
  "dfi",
  "lams",
  "ldtt",
  "ltt",
  "scr",
  "rsa",
  "rtsa",
  "stam",
  "cpd",
  "nhs",
  "uk"
]);

const BULLET_PATTERN = /^[•\-*–—◦▪▫◆◇▶►➔→.·]|^[a-zA-Z0-9]+[.)]|^\([a-zA-Z0-9]+\)/;
const TIME_TOKEN = "(\\d{1,2})(?:[:.h](\\d{2}))\\s*(am|pm|a\\.m\\.|p\\.m\\.)?";

export const timePatternBoth = new RegExp(
  `(?:^|\\b)${TIME_TOKEN}\\s*(?:-|–|—|−|to)\\s*${TIME_TOKEN}\\b`,
  "i"
);

export const timePatternSingle = new RegExp(`(?:^|\\b)${TIME_TOKEN}\\b`, "i");

export function normalizeSourceText(text) {
  return (text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/([:.])\s+(?=\d{2}\b)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeWord(word, letterWordCount) {
  if (/^\s+$/.test(word)) return word;

  const hasLetters = /[a-zA-Z]/.test(word);
  if (!hasLetters) return word;

  const letters = word.replace(/[^a-zA-Z]/g, "");
  const chunks = word.match(/[a-zA-Z]+/g) || [];
  const cleanWord = letters.toLowerCase();
  const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();

  if (!isAllCaps) return word;

  if (ACRONYMS.has(cleanWord)) {
    return word.toUpperCase();
  }

  const isAcronymCompound =
    chunks.length > 1 &&
    chunks.every((chunk) => chunk.length <= 5 && ACRONYMS.has(chunk.toLowerCase()));

  if (isAcronymCompound) {
    return word.toUpperCase();
  }

  if (MINOR_WORDS.has(cleanWord) && letterWordCount > 1) {
    return word.toLowerCase();
  }

  const lowered = word.toLowerCase();
  return lowered.replace(/(^|[-/])([a-z])/g, (_, prefix, first) => {
    return prefix + first.toUpperCase();
  });
}

export function normalizeCapitalization(text) {
  if (!text) return "";
  const trimmed = text.trim();

  if (trimmed.includes("\n")) {
    return trimmed.split("\n").map((line) => normalizeCapitalization(line)).join("\n");
  }

  if (trimmed.includes("•") || trimmed.includes("|") || trimmed.includes(":")) {
    const segments = trimmed.split(/([•|:])+/);
    return segments
      .map((segment) => {
        if (/[•|:]/.test(segment)) return segment;
        return normalizeCapitalization(segment);
      })
      .join("");
  }

  const words = trimmed.split(/(\s+)/);
  let letterWordCount = 0;

  return words
    .map((word) => {
      if (!/^\s+$/.test(word) && /[a-zA-Z]/.test(word)) {
        letterWordCount++;
      }
      return normalizeWord(word, letterWordCount);
    })
    .join("");
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function calculateDuration(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === 0 && e === 0 && start !== "00:00") return 0;
  let duration = e - s;
  if (duration < 0) {
    duration += 24 * 60;
  }
  return duration;
}

function minutesToTime(minutes) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTimeParts(hStr, mStr, amPm) {
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "00", 10);
  const ap = amPm ? amPm.toLowerCase().replace(/\./g, "") : null;

  if (ap === "pm" && h < 12) {
    h += 12;
  } else if (ap === "am" && h === 12) {
    h = 0;
  }

  return { h, m, ap, minutes: h * 60 + m };
}

export function convertTo24Hour(hStr, mStr, amPm) {
  return minutesToTime(parseTimeParts(hStr, mStr, amPm).minutes);
}

function normalizeSingleTime(hStr, mStr, amPm, previousStartTime) {
  const parsed = parseTimeParts(hStr, mStr, amPm);
  let minutes = parsed.minutes;

  if (!parsed.ap && previousStartTime && parsed.h < 12) {
    const previousMinutes = timeToMinutes(previousStartTime);
    const afternoonCandidate = minutes + 12 * 60;
    const forwardGap = afternoonCandidate - previousMinutes;

    if (previousMinutes <= 16 * 60 && minutes < previousMinutes && forwardGap >= 0 && forwardGap <= 180) {
      minutes = afternoonCandidate;
    }
  }

  return minutesToTime(minutes);
}

function normalizeRangeTime(match, previousStartTime) {
  const start = parseTimeParts(match[1], match[2], match[3]);
  const end = parseTimeParts(match[4], match[5], match[6]);
  let startMinutes = start.minutes;
  let endMinutes = end.minutes;

  if (!start.ap && end.ap === "pm" && start.h < 12 && start.h <= end.h) {
    startMinutes += 12 * 60;
  }

  if (!start.ap && previousStartTime && start.h < 12) {
    const previousMinutes = timeToMinutes(previousStartTime);
    const afternoonCandidate = startMinutes + 12 * 60;
    const forwardGap = afternoonCandidate - previousMinutes;

    if (previousMinutes <= 16 * 60 && startMinutes < previousMinutes && forwardGap >= 0 && forwardGap <= 180) {
      startMinutes = afternoonCandidate;
    }
  }

  if (!end.ap && start.ap) {
    endMinutes = parseTimeParts(match[4], match[5], start.ap).minutes;
  }

  if (endMinutes <= startMinutes && end.h < 12) {
    const afternoonCandidate = endMinutes + 12 * 60;
    if (afternoonCandidate > startMinutes && afternoonCandidate - startMinutes <= 12 * 60) {
      endMinutes = afternoonCandidate;
    }
  }

  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes)
  };
}

function isStrictDayChangeLine(trimmedText) {
  if (trimmedText.length > 80) return false;
  const lower = trimmedText.toLowerCase().replace(/\s+/g, " ").trim();
  const dayOnly = /^day\s*(?:\d+|one|two|three|four|five)$/i.test(lower);
  const programmeDay = /^(?:program|programme)\s*[–—-]\s*day\s*(?:\d+|one|two|three|four|five)$/i.test(lower);
  const namedDay = /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:[, ]+\d{1,2}(?:\s+[a-z]+)?(?:\s+\d{4})?)?$/i.test(lower);
  const dateLine = /^\d{1,2}\s+[a-z]+\s+\d{4}$/i.test(lower);
  return dayOnly || programmeDay || namedDay || dateLine;
}

function isIgnorableHeader(trimmedText) {
  if (trimmedText.length > 80) return false;
  const lower = trimmedText.toLowerCase();
  const stopKeywords = [
    "sponsor",
    "venue",
    "faculty",
    "committee",
    "organizer",
    "general information",
    "acknowledgement",
    "disclaimer",
    "patronage",
    "razionale",
    "target audience",
    "course director",
    "workshop faculty",
    "scientific confirmed",
    "industry confirmed",
    "official language",
    "printed program",
    "intellectual property",
    "security",
    "organizing committee",
    "sapphire sponsorship",
    "bronze sponsorship",
    "gold sponsorship",
    "silver sponsorship",
    "platinum sponsorship"
  ];

  return stopKeywords.some((keyword) => lower.includes(keyword));
}

function isSectionHeader(trimmedText) {
  if (trimmedText.length > 80) return false;
  const lower = trimmedText.toLowerCase();

  const isAllCaps =
    trimmedText.length > 3 &&
    trimmedText.length < 60 &&
    trimmedText === trimmedText.toUpperCase() &&
    /[A-Z]/.test(trimmedText);

  const sectionKeywords = [
    "program",
    "programme",
    "schedule",
    "agenda",
    "timetable",
    "workshop",
    "lecture",
    "practical",
    "foundation",
    "complex",
    "debate",
    "insufficiency"
  ];

  return isAllCaps && sectionKeywords.some((keyword) => lower.includes(keyword));
}

function isHighLevelHeader(title, duration) {
  const lower = title.toLowerCase();
  const hasHighLevelWord = /\bday\b|\bcourse\b|\bprogramme\b|\bprogram\b|\bsymposium\b|\bconference\b|\bmeeting\b/i.test(lower);
  return duration >= 180 && hasHighLevelWord;
}

function isTerminalMarker(title) {
  const lower = title.toLowerCase();
  return /\b(end|close|closing|summary)\b/.test(lower) && !/\bdiscussion\b/.test(lower);
}

function cleanLeadingMarkers(text) {
  return text.replace(BULLET_PATTERN, "").trim();
}

function hasKeyword(text, keywords) {
  return keywords.some((keyword) => {
    if (/[^a-z0-9]/i.test(keyword)) {
      return text.includes(keyword);
    }

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });
}

export function classifySessionTitle(title, sectionTitle = "") {
  const normalizedTitle = title.toLowerCase();
  const primaryTitle = normalizedTitle.split("\n")[0];
  const normalizedSection = sectionTitle.toLowerCase();

  const isMainOther =
    hasKeyword(primaryTitle, SESSION_TYPE_KEYWORDS.Other) ||
    /\b(end|close|closing|summary)\b/.test(primaryTitle);

  if (isMainOther) {
    return "Other";
  }

  if (hasKeyword(primaryTitle, SESSION_TYPE_KEYWORDS["Hands-on"])) {
    return "Hands-on";
  }

  if (hasKeyword(primaryTitle, SESSION_TYPE_KEYWORDS.Streaming)) {
    return "Streaming";
  }

  if (hasKeyword(primaryTitle, SESSION_TYPE_KEYWORDS["Case Study"])) {
    return "Case Study";
  }

  if (sectionTitle) {
    if (/\bhands[- ]?on\b|\bcadaver|\bdissect|\bwet lab\b|\bdry lab\b|\blive tissue\b|\bex vivo\b/i.test(normalizedSection)) {
      return "Hands-on";
    }

    if (/\blive\b|\bstreaming\b|\bdemonstration\b|\btransmission\b/i.test(normalizedSection)) {
      return "Streaming";
    }

    if (/\bpractical sessions?\b|\bpractical\b/i.test(normalizedSection)) {
      return "Hands-on";
    }

    if (/\bcase\b|\bdiscussion\b|\broundtable\b/i.test(normalizedSection)) {
      return "Case Study";
    }
  }

  return "General Educational";
}

function appendSessionLine(currentSession, trimmed) {
  const prevTitle = currentSession.title;
  const isBullet = BULLET_PATTERN.test(trimmed);

  if (isBullet) {
    currentSession.title += (prevTitle ? "\n" : "") + cleanLeadingMarkers(trimmed);
  } else if (prevTitle.endsWith("-")) {
    currentSession.title = prevTitle.slice(0, -1) + trimmed;
    currentSession.primaryTitle = currentSession.title;
  } else {
    currentSession.title += (prevTitle ? " " : "") + trimmed;
    currentSession.primaryTitle = currentSession.title;
  }
}

function finishCurrentSession(sessionChunks, currentSession, nextStartTime, isNewDayPending) {
  if (!currentSession) return;

  const nextStartMinutes = timeToMinutes(nextStartTime);
  const previousStartMinutes = timeToMinutes(currentSession.startTime);
  const isImplicitDayChange = nextStartMinutes < previousStartMinutes;

  if (
    !isNewDayPending &&
    !isImplicitDayChange &&
    !currentSession.endTime &&
    !isTerminalMarker(currentSession.primaryTitle || currentSession.title)
  ) {
    currentSession.endTime = nextStartTime;
  }

  sessionChunks.push(currentSession);
}

function makeSession(rawTitle, startTime, endTime, sectionTitle) {
  const title = rawTitle.trim();
  return {
    title,
    primaryTitle: title,
    startTime,
    endTime,
    sectionTitle
  };
}

export function parseTpptSessions(inputText, options = {}) {
  const { includeIds = false } = options;
  const lines = normalizeSourceText(inputText).split("\n");
  const sessionChunks = [];
  let currentSession = null;
  let currentSectionTitle = "";
  let isNewDayPending = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const previousStartTime = currentSession?.startTime || sessionChunks.at(-1)?.startTime || "";
    const matchBoth = trimmed.match(timePatternBoth);
    const matchSingle = trimmed.match(timePatternSingle);
    const hasTime = matchBoth || matchSingle;

    if (!hasTime) {
      if (isStrictDayChangeLine(trimmed)) {
        if (currentSession && /^program(?:me)?\s*[–—-]\s*day/i.test(trimmed)) {
          currentSectionTitle = "";
          continue;
        }

        if (currentSession && !/^program(?:me)?\s*[–—-]\s*day/i.test(trimmed)) {
          sessionChunks.push(currentSession);
          currentSession = null;
        }
        isNewDayPending = true;
        currentSectionTitle = "";
        continue;
      }

      if (isIgnorableHeader(trimmed)) {
        continue;
      }

      if (isSectionHeader(trimmed)) {
        currentSectionTitle = trimmed;
        continue;
      }

      if (currentSession) {
        appendSessionLine(currentSession, trimmed);
      }
      continue;
    }

    if (matchBoth) {
      const { startTime, endTime } = normalizeRangeTime(matchBoth, previousStartTime);
      const sessionTitle = trimmed.replace(matchBoth[0], "").trim();
      const duration = calculateDuration(startTime, endTime);

      if (isHighLevelHeader(sessionTitle, duration)) {
        continue;
      }

      finishCurrentSession(sessionChunks, currentSession, startTime, isNewDayPending);
      currentSession = makeSession(sessionTitle, startTime, endTime, currentSectionTitle);
      isNewDayPending = false;
      continue;
    }

    if (matchSingle) {
      const startTime = normalizeSingleTime(matchSingle[1], matchSingle[2], matchSingle[3], previousStartTime);
      finishCurrentSession(sessionChunks, currentSession, startTime, isNewDayPending);
      currentSession = makeSession(trimmed.replace(matchSingle[0], "").trim(), startTime, "", currentSectionTitle);
      isNewDayPending = false;
    }
  }

  if (currentSession) {
    sessionChunks.push(currentSession);
  }

  return sessionChunks.map((session) => {
    let cleanTitle = session.title.replace(/[ \t]+/g, " ").trim();
    cleanTitle = cleanTitle.replace(/^(?:am|pm|a\.m\.|p\.m\.)\b\s*/i, "").trim();

    if (cleanTitle.startsWith("|")) {
      cleanTitle = cleanTitle.substring(1).trim();
    }

    cleanTitle = normalizeCapitalization(cleanTitle);

    const cleanPrimaryTitle = normalizeCapitalization(
      (session.primaryTitle || cleanTitle).replace(/[ \t]+/g, " ").trim()
    );

    let type = classifySessionTitle(cleanPrimaryTitle, session.sectionTitle);

    if (session.sectionTitle && session.sectionTitle.trim()) {
      const normalizedSection = normalizeCapitalization(session.sectionTitle);
      cleanTitle = `[${normalizedSection}]\n${cleanTitle}`;
    }

    const parsedSession = {
      title: cleanTitle || "Untitled Session",
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.startTime && session.endTime
        ? calculateDuration(session.startTime, session.endTime)
        : 0,
      type
    };

    if (includeIds) {
      parsedSession.id = generateId();
    }

    return parsedSession;
  });
}

export function calculateTpptEligibility(sessions) {
  let total = 0;
  let handsOn = 0;
  let practical = 0;

  sessions.forEach((session) => {
    const duration = Number(session.durationMinutes) || 0;
    total += duration;

    if (session.type === "Hands-on") {
      handsOn += duration;
      practical += duration;
    } else if (session.type === "Streaming" || session.type === "Case Study") {
      practical += duration;
    }
  });

  const meetsHandsOn = total > 0 && handsOn >= total / 3;
  const meetsPractical = total > 0 && practical > total / 2;

  return {
    total,
    handsOn,
    practical,
    passesAgenda: meetsHandsOn && meetsPractical
  };
}

export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

function isLetterSpacedLine(line) {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 4 && /\b[A-Z](?:\s+[A-Z]){3,}\b/.test(line);
}

function isLikelyEventNameNoise(line) {
  const lower = line.toLowerCase();
  return (
    /^(?:date|venue|location|cpd)\s*:/i.test(line) ||
    /^\d{1,2}\s+[a-z]+\s*[–—-]/i.test(lower) ||
    /^\d{1,2}\s*[–—-]\s*\d{1,2}\s+[a-z]+\s+\d{4}$/i.test(lower) ||
    /^\d{1,2}\s+[a-z]+\s+\d{4}$/i.test(lower) ||
    /\b(?:street|campus|building|postcode|credits?|applied for)\b/i.test(lower) ||
    /\b(?:delegates will|educational aims|meeting convenors|format of the event)\b/i.test(lower) ||
    /^(?:professor|mr|mrs|ms|dr)\b/i.test(line) ||
    /^[A-Z]{1,3}\d\s*\d[A-Z]{2}$/i.test(line) ||
    isLetterSpacedLine(line)
  );
}

export function getSuggestedEventName(inputText) {
  if (!inputText) return "My MedTech Event";
  const lines = normalizeSourceText(inputText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (timePatternBoth.test(line) || timePatternSingle.test(line)) {
      continue;
    }

    if (line.length < 4 || isLikelyEventNameNoise(line) || isIgnorableHeader(line) || isSectionHeader(line) || isStrictDayChangeLine(line)) {
      continue;
    }

    let cleaned = line.replace(timePatternBoth, "").replace(timePatternSingle, "").trim();
    cleaned = cleanLeadingMarkers(cleaned);

    if (cleaned.length > 3) {
      const titleParts = [cleaned];

      for (let nextIndex = index + 1; nextIndex < lines.length && titleParts.length < 4; nextIndex++) {
        const nextLine = lines[nextIndex];
        if (
          nextLine.length < 4 ||
          timePatternBoth.test(nextLine) ||
          timePatternSingle.test(nextLine) ||
          isLikelyEventNameNoise(nextLine) ||
          isIgnorableHeader(nextLine) ||
          isSectionHeader(nextLine) ||
          isStrictDayChangeLine(nextLine)
        ) {
          break;
        }

        titleParts.push(cleanLeadingMarkers(nextLine));
      }

      return normalizeCapitalization(titleParts.join(" "));
    }
  }

  return "My MedTech Event";
}
