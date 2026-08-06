import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowsRightLeftIcon,
  Bars3Icon,
  BellIcon,
  BoltIcon,
  BookOpenIcon,
  CalendarDateRangeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CameraIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  HeartIcon,
  HomeIcon,
  IdentificationIcon,
  LightBulbIcon,
  LinkIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
  PlayCircleIcon,
  PlusIcon,
  PresentationChartLineIcon,
  QrCodeIcon,
  QuestionMarkCircleIcon,
  ReceiptPercentIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  Square2StackIcon,
  StarIcon,
  StopIcon,
  TableCellsIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon,
  ViewColumnsIcon,
  XCircleIcon,
  XMarkIcon,
  Cog6ToothIcon,
  BuildingLibraryIcon,
  Squares2X2Icon,
  ListBulletIcon,
  BookmarkSquareIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

export type LucideIcon = React.ComponentType<
  SVGProps<SVGSVGElement> & {
    className?: string;
    size?: number | string;
    strokeWidth?: number;
  }
>;

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number;
};

function createIcon(
  Icon: React.ComponentType<SVGProps<SVGSVGElement>>,
  options?: { defaultClassName?: string; spin?: boolean },
): LucideIcon {
  const Wrapped = ({ className, size, strokeWidth: _strokeWidth, style, ...props }: IconProps) => (
    <Icon
      className={cn(options?.defaultClassName ?? "h-4 w-4", options?.spin && "animate-spin", className)}
      style={size != null ? { ...style, width: size, height: size } : style}
      {...props}
    />
  );
  return Wrapped as LucideIcon;
}

function createSvgIcon(render: (props: IconProps) => JSX.Element, defaultClassName = "h-4 w-4"): LucideIcon {
  const Wrapped = (props: IconProps) => render(props);
  return Wrapped as LucideIcon;
}

export const Archive = createIcon(ArchiveBoxIcon);
export const ArchiveRestore = createIcon(ArchiveBoxArrowDownIcon);
export const AlertCircle = createIcon(ExclamationCircleIcon);
export const ArrowLeft = createIcon(ArrowLeftIcon);
export const ArrowLeftRight = createIcon(ArrowsRightLeftIcon);
export const ArrowRight = createIcon(ArrowRightIcon);
export const Award = createIcon(TrophyIcon);
export const Activity = createIcon(PresentationChartLineIcon);
export const BarChart2 = createIcon(ChartBarSquareIcon);
export const BarChart3 = createIcon(ChartBarIcon);
export const Bell = createIcon(BellIcon);
export const BookOpen = createIcon(BookOpenIcon);
export const Calendar = createIcon(CalendarIcon);
export const CalendarCheck = createIcon(ClipboardDocumentCheckIcon);
export const CalendarClock = createIcon(ClockIcon);
export const CalendarDays = createIcon(CalendarDaysIcon);
export const CalendarRange = createIcon(CalendarDateRangeIcon);
export const Camera = createIcon(CameraIcon);
export const Check = createIcon(CheckIcon);
export const CheckCircle = createIcon(CheckCircleIcon);
export const CheckCircle2 = createIcon(CheckCircleIcon);
export const ChevronDown = createIcon(ChevronDownIcon);
export const ChevronLeft = createIcon(ChevronLeftIcon);
export const ChevronRight = createIcon(ChevronRightIcon);
export const ChevronUp = createIcon(ChevronUpIcon);
export const Circle = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-2 w-2", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="12" cy="12" r="4" />
  </svg>
));
export const CircleDollarSign = createIcon(CurrencyDollarIcon);
export const CircleHelp = createIcon(QuestionMarkCircleIcon);
export const ClipboardCheck = createIcon(ClipboardDocumentCheckIcon);
export const ClipboardList = createIcon(ClipboardDocumentListIcon);
export const Clock = createIcon(ClockIcon);
export const Clock3 = createIcon(ClockIcon);
export const CreditCard = createIcon(CreditCardIcon);
export const DollarSign = createIcon(CurrencyDollarIcon);
export const Dot = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-2 w-2", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="12" cy="12" r="3" />
  </svg>
));
export const Download = createIcon(ArrowDownTrayIcon);
export const ExternalLink = createIcon(ArrowTopRightOnSquareIcon);
export const Eye = createIcon(EyeIcon);
export const EyeOff = createIcon(EyeSlashIcon);
export const FileCheck = createIcon(DocumentCheckIcon);
export const FileDown = createIcon(DocumentArrowDownIcon);
export const FileSpreadsheet = createIcon(TableCellsIcon);
export const FileText = createIcon(DocumentTextIcon);
export const Globe = createIcon(GlobeAltIcon);
export const GraduationCap = createIcon(AcademicCapIcon);
export const GripVertical = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-4 w-4", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
));
export const Heart = createIcon(HeartIcon);
export const Home = createIcon(HomeIcon);
export const IdCard = createIcon(IdentificationIcon);
export const Image = createIcon(PhotoIcon);
export const Images = createIcon(PhotoIcon);
export const LayoutDashboard = createIcon(Squares2X2Icon);
export const Library = createIcon(BuildingLibraryIcon);
export const Lightbulb = createIcon(LightBulbIcon);
export const Link2 = createIcon(LinkIcon);
export const ListChecks = createIcon(ListBulletIcon);
export const Loader2 = createIcon(ArrowPathIcon, { spin: true });
export const Lock = createIcon(LockClosedIcon);
export const LogOut = createIcon(ArrowRightOnRectangleIcon);
export const Mail = createIcon(EnvelopeIcon);
export const MapPin = createIcon(MapPinIcon);
export const Maximize2 = createIcon(ArrowsPointingOutIcon);
export const Megaphone = createIcon(MegaphoneIcon);
export const Menu = createIcon(Bars3Icon);
export const Minimize2 = createIcon(ArrowsPointingInIcon);
export const MoreHorizontal = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-4 w-4", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
));
export const MoreVertical = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-4 w-4", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="12" cy="5" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="12" cy="19" r="1.75" />
  </svg>
));
export const PanelLeft = createIcon(ViewColumnsIcon);
export const Pencil = createIcon(PencilSquareIcon);
export const Phone = createIcon(PhoneIcon);
export const PlayCircle = createIcon(PlayCircleIcon);
export const Plus = createIcon(PlusIcon);
export const QrCode = createIcon(QrCodeIcon);
export const Receipt = createIcon(ReceiptPercentIcon);
export const RefreshCw = createIcon(ArrowPathIcon);
export const Rocket = createIcon(RocketLaunchIcon);
export const Save = createIcon(BookmarkSquareIcon);
export const Search = createIcon(MagnifyingGlassIcon);
export const Send = createIcon(PaperAirplaneIcon);
export const Settings = createIcon(Cog6ToothIcon);
export const Shield = createIcon(ShieldExclamationIcon);
export const ShieldCheck = createIcon(ShieldCheckIcon);
export const Square = createIcon(StopIcon);
export const Star = createIcon(StarIcon);
export const Target = createSvgIcon(({ className, size, style, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={cn("h-4 w-4", className)}
    style={size != null ? { ...style, width: size, height: size } : style}
    aria-hidden
    {...props}
  >
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
));
export const Trash2 = createIcon(TrashIcon);
export const TrendingUp = createIcon(ArrowTrendingUpIcon);
export const Upload = createIcon(ArrowUpTrayIcon);
export const User = createIcon(UserIcon);
export const UserCheck = createIcon(UserPlusIcon);
export const UserPlus = createIcon(UserPlusIcon);
export const UserX = createIcon(UserMinusIcon);
export const Users = createIcon(UsersIcon);
export const Video = createIcon(VideoCameraIcon);
export const X = createIcon(XMarkIcon);
export const XCircle = createIcon(XCircleIcon);
export const Zap = createIcon(BoltIcon);
export const Banknotes = createIcon(BanknotesIcon);
export const Square2Stack = createIcon(Square2StackIcon);
export const StarOutline = createIcon(StarIcon);

/** @deprecated Use `Image` — kept for `import { Image as ImageIcon }` aliases. */
export { Image as ImageIcon };

function socialIcon(path: string): LucideIcon {
  return createSvgIcon(({ className, size, style, ...props }) => (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      style={size != null ? { ...style, width: size, height: size } : style}
      aria-hidden
      {...props}
    >
      <path d={path} />
    </svg>
  ));
}

export const Facebook = socialIcon(
  "M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 4.99 3.65 9.13 8.43 9.88v-6.99H7.9v-2.89h2.53V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.89h-2.34V22c4.78-.75 8.43-4.89 8.43-9.93Z",
);
export const Twitter = socialIcon(
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l12.966 15.644Z",
);
export const Instagram = socialIcon(
  "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm11 1.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
);
export const Linkedin = socialIcon(
  "M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5ZM3 8.98h4v12H3v-12Zm7 0h3.84v1.64h.05c.53-1 1.84-2.06 3.8-2.06 4.06 0 4.81 2.67 4.81 6.15v6.27h-4v-5.56c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.66H10V8.98Z",
);
export const Youtube = socialIcon(
  "M21.6 7.2a2.75 2.75 0 0 0-1.93-1.94C18.28 5 12 5 12 5s-6.28 0-7.67.26A2.75 2.75 0 0 0 2.4 7.2 28.9 28.9 0 0 0 2 12a28.9 28.9 0 0 0 .4 4.8 2.75 2.75 0 0 0 1.93 1.94C5.72 19 12 19 12 19s6.28 0 7.67-.26a2.75 2.75 0 0 0 1.93-1.94A28.9 28.9 0 0 0 22 12a28.9 28.9 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z",
);
