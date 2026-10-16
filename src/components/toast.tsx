"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

type Tone = "success" | "error" | "info";
interface Toast { id: number; tone: Tone; message: string }
const Ctx = createContext<(tone: Tone, message: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const push = useCallback((tone: Tone, message: string) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 5000);
  }, []);
  const value = useMemo(() => push, [push]);
  const styles: Record<Tone, string> = {
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
    error: "border-red-300 bg-red-50 text-red-900",
    info: "border-sky-300 bg-sky-50 text-sky-900",
  };
  const icons: Record<Tone, string> = { success: "circle-check", error: "triangle-exclamation", info: "circle-info" };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border p-3 shadow-lg ${styles[t.tone]}`}>
            <Icon name={icons[t.tone]} className="mt-1" />
            <p className="flex-1 text-base font-medium">{t.message}</p>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="min-h-8 min-w-8 rounded-md hover:bg-black/5" aria-label="ปิดการแจ้งเตือน">
              <Icon name="xmark" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
