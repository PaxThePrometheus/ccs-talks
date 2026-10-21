"use client";
import { useEffect } from "react";
/** Keep click-driven edits and explicit discards in the shared navigation guard. */
export function useAdminDraft(dirty) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("ccs:admin-draft", { detail: { dirty: !!dirty } }),
    );
  }, [dirty]);
}
