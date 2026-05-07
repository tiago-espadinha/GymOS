import './TabBar.css';

interface TabBarProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return (
    <nav aria-label="Main" className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={tab.id === active ? 'page' : undefined}
          className="tab-bar__tab"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default TabBar;
