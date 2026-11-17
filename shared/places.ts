const COUNTRIES: Record<string, { zh: string; code: string }> = {
  'United States': { zh: '美国', code: 'US' },
  Germany: { zh: '德国', code: 'DE' },
  France: { zh: '法国', code: 'FR' },
  Belgium: { zh: '比利时', code: 'BE' },
  'United Kingdom': { zh: '英国', code: 'GB' },
  Netherlands: { zh: '荷兰', code: 'NL' },
  Denmark: { zh: '丹麦', code: 'DK' },
  Poland: { zh: '波兰', code: 'PL' },
  Italy: { zh: '意大利', code: 'IT' },
  Sweden: { zh: '瑞典', code: 'SE' },
  Slovenia: { zh: '斯洛文尼亚', code: 'SI' },
  Hungary: { zh: '匈牙利', code: 'HU' },
  Lithuania: { zh: '立陶宛', code: 'LT' },
  Austria: { zh: '奥地利', code: 'AT' },
  Ireland: { zh: '爱尔兰', code: 'IE' },
  'Hong Kong': { zh: '香港', code: 'HK' },
}

const CITIES: Record<string, string> = {
  Copenhagen: '哥本哈根',
  London: '伦敦',
  Ljubljana: '卢布尔雅那',
  Brussels: '布鲁塞尔',
  Paris: '巴黎',
  Budapest: '布达佩斯',
  Vilnius: '维尔纽斯',
  Vienna: '维也纳',
  Dublin: '都柏林',
  Berlin: '柏林',
}

export function countryZh(nameEn: string): { zh: string; code: string | null } {
  const known = COUNTRIES[nameEn]
  if (!known) return { zh: nameEn, code: null }
  return { zh: known.zh, code: known.code }
}

export function cityZh(nameEn: string): string {
  return CITIES[nameEn] ?? nameEn
}
