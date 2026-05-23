import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";

export type StudentAvatarPreview = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type StudentAvatarGroupProps = {
  students: StudentAvatarPreview[];
  /** When higher than `students.length`, shows a +N overflow badge. */
  totalCount?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

const sizeStyles = {
  sm: {
    avatar: "h-7 w-7",
    initials: "text-[9px]",
    overflow: "text-[10px]",
  },
  md: {
    avatar: "h-9 w-9",
    initials: "text-[10px]",
    overflow: "text-xs",
  },
};

function StudentAvatar({
  student,
  size,
}: {
  student: StudentAvatarPreview;
  size: "sm" | "md";
}) {
  const displayName = formatDisplayPersonName(student.name);
  const styles = sizeStyles[size];

  const avatar = student.avatarUrl ? (
    <img
      src={student.avatarUrl}
      alt=""
      className={cn(styles.avatar, "rounded-full object-cover ring-2 ring-white")}
    />
  ) : (
    <span
      className={cn(
        styles.avatar,
        styles.initials,
        "flex items-center justify-center rounded-full bg-gray-100 font-semibold uppercase text-foreground/60 ring-2 ring-white",
      )}
      aria-hidden
    >
      {profileInitials(displayName)}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative inline-block hover:z-10">{avatar}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {displayName}
      </TooltipContent>
    </Tooltip>
  );
}

export function StudentAvatarGroup({
  students,
  totalCount,
  max = 4,
  size = "sm",
  className,
}: StudentAvatarGroupProps) {
  if (students.length === 0) return null;

  const styles = sizeStyles[size];
  const total = totalCount ?? students.length;
  const visible = students.slice(0, max);
  const overflow = Math.max(0, total - visible.length);

  return (
    <div className={cn("flex -space-x-2", className)} aria-label={`${total} student${total === 1 ? "" : "s"} joined`}>
      {visible.map((student) => (
        <StudentAvatar key={student.id} student={student} size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            styles.avatar,
            styles.overflow,
            "relative inline-flex items-center justify-center rounded-full bg-gray-100 font-semibold text-foreground/70 ring-2 ring-white hover:z-10",
          )}
          title={`${overflow} more student${overflow === 1 ? "" : "s"}`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
