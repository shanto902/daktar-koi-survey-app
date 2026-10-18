export type SurveyType =
  | "Doctor"
  | "Chamber"
  | "Clinic"
  | "Hospital"
  | "Diagnostic Center"
  | "Pharmacy"
  | "Other";

export const SURVEY_TYPES: {
  label: string;
  labelBn: string;
  value: SurveyType;
  icon: string;
  color: string;
}[] = [
  {
    label: "Doctor",
    labelBn: "ডাক্তার",
    value: "Doctor",
    icon: "medical",
    color: "#0284C7",
  },
  {
    label: "Chamber",
    labelBn: "চেম্বার",
    value: "Chamber",
    icon: "business",
    color: "#0D9488",
  },
  {
    label: "Clinic",
    labelBn: "ক্লিনিক",
    value: "Clinic",
    icon: "fitness",
    color: "#10B981",
  },
  {
    label: "Hospital",
    labelBn: "হাসপাতাল",
    value: "Hospital",
    icon: "medkit",
    color: "#EF4444",
  },
  {
    label: "Diagnostic Center",
    labelBn: "ডায়াগনস্টিক সেন্টার",
    value: "Diagnostic Center",
    icon: "pulse",
    color: "#8B5CF6",
  },
  {
    label: "Pharmacy",
    labelBn: "ফার্মেসী",
    value: "Pharmacy",
    icon: "bandage",
    color: "#F59E0B",
  },
  {
    label: "Other",
    labelBn: "অন্যান্য",
    value: "Other",
    icon: "ellipsis-horizontal-circle",
    color: "#6B7280",
  },
];

export type PhotoType =
  | "Doctor Visiting Card"
  | "Chamber Banner"
  | "Facility Signboard"
  | "Prescription or Document"
  | "Facility Exterior"
  | "Other";

export const PHOTO_TYPES: {
  label: string;
  labelBn: string;
  value: PhotoType;
  icon: string;
}[] = [
  {
    label: "Doctor Visiting Card",
    labelBn: "ভিজিটিং কার্ড",
    value: "Doctor Visiting Card",
    icon: "card",
  },
  {
    label: "Chamber Banner",
    labelBn: "চেম্বার ব্যানার",
    value: "Chamber Banner",
    icon: "flag",
  },
  {
    label: "Facility Signboard",
    labelBn: "সাইনবোর্ড",
    value: "Facility Signboard",
    icon: "image",
  },
  {
    label: "Prescription or Document",
    labelBn: "প্রেসক্রিপশন / নথি",
    value: "Prescription or Document",
    icon: "document-text",
  },
  {
    label: "Facility Exterior",
    labelBn: "বাহ্যিক দৃশ্য",
    value: "Facility Exterior",
    icon: "camera",
  },
  { label: "Other", labelBn: "অন্যান্য", value: "Other", icon: "albums" },
];

export type SurveyStatus = "Draft" | "Completed" | "Needs Review";

export const SURVEY_STATUSES: {
  label: string;
  labelBn: string;
  value: SurveyStatus;
  color: string;
  bgColor: string;
}[] = [
  {
    label: "Draft",
    labelBn: "খসড়া",
    value: "Draft",
    color: "#D97706",
    bgColor: "#FEF3C7",
  },
  {
    label: "Completed",
    labelBn: "সম্পন্ন",
    value: "Completed",
    color: "#059669",
    bgColor: "#D1FAE5",
  },
  {
    label: "Needs Review",
    labelBn: "পর্যালোচনা প্রয়োজন",
    value: "Needs Review",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
];

export const WEEKDAYS = [
  { en: "Saturday", bn: "শনিবার", shortEn: "Sat", shortBn: "শনি" },
  { en: "Sunday", bn: "রবিবার", shortEn: "Sun", shortBn: "রবি" },
  { en: "Monday", bn: "সোমবার", shortEn: "Mon", shortBn: "সোম" },
  { en: "Tuesday", bn: "মঙ্গলবার", shortEn: "Tue", shortBn: "মঙ্গল" },
  { en: "Wednesday", bn: "বুধবার", shortEn: "Wed", shortBn: "বুধ" },
  { en: "Thursday", bn: "বৃহস্পতিবার", shortEn: "Thu", shortBn: "বৃহঃ" },
  { en: "Friday", bn: "শুক্রবার", shortEn: "Fri", shortBn: "শুক্র" },
];
