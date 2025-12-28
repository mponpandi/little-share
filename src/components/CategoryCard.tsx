import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  count: number;
  gradient: string;
  onClick?: () => void;
}

export function CategoryCard({ icon: Icon, label, count, gradient, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className={`${gradient} p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-soft min-h-[72px] w-full aspect-square`}
    >
      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-white font-medium text-xs leading-tight">{label}</span>
      <span className="text-white/80 text-[10px] leading-tight">{count}</span>
    </button>
  );
}