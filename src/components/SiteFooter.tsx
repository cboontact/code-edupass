import { Icon } from "./ui";

function NextJsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm4.68 14.9-6.73-8.68v6.94H8.6V7.1h1.58l6.72 8.68V8.84h1.34v8.06Z" />
    </svg>
  );
}

function TypeScriptIcon() {
  return (
    <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-sm bg-[#3178c6] text-[7px] font-bold text-white">TS</span>
  );
}

function TechBadge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      className="group relative inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow focus-visible:-translate-y-0.5 focus-visible:border-blue-300 focus-visible:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
      tabIndex={0}
      aria-label={label}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto px-4 pb-6 pt-2 text-sm print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <p className="inline-flex items-center gap-2 font-semibold text-slate-700">
          <Icon name="code" className="text-sky-500" /> © Chonnatee Boonta
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1" aria-label="เทคโนโลยีที่ใช้พัฒนาระบบ">
          <span className="mr-1 text-xs text-slate-500">Powered by</span>
          <TechBadge label="Next.js"><NextJsIcon /></TechBadge>
          <TechBadge label="TypeScript"><TypeScriptIcon /></TechBadge>
          <TechBadge label="Cloudflare Workers"><Icon name="cloud" className="text-orange-500" /></TechBadge>
          <TechBadge label="D1 / R2"><Icon name="database" className="text-indigo-600" /></TechBadge>
          <TechBadge label="Google Drive"><Icon name="hard-drive" className="text-emerald-600" /></TechBadge>
        </div>
      </div>
    </footer>
  );
}
