import "./Search.css";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  placeholder?: string;
  isOpen: boolean;
  children: React.ReactNode;
}

export function Search({ 
  value, 
  onChange, 
  onFocus, 
  placeholder, 
  isOpen, 
  children 
}: SearchProps) {
  return (
    <div className="searchableSelect">
      <input
        type="text"
        className="searchSelectInput"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={onFocus}
      />
      {isOpen && (
        <div className="searchSelectDropdown">
          {children}
        </div>
      )}
    </div>
  );
}
