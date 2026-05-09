/** The down chevron on a control that opens a list or a sheet. */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default ChevronIcon;
