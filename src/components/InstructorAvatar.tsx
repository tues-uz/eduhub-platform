import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";

type InstructorAvatarProps = {
  name: string;
  avatarUrl?: string;
  className?: string;
};

export function InstructorAvatar({ name, avatarUrl, className = "h-6 w-6" }: InstructorAvatarProps) {
  const displayName = formatDisplayPersonName(name);
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-gray-200`}
      />
    );
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold uppercase text-foreground/60 ring-1 ring-gray-200`}
      aria-hidden
    >
      {profileInitials(displayName)}
    </span>
  );
}
