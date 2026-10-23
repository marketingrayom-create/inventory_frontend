export const normalized = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export function companyKey(value) {
  const name = normalized(value);
  if (/^rayom\b/.test(name)) return 'rayom';
  if (/^(shelfesteem|shelfsteem)\b/.test(name)) return 'shelfesteem';
  return name;
}
export function portalName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (/^(?:b2b[_\s-]*)?cocoblu(?:\s+retail\s+limited)?(?:\s*\(\s*cb\s*\))?$/i.test(name) || /^cb$/i.test(name)) return 'COCOBLU RETAIL LIMITED (CB)';
  if (/^(?:b2b[_\s-]*)?(?:retailez(?:\s+private\s+limited)?(?:\s*\(\s*mvr\s*\))?|mvr)$/i.test(name)) return 'RETAILEZ PRIVATE LIMITED (MVR)';
  if (/^(amazon|fba\s*(\(\s*amazon\s*\))?)$/i.test(name)) return 'Amazon';
  if (/^(flipkart|fbf\s*(\(\s*flipkart\s*\))?)$/i.test(name)) return 'Flipkart';
  return name;
}
export const portalKey = value => { const name=portalName(value); return name==='COCOBLU RETAIL LIMITED (CB)'?'cocoblu (cb)':name==='RETAILEZ PRIVATE LIMITED (MVR)'?'mvr':normalized(name); };
