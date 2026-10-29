import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: "school-logo--xs",
  sm: "school-logo--sm",
  md: "school-logo--md",
  lg: "school-logo--lg",
  xl: "school-logo--xl",
} as const;

export function SchoolLogo({
  size = "md",
  framed = true,
  className,
  alt = "Sarvajanik High School Fort-Songadh",
}: {
  size?: keyof typeof SIZE;
  framed?: boolean;
  className?: string;
  alt?: string;
}) {
  return (
    <span className={cn("school-logo", SIZE[size], !framed && "school-logo--bare", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SCHOOL_LOGO_URL} alt={alt} className="school-logo__img" />
    </span>
  );
}
