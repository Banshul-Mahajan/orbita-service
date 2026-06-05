// Onboarding information-architecture types.
// Mirrors the Orbita "User Onboarding Information Architecture" sections.
// Every section is optional/partial so the wizard can save incrementally.

export interface CompanySection {
  company_name?: string
  website_url?: string
  industry?: string
  sub_category?: string
  company_size?: string
  business_type?: string[]        // B2B, B2C, D2C, Marketplace, SaaS, ...
  business_goals?: string[]       // Increase SEO Visibility, Generate Leads, ...
  country?: string
  logo_url?: string
  brand_guidelines_url?: string
  existing_seo_report_url?: string
  existing_keyword_list?: string
}

export interface AudienceSection {
  primary_audience_type?: string
  personas?: string
  age_group?: string
  gender?: string
  industry_served?: string
  income_group?: string
  primary_markets?: string
  secondary_markets?: string
  preferred_languages?: string
  intent_stages?: string[]        // Awareness, Research, Purchase, Retention
  summary?: string                // short free-text mirrored to project.target_audience
}

export interface ProductItem {
  name?: string
  category?: string
  short_description?: string
  detailed_description?: string
  pricing_range?: string
  website_page_url?: string
  landing_page_url?: string
  ecommerce_url?: string
  target_audience?: string
  search_intent?: string[]        // Informational, Commercial, Transactional, Local, AI-search
  available_countries?: string
  target_cities?: string
  regional_focus?: string
}

export interface CompetitorItem {
  name?: string
  website?: string
  category?: string
  visibility?: string
  product_urls?: string
  blog_urls?: string
  landing_pages?: string
}

export interface GeographySection {
  countries?: string
  states?: string
  cities?: string
  districts?: string
  languages?: string
  dialects?: string
  currency?: string
  primary_market?: string
  secondary_market?: string
  expansion_markets?: string
  pin_codes?: string
  store_locations?: string
  google_business_locations?: string
  primary_language?: string
}

export interface KeywordsSection {
  seed_keywords?: string[]
  brand_keywords?: string
  product_keywords?: string
  problem_solving_keywords?: string
  competitor_keywords?: string
  local_keywords?: string
}

export interface AiGeoSection {
  platforms?: string[]            // ChatGPT, Google AI Overviews, Gemini, Claude, Perplexity, Voice
  content_intent?: string[]       // Educational, Conversational, Decision-making, ...
}

export interface DigitalPresenceSection {
  cms_platform?: string
  blog_availability?: string
  sitemap_url?: string
  robots_url?: string
  seo_tools?: string[]            // Google Search Console, GA, Ahrefs, SEMrush, HubSpot, ...
  other_tools?: string
  social_platforms?: string[]     // LinkedIn, Instagram, Facebook, YouTube, X, Reddit, Quora
  google_business_profile?: string
  maps_listings?: string
  directory_listings?: string
}

export interface TechnicalSeoSection {
  domain_authority?: string
  website_speed_report?: string
  core_web_vitals?: string
  structured_data?: string
  integrations?: string[]         // Google Analytics, Search Console, CRM, CMS, Shopify, WordPress, HubSpot
}

export interface OnboardingProfile {
  project_id: string
  company?: CompanySection | null
  audience?: AudienceSection | null
  products?: ProductItem[] | null
  competitors?: CompetitorItem[] | null
  geography?: GeographySection | null
  keywords?: KeywordsSection | null
  ai_geo?: AiGeoSection | null
  digital_presence?: DigitalPresenceSection | null
  technical_seo?: TechnicalSeoSection | null
  completed_steps?: string[]
  status: string
}

export type ProfileSave = Partial<Omit<OnboardingProfile, 'project_id' | 'status'>> & {
  completed_steps?: string[]
  status?: string
}
