"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/ui";
import { NOC } from "@/lib/noc-theme";

export function ConsentDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md space-y-4 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recording-consent-title"
        style={{ background: NOC.paper, border: `1px solid ${NOC.rule}` }}
      >
        <div className="space-y-1">
          <h2 id="recording-consent-title" className="text-lg font-semibold" style={{ color: NOC.ink }}>
            Recording Consent
          </h2>
          <p className="text-sm leading-6" style={{ color: NOC.muted }}>
            The meeting bot will listen to and transcribe this meeting. Confirm that all participants have been informed and consent to recording.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm" style={{ color: NOC.ink }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-1"
          />
          <span>I confirm consent to record and transcribe this meeting.</span>
        </label>

        <div className="flex justify-end gap-2">
          <Btn
            type="button"
            variant="ghost"
            onClick={() => {
              setChecked(false);
              onCancel();
            }}
          >
            Cancel
          </Btn>
          <Btn
            type="button"
            variant="terra"
            disabled={!checked}
            onClick={() => {
              setChecked(false);
              onConfirm();
            }}
          >
            Confirm Consent
          </Btn>
        </div>
      </div>
    </div>
  );
}
