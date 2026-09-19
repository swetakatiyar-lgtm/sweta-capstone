import {
  FileText,
  Folder,
  MessageCircle,
  Users,
  PenTool,
  Search,
  BarChart3,
  Palette,
  Briefcase,
  Building2,
  Lightbulb,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const KEYWORD_ICONS = [
  [/pro\s*tip|^tip\b/i, Lightbulb],
  [/warning|caution/i, AlertTriangle],
  [/resume|cv\b/i, FileText],
  [/portfolio/i, Folder],
  [/interview/i, MessageCircle],
  [/network/i, Users],
  [/figma/i, PenTool],
  [/research|user\s*test/i, Search],
  [/metric|kpi|analytic/i, BarChart3],
  [/design(?!ed)/i, Palette],
  [/internship|job|role/i, Briefcase],
  [/compan(y|ies)/i, Building2],
];

export function getIconForText(text = "") {
  for (const [pattern, Icon] of KEYWORD_ICONS) {
    if (pattern.test(text)) return Icon;
  }
  return Sparkles;
}
