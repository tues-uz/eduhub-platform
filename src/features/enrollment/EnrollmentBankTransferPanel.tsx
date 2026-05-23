import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Square2Stack } from "@/lib/icons";
import {
  ENROLLMENT_BANK_TRANSFER_DETAILS,
  ENROLLMENT_DOCUMENT_ORG,
} from "@/features/enrollment/enrollmentDocumentConfig";
import { cn } from "@/lib/utils";

function formatAccountForDisplay(accountNumber: string): string {
  const digits = accountNumber.replace(/\s/g, "");
  if (digits.length <= 4) return digits;
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}

type Props = {
  className?: string;
};

export function EnrollmentBankTransferPanel({ className }: Props) {
  const { beneficiaryName, accountNumber } = ENROLLMENT_BANK_TRANSFER_DETAILS;
  const [copied, setCopied] = useState(false);

  const copyAccountNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Could not copy — select the number and copy manually");
    }
  }, [accountNumber]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl bg-[#3954d0] p-4 shadow-md shadow-[#3954d0]/25">
        <p className="text-xs font-medium text-white/70">Recipient</p>
        <p className="mt-1 text-sm font-semibold text-white">{beneficiaryName}</p>

        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white px-3.5 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500">Account number</p>
            <p
              className="mt-1 font-mono text-xl font-bold tabular-nums tracking-wide text-zinc-950 sm:text-2xl"
              aria-label={`Account number ${accountNumber}`}
            >
              {formatAccountForDisplay(accountNumber)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-[5.75rem] shrink-0 rounded-xl border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            onClick={() => void copyAccountNumber()}
            aria-label={copied ? "Account number copied" : "Copy account number"}
          >
            {copied ? (
              <>
                <Check
                  key="copied-check"
                  className="h-4 w-4 animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none"
                  aria-hidden
                />
                <span className="animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
                  Copied
                </span>
              </>
            ) : (
              <>
                <Square2Stack className="h-4 w-4" aria-hidden />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Send the amount from the bar below. Add your full name in the transfer note when your bank asks for one.
        {ENROLLMENT_DOCUMENT_ORG.telegram ? (
          <>
            {" "}
            Questions? Telegram{" "}
            <span className="font-medium text-zinc-700">{ENROLLMENT_DOCUMENT_ORG.telegram}</span>.
          </>
        ) : null}
      </p>
    </div>
  );
}
