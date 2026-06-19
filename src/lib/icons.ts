import {
  Briefcase, ListTodo, GraduationCap, Award, FolderKanban, Repeat,
  StickyNote, Target, Folder, Heart, Book, Code, Dumbbell, Plane,
  ShoppingCart, DollarSign, Music, Camera, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Folder, Briefcase, ListTodo, GraduationCap, Award, FolderKanban, Repeat,
  StickyNote, Target, Heart, Book, Code, Dumbbell, Plane, ShoppingCart,
  DollarSign, Music, Camera,
};

export const ICON_NAMES = Object.keys(ICONS);

export function getIcon(name?: string | null): LucideIcon {
  return ICONS[name ?? "Folder"] ?? Folder;
}

export const COLOR_OPTIONS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
  "#EC4899", "#14B8A6", "#06B6D4", "#F97316", "#6366F1",
];