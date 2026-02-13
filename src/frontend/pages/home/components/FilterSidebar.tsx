import { useFilterStore } from '../../../store/filterStore';

export function FilterSidebar() {
  const { edition, setEdition, version, setVersion, resetFilters } = useFilterStore();

  return (
    <div className="space-y-6">
      {/* エディション */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">エディション</h3>
        <div className="space-y-2">
          {[
            { value: 'java', label: 'Java版' },
            { value: 'bedrock', label: '統合版' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edition.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEdition([...edition, opt.value]);
                  } else {
                    setEdition(edition.filter((v) => v !== opt.value));
                  }
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* バージョン */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">バージョン</h3>
        <select
          value={version[0] || ''}
          onChange={(e) => setVersion(e.target.value ? [e.target.value] : [])}
          className="input text-sm"
        >
          <option value="">すべて</option>
          <option value="1.21">1.21</option>
          <option value="1.20.4">1.20.4</option>
          <option value="1.20">1.20</option>
          <option value="1.19">1.19</option>
          <option value="1.18">1.18</option>
        </select>
      </div>

      {/* サイズ */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">サイズ</h3>
        <div className="space-y-2">
          {[
            { value: 'small', label: '小 (〜50³)' },
            { value: 'medium', label: '中 (〜100³)' },
            { value: 'large', label: '大 (〜200³)' },
            { value: 'xlarge', label: '特大 (200³超)' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* リセット */}
      <button
        onClick={resetFilters}
        className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
      >
        フィルタをリセット
      </button>
    </div>
  );
}
