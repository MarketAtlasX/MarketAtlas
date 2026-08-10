import { useState, useMemo } from 'react'
import { countries, flagFromCode, type Country } from '../data/countries'
import { Search } from 'lucide-react'

interface Props {
  selectedCountry: Country | null
  onSelect: (country: Country | null) => void
}

const regions = ['Americas', 'Europe', 'Asia Pacific', 'Middle East & Africa']

export default function CountryNav({ selectedCountry, onSelect }: Props) {
  const [activeRegion, setActiveRegion] = useState<string>('Americas')
  const [search, setSearch] = useState('')

  const regionCountries = useMemo(() => {
    if (!search.trim()) return countries.filter(c => c.region === activeRegion)
    const q = search.toLowerCase()
    return countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [activeRegion, search])

  return (
    <div className="border-b dark:border-white/10 border-gray-200 dark:bg-gray-950 bg-white">
      <div className="flex items-center gap-1 px-4 pt-2 pb-1 overflow-x-auto scrollbar-none">
        {regions.map(region => (
          <button
            key={region}
            onClick={() => { setActiveRegion(region); setSearch('') }}
            className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-t-lg font-medium transition-colors ${
              activeRegion === region
                ? 'dark:text-accent text-accent dark:border-b-2 border-b-2 border-accent dark:bg-white/5 bg-gray-100'
                : 'dark:text-gray-500 text-gray-500 hover:dark:text-gray-300 hover:text-gray-700'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="relative flex-shrink-0">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-24 text-[10px] pl-6 pr-2 py-1.5 rounded-lg border dark:border-white/10 border-gray-200 dark:bg-gray-900 bg-gray-50 dark:text-gray-300 text-gray-700 outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => { onSelect(null); setSearch('') }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            !selectedCountry
              ? 'dark:bg-accent/20 bg-accent/10 dark:text-accent text-accent'
              : 'dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-400 text-gray-600'
          }`}
        >
          🌍 All Markets
        </button>
        {regionCountries.map(country => (
          <button
            key={country.code}
            onClick={() => onSelect(country)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCountry?.code === country.code
                ? 'dark:bg-accent/20 bg-accent/10 dark:text-accent text-accent dark:border-accent/30 border-accent/20 border'
                : 'dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-400 text-gray-600'
            }`}
          >
            <span>{flagFromCode(country.code)}</span>
            <span>{country.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
