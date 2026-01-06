import { useState, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  className?: string;
}

interface ColorSwatchProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

const ColorSwatch = ({ color, isSelected, onClick, className = '' }: ColorSwatchProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
      isSelected ? 'border-gray-800 dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'
    } ${className}`}
    style={{ backgroundColor: color }}
    title={color}
  />
);

const ColorPicker = ({ value, onChange, label, className = '' }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Predefined color palette
  const colorPalette = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#eab308',
    '#a855f7', '#f43f5e', '#22c55e', '#fb923c', '#3b82f6', '#ef4444',
    '#64748b', '#374151', '#1f2937', '#111827', '#000000', '#ffffff',
  ];

  const handleColorSelect = useCallback((color: string) => {
    onChange(color);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono"
          placeholder="#000000"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 w-64">
          <div className="grid grid-cols-6 gap-2 mb-4">
            {colorPalette.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                isSelected={value === color}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;