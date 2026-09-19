// Best-effort real domain guesser for a company name — shared by the trust
// engine and the logo service so both agree on "which domain is this
// company". Adzuna never gives us a domain directly, so this is a heuristic,
// not a lookup, and callers treat a miss as "no confirmed domain" rather
// than guessing wildly.
const KNOWN_COMPANY_DOMAINS = {
  google: 'google.com',
  microsoft: 'microsoft.com',
  adobe: 'adobe.com',
  amazon: 'amazon.com',
  apple: 'apple.com',
  meta: 'meta.com',
  facebook: 'meta.com',
  netflix: 'netflix.com',
  ibm: 'ibm.com',
  salesforce: 'salesforce.com',
  oracle: 'oracle.com',
  sap: 'sap.com',
  intel: 'intel.com',
  uber: 'uber.com',
  airbnb: 'airbnb.com',
  spotify: 'spotify.com',
  atlassian: 'atlassian.com',
  adzuna: 'adzuna.com',
  flipkart: 'flipkart.com',
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  razorpay: 'razorpay.com',
  paytm: 'paytm.com',
  infosys: 'infosys.com',
  wipro: 'wipro.com',
  tcs: 'tcs.com',
  accenture: 'accenture.com',
  cognizant: 'cognizant.com',
  freshworks: 'freshworks.com',
  zoho: 'zoho.com',
}

export function normalizeCompanySlug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Known mapping first; otherwise a plausible `<slug>.com` guess so the logo
// service still has something reasonable to try before falling back to
// initials — never presented as a "confirmed official domain" elsewhere.
export function guessCompanyDomain(company) {
  const slug = normalizeCompanySlug(company)
  if (!slug) return null
  return KNOWN_COMPANY_DOMAINS[slug] ?? `${slug}.com`
}

export { KNOWN_COMPANY_DOMAINS }
