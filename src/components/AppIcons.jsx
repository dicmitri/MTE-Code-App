import React from 'react';
import {
  Home,
  Info,
  ShieldCheck,
  Globe,
  FileText,
  Menu,
  X,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  List,
  Eye,
  EyeOff,
  Search,
  Download,
  Star,
  Bookmark,
  Printer,
  GitBranch,
  RotateCcw,
  Clock
} from 'lucide-react';

export {
  Home,
  Info,
  ShieldCheck,
  Globe,
  FileText,
  Menu,
  X,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  List,
  Eye,
  EyeOff,
  Search,
  Download,
  Star,
  Bookmark,
  Printer,
  GitBranch,
  RotateCcw,
  Clock
};

const CustomSvgWrapper = ({ size = 18, className = "", children }) => (
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
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const CVSIcon = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </CustomSvgWrapper>
);

export const AdminHierarchy = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <rect x="9" y="3" width="6" height="4" />
    <rect x="3" y="14" width="6" height="4" />
    <rect x="15" y="14" width="6" height="4" />
    <line x1="12" y1="7" x2="6" y2="14" />
    <line x1="12" y1="7" x2="18" y2="14" />
  </CustomSvgWrapper>
);

export const IntroI = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="14"
      fontWeight="bold"
      fontFamily="Inter, sans-serif"
      fill="currentColor"
      stroke="none"
    >
      I
    </text>
  </CustomSvgWrapper>
);

export const JusticeScale = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <line x1="12" y1="3" x2="12" y2="20" />
    <line x1="6" y1="7" x2="18" y2="7" />
    <path d="M6 7l-3 5h6l-3-5z" />
    <path d="M18 7l-3 5h6l-3-5z" />
    <line x1="9" y1="20" x2="15" y2="20" />
  </CustomSvgWrapper>
);

export const ABC = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <text
      x="12"
      y="14"
      textAnchor="middle"
      fontSize="10"
      fontWeight="bold"
      fontFamily="Inter, sans-serif"
      fill="currentColor"
      stroke="none"
    >
      ABC
    </text>
  </CustomSvgWrapper>
);

export const Euro = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <text
      x="12"
      y="14"
      textAnchor="middle"
      fontSize="14"
      fontWeight="bold"
      fontFamily="Inter, sans-serif"
      fill="currentColor"
      stroke="none"
    >
      €
    </text>
  </CustomSvgWrapper>
);

export const MaskPerson = ({ size, className }) => (
  <CustomSvgWrapper size={size} className={className}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
    <rect x="7" y="6" width="10" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.2" />
    <path d="M7 8h10" />
  </CustomSvgWrapper>
);

const customIconMap = {
  CVSIcon,
  AdminHierarchy,
  IntroI,
  JusticeScale,
  ABC,
  Euro,
  MaskPerson,
};

const lucideIconMap = {
  Home, Info, ShieldCheck, Globe, FileText, Menu, X, HelpCircle, 
  ChevronRight, ChevronDown, ChevronUp, ChevronLeft, List, Eye, EyeOff,
  Search, Download, Star, Bookmark, Printer, GitBranch, RotateCcw, Clock
};

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

  const IconComponent = customIconMap[name] || lucideIconMap[name];

  if (IconComponent) {
    return <IconComponent size={size} className={className} />;
  }

  return <CustomSvgWrapper size={size} className={className}><circle cx="12" cy="12" r="10" /></CustomSvgWrapper>;
};
