import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { startPhoneVerification, checkPhoneVerification } from "@/lib/verify.functions";
import { normalizePhone } from "@/lib/profile";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialPhone?: string;
  onVerified: () => void;
};

export function VerifyPhoneModal({ open, onOpenChange, initialPhone = "", onVerified }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [normalized, setNormalized] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const startFn = useServerFn(startPhoneVerification);
  const checkFn = useServerFn(checkPhoneVerification);

  const sendCode = async () => {
    const e164 = normalizePhone(phone);
    if (!e164) { toast.error("Enter a phone number first"); return; }
    setSending(true);
    try {
      await startFn({ data: { phone: e164 } });
      setNormalized(e164);
      setStep("code");
      toast.success(`Code sent to ${e164}`);
    } catch (err) {
      toast.error((err as Error).message || "Couldn't send code");
    } finally {
      setSending(false);
    }
  };

  const submitCode = async () => {
    if (!normalized || code.length < 4) { toast.error("Enter the code from your text"); return; }
    setChecking(true);
    try {
      await checkFn({ data: { phone: normalized, code } });
      toast.success("Phone verified");
      onVerified();
      onOpenChange(false);
      setStep("phone"); setCode(""); setNormalized(null);
    } catch (err) {
      toast.error((err as Error).message || "Verification failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your phone</DialogTitle>
          <DialogDescription>
            We text a 6-digit code to confirm your number before you can place orders or apply as a rider.
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground">Mobile number</label>
            <Input
              type="tel"
              inputMode="tel"
              autoFocus
              placeholder="+1 403 555 0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
            />
            <button
              onClick={() => void sendCode()}
              disabled={sending}
              className="w-full rounded-xl bg-primary text-[var(--forest)] font-bold py-2.5 shadow-[var(--shadow-mint)] disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send code"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Standard SMS rates from your carrier may apply.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code we sent to <span className="font-semibold text-foreground">{normalized}</span>.
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              onClick={() => void submitCode()}
              disabled={checking || code.length < 6}
              className="w-full rounded-xl bg-primary text-[var(--forest)] font-bold py-2.5 shadow-[var(--shadow-mint)] disabled:opacity-60"
            >
              {checking ? "Verifying…" : "Verify"}
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different number
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
