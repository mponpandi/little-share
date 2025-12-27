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
      className={`${gradient} p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all hover:scale-105 active:scale-95 shadow-soft min-h-[100px]`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-white font-medium text-sm">{label}</span>
      <span className="text-white/80 text-xs">{count} items</span>
    </button>
  );
}