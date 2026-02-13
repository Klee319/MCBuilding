type SortOption = 'popular' | 'newest' | 'downloads';

interface SortBarProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'popular', label: '人気順' },
  { value: 'newest', label: '新着順' },
  { value: 'downloads', label: 'DL数順' },
];

export function SortBar({ currentSort, onSortChange }: SortBarProps) {
  return (
    <div className="flex gap-2 mb-6">
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onSortChange(option.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            currentSort === option.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
