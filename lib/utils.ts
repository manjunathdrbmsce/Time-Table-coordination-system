import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function getDayName(day: number): string {
  const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  return days[day] || "";
}

export function getShortDayName(day: number): string {
  const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];
  return days[day] || "";
}

export function getSlotTime(slot: number): string {
  const times = [
    "",
    "8:00 - 8:50",
    "8:55 - 9:45",
    "9:50 - 10:40",
    "10:45 - 11:35",
    "12:30 - 1:20",
    "1:25 - 2:15",
    "2:20 - 3:10",
    "3:15 - 4:05",
  ];
  return times[slot] || "";
}

export function calculatePercentage(achieved: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((achieved / target) * 100);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}
