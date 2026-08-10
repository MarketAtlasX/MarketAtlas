export interface Country {
  code: string
  name: string
  region: string
  stockExchange: string | null
  currency: string
  currencySymbol: string
  marketCap?: string
  tradingHours?: string
  tickers: string[]
  entityIds?: number[]
  lat: number
  lng: number
  commodities: string[]
  ports: string[]
}

export function flagFromCode(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

export const countries: Country[] = [
  // Americas
  { code: 'US', name: 'United States', region: 'Americas', stockExchange: 'NYSE / NASDAQ', currency: 'USD', currencySymbol: '$', marketCap: '$50.8T', tradingHours: '09:30-16:00 ET', tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'JPM', 'V', 'NVDA', 'META'],
    lat: 37.09, lng: -95.71, commodities: ['Oil', 'Natural Gas', 'Corn', 'Soybeans', 'Wheat', 'Copper', 'Gold', 'LNG', 'Semiconductors', 'Automobiles', 'Aerospace'], ports: ['Port of Los Angeles', 'Port of New York & New Jersey', 'Port of Houston', 'Port of Long Beach', 'Port of Savannah'] },
  { code: 'CA', name: 'Canada', region: 'Americas', stockExchange: 'TSX', currency: 'CAD', currencySymbol: 'C$', marketCap: '$3.2T', tradingHours: '09:30-16:00 ET', tickers: ['SHOP', 'RY', 'TD', 'ENB', 'CNQ', 'BMO', 'BNS', 'SU', 'TRP', 'CM'],
    lat: 56.13, lng: -106.35, commodities: ['Oil', 'Natural Gas', 'Gold', 'Potash', 'Uranium', 'Timber', 'Wheat', 'Nickel'], ports: ['Port of Vancouver', 'Port of Montreal', 'Port of Prince Rupert'] },
  { code: 'BR', name: 'Brazil', region: 'Americas', stockExchange: 'B3', currency: 'BRL', currencySymbol: 'R$', marketCap: '$1.1T', tradingHours: '10:00-17:00 BRT', tickers: ['PETR4', 'VALE3', 'ITUB4', 'ABEV3', 'WEGE3', 'SUZB3', 'BBAS3'],
    lat: -14.24, lng: -51.93, commodities: ['Iron Ore', 'Coffee', 'Soybeans', 'Sugar', 'Beef', 'Oil', 'Gold', 'Orange Juice'], ports: ['Port of Santos', 'Port of Rio de Janeiro', 'Port of Paranaguá'] },
  { code: 'MX', name: 'Mexico', region: 'Americas', stockExchange: 'BMV', currency: 'MXN', currencySymbol: 'Mex$', marketCap: '$450B', tradingHours: '08:30-15:00 CST', tickers: ['AMXL', 'FEMSA', 'WALMEX', 'GFNORTE', 'GMEXICO', 'CEMEX'],
    lat: 23.63, lng: -102.55, commodities: ['Oil', 'Silver', 'Gold', 'Avocados', 'Automobiles', 'Copper', 'Electronics'], ports: ['Port of Manzanillo', 'Port of Veracruz', 'Port of Altamira'] },
  { code: 'AR', name: 'Argentina', region: 'Americas', stockExchange: 'BCBA', currency: 'ARS', currencySymbol: 'AR$', marketCap: '$85B', tradingHours: '11:00-17:00 ART', tickers: ['GGAL', 'YPF', 'PAMP', 'CEPU', 'TECO2'],
    lat: -38.42, lng: -63.62, commodities: ['Soybeans', 'Corn', 'Wheat', 'Beef', 'Wine', 'Lithium', 'Natural Gas'], ports: ['Port of Buenos Aires', 'Port of Rosario'] },
  { code: 'CL', name: 'Chile', region: 'Americas', stockExchange: 'BCS', currency: 'CLP', currencySymbol: 'CLP$', marketCap: '$210B', tickers: ['COPEC', 'BSANTANDER', 'CMPC', 'ENELAM', 'FALABELLA'],
    lat: -35.68, lng: -71.54, commodities: ['Copper', 'Lithium', 'Gold', 'Silver', 'Wine', 'Salmon', 'Fruit'], ports: ['Port of Valparaiso', 'Port of San Antonio'] },
  { code: 'CO', name: 'Colombia', region: 'Americas', stockExchange: 'BVC', currency: 'COP', currencySymbol: 'COL$', marketCap: '$140B', tickers: ['ECOPETROL', 'GRUPOSURA', 'BCOLOMBIA', 'NUTRESA', 'ISA'],
    lat: 4.57, lng: -74.30, commodities: ['Oil', 'Coffee', 'Gold', 'Coal', 'Bananas', 'Flowers'], ports: ['Port of Cartagena', 'Port of Buenaventura'] },

  // Europe
  { code: 'GB', name: 'United Kingdom', region: 'Europe', stockExchange: 'LSE', currency: 'GBP', currencySymbol: '£', marketCap: '$3.4T', tradingHours: '08:00-16:30 GMT', tickers: ['HSBA', 'ULVR', 'SHEL', 'BP', 'GSK', 'DGE', 'RIO', 'GLEN', 'LLOY'],
    lat: 55.38, lng: -3.44, commodities: ['Oil', 'Natural Gas', 'Gold', 'Pharmaceuticals', 'Financial Services', 'Aerospace'], ports: ['Port of Felixstowe', 'Port of Southampton', 'Port of London'] },
  { code: 'DE', name: 'Germany', region: 'Europe', stockExchange: 'FWB (Frankfurt)', currency: 'EUR', currencySymbol: '€', marketCap: '$2.2T', tradingHours: '08:00-20:00 CET', tickers: ['SAP', 'ALV', 'DBK', 'VOW3', 'BAYN', 'BMW', 'ADS', 'MRK', 'LIN'],
    lat: 51.17, lng: 10.45, commodities: ['Automobiles', 'Chemicals', 'Steel', 'Machinery', 'Pharmaceuticals', 'Electronics'], ports: ['Port of Hamburg', 'Port of Bremen', 'Port of Wilhelmshaven'] },
  { code: 'FR', name: 'France', region: 'Europe', stockExchange: 'Euronext Paris', currency: 'EUR', currencySymbol: '€', marketCap: '$2.8T', tradingHours: '09:00-17:30 CET', tickers: ['MC', 'OR', 'TTE', 'SAN', 'AIR', 'BNP', 'SU', 'KER'],
    lat: 46.60, lng: 1.89, commodities: ['Wine', 'Aerospace', 'Luxury Goods', 'Pharmaceuticals', 'Wheat', 'Dairy', 'Nuclear Energy'], ports: ['Port of Marseille', 'Port of Le Havre', 'Port of Dunkerque'] },
  { code: 'CH', name: 'Switzerland', region: 'Europe', stockExchange: 'SIX Swiss', currency: 'CHF', currencySymbol: 'CHF', marketCap: '$1.7T', tradingHours: '09:00-17:30 CET', tickers: ['NOVN', 'ROG', 'NESN', 'UBSG', 'ABBN', 'CFR', 'ZURN'],
    lat: 46.82, lng: 8.23, commodities: ['Gold', 'Pharmaceuticals', 'Financial Services', 'Machinery', 'Chocolate', 'Watches'], ports: ['Port of Basel (Rhine)'] },
  { code: 'NL', name: 'Netherlands', region: 'Europe', stockExchange: 'Euronext Amsterdam', currency: 'EUR', currencySymbol: '€', marketCap: '$900B', tickers: ['ASML', 'UNA', 'INGA', 'AD', 'KPN', 'AKZA', 'HEIA'],
    lat: 52.13, lng: 5.29, commodities: ['Natural Gas', 'Chemicals', 'Electronics', 'Flowers', 'Dairy', 'Semiconductors'], ports: ['Port of Rotterdam', 'Port of Amsterdam'] },
  { code: 'SE', name: 'Sweden', region: 'Europe', stockExchange: 'OMX Nordic Stockholm', currency: 'SEK', currencySymbol: 'kr', marketCap: '$820B', tickers: ['ERIC', 'SEB', 'VOLV', 'ABB', 'ATCO', 'SAND', 'SHB'],
    lat: 60.13, lng: 18.64, commodities: ['Iron Ore', 'Timber', 'Steel', 'Machinery', 'Automobiles', 'Telecom'], ports: ['Port of Gothenburg', 'Port of Stockholm'] },
  { code: 'DK', name: 'Denmark', region: 'Europe', stockExchange: 'OMX Nordic Copenhagen', currency: 'DKK', currencySymbol: 'kr', tickers: ['NOVO', 'DSV', 'NZYM', 'MAERSK', 'CARL', 'VWS', 'GN'],
    lat: 56.26, lng: 9.50, commodities: ['Pharmaceuticals', 'Wind Energy', 'Dairy', 'Pork', 'Furniture'], ports: ['Port of Copenhagen', 'Port of Aarhus'] },
  { code: 'NO', name: 'Norway', region: 'Europe', stockExchange: 'Oslo Børs', currency: 'NOK', currencySymbol: 'kr', tickers: ['EQUINOR', 'DNB', 'ORK', 'NHY', 'YAR', 'MOWI', 'SUBC'],
    lat: 60.47, lng: 8.47, commodities: ['Oil', 'Natural Gas', 'Fish', 'Aluminum', 'Fertilizer', 'Timber'], ports: ['Port of Oslo', 'Port of Bergen'] },
  { code: 'IT', name: 'Italy', region: 'Europe', stockExchange: 'Borsa Italiana', currency: 'EUR', currencySymbol: '€', marketCap: '$700B', tickers: ['ENI', 'ISP', 'ENEL', 'UCG', 'LDO', 'PRY', 'RACE'],
    lat: 41.87, lng: 12.57, commodities: ['Wine', 'Olive Oil', 'Fashion', 'Automobiles', 'Machinery', 'Steel', 'Fruit'], ports: ['Port of Genoa', 'Port of Trieste', 'Port of Naples'] },
  { code: 'ES', name: 'Spain', region: 'Europe', stockExchange: 'BME (Madrid)', currency: 'EUR', currencySymbol: '€', marketCap: '$650B', tickers: ['SAN', 'BBVA', 'TEF', 'IBE', 'REP', 'FER', 'AENA'],
    lat: 40.46, lng: -3.75, commodities: ['Olive Oil', 'Wine', 'Fruit', 'Automobiles', 'Renewable Energy', 'Tourism'], ports: ['Port of Algeciras', 'Port of Barcelona', 'Port of Valencia'] },
  { code: 'IE', name: 'Ireland', region: 'Europe', stockExchange: 'Euronext Dublin', currency: 'EUR', currencySymbol: '€', tickers: ['CRH', 'KER', 'RYAI', 'DCC'],
    lat: 53.41, lng: -8.24, commodities: ['Pharmaceuticals', 'Dairy', 'Beef', 'Tech Services', 'Whiskey'], ports: ['Port of Dublin', 'Port of Cork'] },
  { code: 'BE', name: 'Belgium', region: 'Europe', stockExchange: 'Euronext Brussels', currency: 'EUR', currencySymbol: '€', tickers: ['ABI', 'UCB', 'KBC', 'SOLB'],
    lat: 50.85, lng: 4.35, commodities: ['Chemicals', 'Pharmaceuticals', 'Diamonds', 'Chocolate', 'Steel'], ports: ['Port of Antwerp', 'Port of Zeebrugge'] },
  { code: 'PT', name: 'Portugal', region: 'Europe', stockExchange: 'Euronext Lisbon', currency: 'EUR', currencySymbol: '€', tickers: ['EDP', 'BCP', 'GALP', 'RENE'],
    lat: 39.40, lng: -8.22, commodities: ['Wine', 'Cork', 'Olive Oil', 'Fish', 'Renewable Energy'], ports: ['Port of Lisbon', 'Port of Sines'] },
  { code: 'AT', name: 'Austria', region: 'Europe', stockExchange: 'Wiener Börse', currency: 'EUR', currencySymbol: '€', tickers: ['EBS', 'OMV', 'RBI', 'VOE'],
    lat: 47.52, lng: 14.55, commodities: ['Steel', 'Machinery', 'Timber', 'Chemicals', 'Tourism'], ports: ['Port of Vienna (Danube)'] },
  { code: 'FI', name: 'Finland', region: 'Europe', stockExchange: 'OMX Nordic Helsinki', currency: 'EUR', currencySymbol: '€', tickers: ['NOKIA', 'NESTE', 'KNEBV', 'SAMPO'],
    lat: 61.92, lng: 25.75, commodities: ['Timber', 'Paper', 'Tech', 'Steel', 'Chemicals'], ports: ['Port of Helsinki', 'Port of HaminaKotka'] },
  { code: 'GR', name: 'Greece', region: 'Europe', stockExchange: 'ATHEX', currency: 'EUR', currencySymbol: '€', marketCap: '$65B', tickers: ['ALPHA', 'EUROB', 'PPC', 'OPAP'],
    lat: 39.07, lng: 21.82, commodities: ['Olive Oil', 'Shipping', 'Fruit', 'Wine', 'Tobacco'], ports: ['Port of Piraeus', 'Port of Thessaloniki'] },
  { code: 'PL', name: 'Poland', region: 'Europe', stockExchange: 'GPW (Warsaw)', currency: 'PLN', currencySymbol: 'zł', marketCap: '$160B', tickers: ['PKN', 'PKOBP', 'PZU', 'CDR'],
    lat: 51.92, lng: 19.15, commodities: ['Coal', 'Steel', 'Chemicals', 'Food Processing', 'Automotive Parts'], ports: ['Port of Gdansk', 'Port of Gdynia'] },
  { code: 'RU', name: 'Russia', region: 'Europe', stockExchange: 'MOEX', currency: 'RUB', currencySymbol: '₽', tickers: ['SBER', 'GAZP', 'LKOH', 'ROSN'],
    lat: 61.52, lng: 105.32, commodities: ['Oil', 'Natural Gas', 'Coal', 'Gold', 'Nickel', 'Diamonds', 'Wheat', 'Timber', 'Aluminum', 'Steel'], ports: ['Port of Novorossiysk', 'Port of Saint Petersburg', 'Port of Vladivostok'] },
  { code: 'TR', name: 'Turkey', region: 'Europe', stockExchange: 'BIST', currency: 'TRY', currencySymbol: '₺', marketCap: '$180B', tickers: ['THYAO', 'GARAN', 'KOCHOL', 'EREGL'],
    lat: 38.96, lng: 35.24, commodities: ['Textiles', 'Automotive', 'Steel', 'Fruit', 'Ceramics', 'Chemicals'], ports: ['Port of Istanbul', 'Port of Izmir', 'Port of Mersin'] },

  // Asia Pacific
  { code: 'JP', name: 'Japan', region: 'Asia Pacific', stockExchange: 'TSE (Tokyo)', currency: 'JPY', currencySymbol: '¥', marketCap: '$6.7T', tradingHours: '09:00-15:00 JST', tickers: ['TM', 'SONY', 'MUFG', 'SMFG', 'NTT', 'KDDI'],
    lat: 36.20, lng: 138.25, commodities: ['Automobiles', 'Electronics', 'Steel', 'Chemicals', 'Semiconductors', 'Robotics'], ports: ['Port of Tokyo', 'Port of Yokohama', 'Port of Osaka', 'Port of Nagoya'] },
  { code: 'CN', name: 'China', region: 'Asia Pacific', stockExchange: 'SSE / HKEX', currency: 'CNY', currencySymbol: '¥', marketCap: '$8.2T', tradingHours: '09:30-15:00 CST', tickers: ['BABA', 'TCEHY', 'JD', 'BIDU', 'NIO', 'PDD'],
    lat: 35.86, lng: 104.19, commodities: ['Rare Earth', 'Steel', 'Electronics', 'Textiles', 'Coal', 'Solar Panels', 'Lithium', 'Rare Earth Minerals', 'Aluminum'], ports: ['Port of Shanghai', 'Port of Shenzhen', 'Port of Ningbo-Zhoushan', 'Port of Guangzhou', 'Port of Qingdao'] },
  { code: 'HK', name: 'Hong Kong', region: 'Asia Pacific', stockExchange: 'HKEX', currency: 'HKD', currencySymbol: 'HK$', marketCap: '$4.1T', tickers: ['TCEHY', 'BABA', 'HSB', '1299'],
    lat: 22.32, lng: 114.17, commodities: ['Financial Services', 'Logistics', 'Electronics', 'Jewelry'], ports: ['Port of Hong Kong'] },
  { code: 'KR', name: 'South Korea', region: 'Asia Pacific', stockExchange: 'KRX', currency: 'KRW', currencySymbol: '₩', marketCap: '$1.8T', tradingHours: '09:00-15:30 KST', tickers: ['SAMSUNG', 'HYMC', 'SKHY', 'POSCO', 'KB', 'KAKAO', 'NAVER'],
    lat: 35.91, lng: 127.77, commodities: ['Semiconductors', 'Automobiles', 'Steel', 'Shipbuilding', 'Electronics', 'Petrochemicals'], ports: ['Port of Busan', 'Port of Incheon', 'Port of Ulsan'] },
  { code: 'IN', name: 'India', region: 'Asia Pacific', stockExchange: 'BSE / NSE', currency: 'INR', currencySymbol: '₹', marketCap: '$3.5T', tradingHours: '09:15-15:30 IST', tickers: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL'],
    lat: 20.59, lng: 78.96, commodities: ['Rice', 'Wheat', 'Cotton', 'Tea', 'Steel', 'Pharmaceuticals', 'IT Services', 'Diamonds'], ports: ['Port of Mumbai', 'Port of Chennai', 'Port of Mundra', 'Port of Kolkata'] },
  { code: 'AU', name: 'Australia', region: 'Asia Pacific', stockExchange: 'ASX', currency: 'AUD', currencySymbol: 'A$', marketCap: '$1.8T', tradingHours: '10:00-16:00 AEDT', tickers: ['BHP', 'CBA', 'CSL', 'NAB', 'WBC', 'ANZ', 'WOW', 'TLS', 'RIO'],
    lat: -25.27, lng: 133.77, commodities: ['Iron Ore', 'Coal', 'Gold', 'LNG', 'Wheat', 'Beef', 'Wine', 'Lithium', 'Copper', 'Nickel'], ports: ['Port of Port Hedland', 'Port of Sydney', 'Port of Melbourne', 'Port of Brisbane'] },
  { code: 'SG', name: 'Singapore', region: 'Asia Pacific', stockExchange: 'SGX', currency: 'SGD', currencySymbol: 'S$', marketCap: '$600B', tradingHours: '09:00-17:00 SGT', tickers: ['DBS', 'OCBC', 'UOB', 'SBUX', 'WIL', 'KEP'],
    lat: 1.35, lng: 103.82, commodities: ['Electronics', 'Chemicals', 'Pharmaceuticals', 'Financial Services', 'Oil Refining'], ports: ['Port of Singapore'] },
  { code: 'TW', name: 'Taiwan', region: 'Asia Pacific', stockExchange: 'TWSE', currency: 'TWD', currencySymbol: 'NT$', marketCap: '$1.2T', tickers: ['TSMC', 'FOXCONN', 'MTK', 'HTC'],
    lat: 23.70, lng: 120.96, commodities: ['Semiconductors', 'Electronics', 'Machinery', 'Steel', 'Petrochemicals'], ports: ['Port of Kaohsiung', 'Port of Taipei'] },
  { code: 'MY', name: 'Malaysia', region: 'Asia Pacific', stockExchange: 'Bursa Malaysia', currency: 'MYR', currencySymbol: 'RM', marketCap: '$350B', tickers: ['MAYBANK', 'CIMB', 'PUBLIC', 'TENAGA'],
    lat: 4.21, lng: 101.98, commodities: ['Palm Oil', 'Rubber', 'Oil', 'Natural Gas', 'Electronics', 'Timber'], ports: ['Port of Klang', 'Port of Tanjung Pelepas'] },
  { code: 'ID', name: 'Indonesia', region: 'Asia Pacific', stockExchange: 'IDX', currency: 'IDR', currencySymbol: 'Rp', marketCap: '$500B', tickers: ['BBCA', 'BBRI', 'TLKM', 'ASII'],
    lat: -0.79, lng: 113.92, commodities: ['Palm Oil', 'Coal', 'Nickel', 'Rubber', 'Coffee', 'Oil', 'Natural Gas', 'Tin'], ports: ['Port of Tanjung Priok', 'Port of Surabaya', 'Port of Belawan'] },
  { code: 'TH', name: 'Thailand', region: 'Asia Pacific', stockExchange: 'SET', currency: 'THB', currencySymbol: '฿', marketCap: '$450B', tickers: ['CPALL', 'PTT', 'AOT', 'ADVANC'],
    lat: 15.87, lng: 100.99, commodities: ['Rice', 'Rubber', 'Electronics', 'Automotive', 'Sugar', 'Seafood', 'Tourism'], ports: ['Port of Bangkok', 'Port of Laem Chabang'] },
  { code: 'PH', name: 'Philippines', region: 'Asia Pacific', stockExchange: 'PSE', currency: 'PHP', currencySymbol: '₱', tickers: ['SM', 'BDO', 'ALI', 'TEL'],
    lat: 12.88, lng: 121.77, commodities: ['Electronics', 'Coconut Oil', 'Bananas', 'Nickel', 'Copper', 'Gold', 'BPO Services'], ports: ['Port of Manila', 'Port of Cebu'] },
  { code: 'VN', name: 'Vietnam', region: 'Asia Pacific', stockExchange: 'HOSE', currency: 'VND', currencySymbol: '₫', tickers: ['VIC', 'VHM', 'TCB', 'HPG'],
    lat: 14.06, lng: 108.28, commodities: ['Rice', 'Coffee', 'Textiles', 'Electronics', 'Seafood', 'Rubber'], ports: ['Port of Ho Chi Minh City', 'Port of Hai Phong', 'Port of Da Nang'] },
  { code: 'NZ', name: 'New Zealand', region: 'Asia Pacific', stockExchange: 'NZX', currency: 'NZD', currencySymbol: 'NZ$', tickers: ['FPH', 'A2M', 'ATM', 'SPK'],
    lat: -40.90, lng: 174.89, commodities: ['Dairy', 'Meat', 'Wine', 'Wool', 'Timber', 'Fish', 'Fruit'], ports: ['Port of Auckland', 'Port of Tauranga'] },

  // Middle East & Africa
  { code: 'AE', name: 'UAE', region: 'Middle East & Africa', stockExchange: 'ADX / DFM', currency: 'AED', currencySymbol: 'د.إ', marketCap: '$720B', tickers: ['ADNOC', 'EMAAR', 'DEWA', 'FAB'],
    lat: 23.42, lng: 53.85, commodities: ['Oil', 'Natural Gas', 'Gold', 'Aluminum', 'Petrochemicals', 'Tourism', 'Logistics'], ports: ['Port of Jebel Ali', 'Port of Khalifa', 'Port of Zayed'] },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East & Africa', stockExchange: 'Tadawul', currency: 'SAR', currencySymbol: '﷼', marketCap: '$2.7T', tickers: ['ARAMCO', 'SNB', 'ALRAJHI', 'STC', 'SABIC'],
    lat: 23.89, lng: 45.08, commodities: ['Oil', 'Natural Gas', 'Petrochemicals', 'Gold', 'Fertilizer', 'Desalination'], ports: ['Port of Jeddah', 'King Abdulaziz Port (Dammam)', 'Port of Jubail'] },
  { code: 'QA', name: 'Qatar', region: 'Middle East & Africa', stockExchange: 'QSE', currency: 'QAR', currencySymbol: '﷼', tickers: ['QNB', 'QATAR', 'MASRAF'],
    lat: 25.35, lng: 51.18, commodities: ['LNG', 'Oil', 'Petrochemicals', 'Fertilizer', 'Steel'], ports: ['Port of Hamad', 'Port of Doha'] },
  { code: 'KW', name: 'Kuwait', region: 'Middle East & Africa', stockExchange: 'Boursa Kuwait', currency: 'KWD', currencySymbol: 'د.ك', tickers: ['NBK', 'ZAIN', 'KFH'],
    lat: 29.31, lng: 47.48, commodities: ['Oil', 'Natural Gas', 'Petrochemicals', 'Fertilizer'], ports: ['Port of Shuwaikh', 'Port of Shuaiba'] },
  { code: 'IL', name: 'Israel', region: 'Middle East & Africa', stockExchange: 'TASE', currency: 'ILS', currencySymbol: '₪', marketCap: '$260B', tickers: ['TEVA', 'NICE', 'WIX', 'CHKP'],
    lat: 31.05, lng: 34.85, commodities: ['Diamonds', 'Pharmaceuticals', 'Tech', 'Citrus', 'Natural Gas', 'Chemicals'], ports: ['Port of Haifa', 'Port of Ashdod'] },
  { code: 'ZA', name: 'South Africa', region: 'Middle East & Africa', stockExchange: 'JSE', currency: 'ZAR', currencySymbol: 'R', marketCap: '$900B', tradingHours: '09:00-17:00 SAST', tickers: ['NASPERS', 'ANHEUSER', 'FIRSTRAND', 'STANDARD', 'MTN'],
    lat: -30.56, lng: 22.94, commodities: ['Gold', 'Diamonds', 'Platinum', 'Coal', 'Iron Ore', 'Wine', 'Corn', 'Chromium'], ports: ['Port of Durban', 'Port of Cape Town', 'Port of Richards Bay'] },
  { code: 'NG', name: 'Nigeria', region: 'Middle East & Africa', stockExchange: 'NGX', currency: 'NGN', currencySymbol: '₦', tickers: ['DANGOTE', 'MTNN', 'ZENITH', 'ACCESS'],
    lat: 9.08, lng: 8.68, commodities: ['Oil', 'Natural Gas', 'Cocoa', 'Rubber', 'Gold', 'Cassava'], ports: ['Port of Lagos', 'Port of Port Harcourt'] },
  { code: 'KE', name: 'Kenya', region: 'Middle East & Africa', stockExchange: 'NSE', currency: 'KES', currencySymbol: 'KSh', tickers: ['SCOM', 'EABL', 'KCB'],
    lat: -0.02, lng: 37.91, commodities: ['Tea', 'Coffee', 'Horticulture', 'Tourism', 'Flowers'], ports: ['Port of Mombasa'] },
  { code: 'EG', name: 'Egypt', region: 'Middle East & Africa', stockExchange: 'EGX', currency: 'EGP', currencySymbol: 'E£', tickers: ['COMI', 'EFG', 'HRHO', 'TMGH'],
    lat: 26.82, lng: 30.80, commodities: ['Oil', 'Natural Gas', 'Cotton', 'Gold', 'Phosphates', 'Tourism'], ports: ['Port of Alexandria', 'Port of Damietta', 'Suez Canal'] },
  { code: 'MA', name: 'Morocco', region: 'Middle East & Africa', stockExchange: 'Casablanca SE', currency: 'MAD', currencySymbol: 'MAD', tickers: ['ATW', 'IAM', 'BCP', 'LQ'],
    lat: 31.79, lng: -7.09, commodities: ['Phosphates', 'Fish', 'Olive Oil', 'Fruit', 'Automotive', 'Renewable Energy'], ports: ['Port of Casablanca', 'Port of Tangier'] },
  { code: 'MU', name: 'Mauritius', region: 'Middle East & Africa', stockExchange: 'SEM', currency: 'MUR', currencySymbol: 'Rs', tickers: ['MCB', 'SBM', 'NMH'],
    lat: -20.35, lng: 57.55, commodities: ['Sugar', 'Textiles', 'Tourism', 'Financial Services'], ports: ['Port of Port Louis'] },
  { code: 'PK', name: 'Pakistan', region: 'Asia Pacific', stockExchange: 'PSX', currency: 'PKR', currencySymbol: 'Rs', marketCap: '$35B', tickers: ['OGDC', 'MCB', 'POL', 'ENGRO'],
    lat: 30.38, lng: 69.35, commodities: ['Textiles', 'Rice', 'Wheat', 'Cotton', 'Sugar', 'Fruit', 'Leather'], ports: ['Port of Karachi', 'Port of Qasim', 'Gwadar Port'] },
  { code: 'IR', name: 'Iran', region: 'Middle East & Africa', stockExchange: 'TSE', currency: 'IRR', currencySymbol: '﷼', tickers: ['TSM', 'FARS', 'MOBILE'],
    lat: 32.43, lng: 53.69, commodities: ['Oil', 'Natural Gas', 'Petrochemicals', 'Steel', 'Copper', 'Pistachios', 'Carpets'], ports: ['Port of Bandar Abbas', 'Port of Imam Khomeini'] },
]
