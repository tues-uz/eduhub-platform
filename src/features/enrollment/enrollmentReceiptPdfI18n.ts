export type ReceiptPdfLocale = "en" | "uz";

export type ReceiptPdfCopy = {
  receiptTitle: string;
  phonePrefix: string;
  telegramPrefix: string;
  invoiceNo: string;
  receiptNo: string;
  date: string;
  paymentMethod: string;
  pendingApproval: string;
  submissionNotice: string;
  demoNotice: string;
  receivedFrom: string;
  description: string;
  amount: string;
  teacher: string;
  tax: string;
  grandTotal: string;
  cancellationsTitle: string;
  cancellationLines: string[];
  helpLine: string;
  tuitionFee: string;
  classPrefix: string;
  listedTuition: string;
  classSessions: string;
  proratedBilling: string;
  included: string;
  fullSchedule: string;
  allSessions: string;
  paymentPlanDown: string;
  paymentPlanRemaining: string;
  paymentPlanFull: string;
  methodPrefix: string;
  amountOnReceipt: string;
  meetingsOf: string;
  of: string;
  transfer: string;
  cash: string;
  months: readonly string[];
};

const EN: ReceiptPdfCopy = {
  receiptTitle: "Receipt",
  phonePrefix: "Phone",
  telegramPrefix: "Telegram",
  invoiceNo: "Invoice no.",
  receiptNo: "Receipt no.",
  date: "Date",
  paymentMethod: "Payment method",
  pendingApproval: "Pending approval",
  submissionNotice:
    "Submission copy — official invoice and receipt numbers are issued after the school approves your enrollment.",
  demoNotice: "Demo document — numbers not issued by server",
  receivedFrom: "Received from",
  description: "Description",
  amount: "Amount",
  teacher: "Teacher",
  tax: "Tax",
  grandTotal: "Grand total",
  cancellationsTitle: "CANCELLATIONS & REFUNDS:",
  cancellationLines: [
    "1. Payment is not refundable.",
    "2. Related agreements shall be governed by the laws of Uzbekistan country.",
  ],
  helpLine: "FOR ANY QUESTIONS, PLEASE CONTACT OUR ADMIN STAFF.",
  tuitionFee: "TUITION FEE",
  classPrefix: "CLASS",
  listedTuition: "LISTED TUITION",
  classSessions: "CLASS SESSIONS",
  proratedBilling: "PRORATED BILLING",
  included: "INCLUDED",
  fullSchedule: "FULL SCHEDULE",
  allSessions: "ALL",
  paymentPlanDown: "PAYMENT PLAN: DOWN PAYMENT (FIRST INSTALLMENT)",
  paymentPlanRemaining: "REMAINING BALANCE & DATES PER SCHOOL POLICY AFTER VERIFICATION",
  paymentPlanFull: "PAYMENT PLAN: FULL PAYMENT",
  methodPrefix: "METHOD",
  amountOnReceipt: "AMOUNT ON THIS RECEIPT",
  meetingsOf: "MEETINGS",
  of: "OF",
  transfer: "Transfer",
  cash: "Cash",
  months: [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ],
};

/** Latin Uzbek — ASCII-friendly for Helvetica in jsPDF. */
const UZ: ReceiptPdfCopy = {
  receiptTitle: "Kvitansiya",
  phonePrefix: "Telefon",
  telegramPrefix: "Telegram",
  invoiceNo: "Hisob-faktura no.",
  receiptNo: "Kvitansiya no.",
  date: "Sana",
  paymentMethod: "To'lov usuli",
  pendingApproval: "Tasdiq kutilmoqda",
  submissionNotice:
    "Yuborish nusxasi — rasmiy hisob-faktura va kvitansiya raqamlari maktab arizangizni tasdiqlagandan keyin beriladi.",
  demoNotice: "Demo hujjat — raqamlar server tomonidan berilmagan",
  receivedFrom: "To'lovchi",
  description: "Tavsif",
  amount: "Summa",
  teacher: "O'qituvchi",
  tax: "Soliq",
  grandTotal: "Jami",
  cancellationsTitle: "BEKOR QILISH VA QAYTARISH:",
  cancellationLines: [
    "1. To'lov qaytarilmaydi.",
    "2. Tegishli kelishuvlar O'zbekiston qonunlariga muvofiq tartibga solinadi.",
  ],
  helpLine: "SAVOLLARINGIZ BO'LSA, ADMINISTRATSIYAGA MUROJAAT QILING.",
  tuitionFee: "O'QUV TO'LOVI",
  classPrefix: "SINF",
  listedTuition: "RO'YXATDAGI TO'LOV",
  classSessions: "SINF DARSLARI",
  proratedBilling: "PROPORTSIONAL HISOB",
  included: "KIRITILGAN",
  fullSchedule: "TO'LIQ JADVAL",
  allSessions: "BARCHA",
  paymentPlanDown: "TO'LOV REJASI: BOSHLANG'ICH TO'LOV (BIRINCHI BO'LIB TO'LASH)",
  paymentPlanRemaining: "QOLGAN TO'LOV VA SANALAR TEKSHIRUVDAN KEYIN MAKTAB SIYOSATIGA MUVOFIQ",
  paymentPlanFull: "TO'LOV REJASI: TO'LIQ TO'LOV",
  methodPrefix: "USUL",
  amountOnReceipt: "USHBU KVITANSIYADAGI SUMMA",
  meetingsOf: "DARS",
  of: "/",
  transfer: "O'tkazma",
  cash: "Naqd",
  months: [
    "YANVAR",
    "FEVRAL",
    "MART",
    "APREL",
    "MAY",
    "IYUN",
    "IYUL",
    "AVGUST",
    "SENTABR",
    "OKTABR",
    "NOYABR",
    "DEKABR",
  ],
};

const BY_LOCALE: Record<ReceiptPdfLocale, ReceiptPdfCopy> = { en: EN, uz: UZ };

export function getReceiptPdfCopy(locale: ReceiptPdfLocale = "en"): ReceiptPdfCopy {
  return BY_LOCALE[locale] ?? EN;
}

export function formatPaymentMethodLabelLocalized(
  code: string | undefined,
  locale: ReceiptPdfLocale = "en",
): string {
  const c = (code ?? "BANK_TRANSFER").toUpperCase();
  const copy = getReceiptPdfCopy(locale);
  if (c === "BANK_TRANSFER" || c === "TRANSFER") return copy.transfer;
  if (c === "CASH") return copy.cash;
  return c.replace(/_/g, " ");
}
