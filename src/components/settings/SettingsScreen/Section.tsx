import { useId, type ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settingsSection" aria-labelledby={id}>
      <h2 id={id} className="dataKicker">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settingsRow">
      <span className="settingsRowLabel">{label}</span>
      {children}
    </div>
  );
}
