import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: "h-5 w-5", text: "text-sm" },
  md: { icon: "h-6 w-6", text: "text-base" },
  lg: { icon: "h-7 w-7", text: "text-xl" },
};

export function Logo({ size = "md", linkTo, showText = true, className }: LogoProps) {
  const s = sizeMap[size];

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <GraduationCap className={cn(s.icon, "text-sidebar-primary")} />
      {showText && (
        <span className={cn("font-serif font-bold tracking-wide text-sidebar-primary", s.text)}>
          QuizFlow
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
}
