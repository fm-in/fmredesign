/**
 * The portfolio.
 *
 * Lifted out of `PortfolioGridSection` so `/work` and anything else can read
 * one copy. The component keeps its own until Phase 9 deletes it.
 *
 * The seven logos are stored as "Client 1".."Client 7" — the client names were
 * never recorded. They render without a name rather than showing a placeholder
 * that looks like unfinished work.
 */

export interface PortfolioItem {
  src: string;
  client: string;
  category: string;
  url?: string;
}

export const PORTFOLIO: {
  graphicDesign: readonly PortfolioItem[];
  logos: readonly PortfolioItem[];
  websites: readonly PortfolioItem[];
} = {
  graphicDesign: [
    { src: '/work/services/harsh-service1.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service1.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service1.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service1.jpg', client: 'SKR Group', category: 'Corporate' },
    { src: '/work/services/harsh-service2.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service2.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service2.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service2.jpg', client: 'SKR Group', category: 'Corporate' },
    { src: '/work/services/harsh-service3.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service3.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service3.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service3.jpg', client: 'SKR Group', category: 'Corporate' },
  ],
  logos: [
    { src: '/work/logos/1.jpg', client: 'Client 1', category: 'Logo Design' },
    { src: '/work/logos/2.jpg', client: 'Client 2', category: 'Logo Design' },
    { src: '/work/logos/3.jpg', client: 'Client 3', category: 'Logo Design' },
    { src: '/work/logos/4.jpg', client: 'Client 4', category: 'Logo Design' },
    { src: '/work/logos/5.jpg', client: 'Client 5', category: 'Logo Design' },
    { src: '/work/logos/6.jpg', client: 'Client 6', category: 'Logo Design' },
    { src: '/work/logos/7.jpg', client: 'Client 7', category: 'Logo Design' },
  ],
  websites: [
    { src: '/work/websites/restronaut_website.png', client: 'Restronaut', url: 'https://restronaut.in', category: 'SaaS' },
    { src: '/work/websites/trailsofteak_website.png', client: 'Trails of Teak', url: 'https://trailsofteak.com', category: 'Hospitality' },
    { src: '/work/websites/elisa_website.png', client: 'Elisa India', url: 'https://elisaindia.com', category: 'E-commerce' },
    { src: '/work/websites/playpal_website.png', client: 'PlayPal', url: 'https://playpal.freakingminds.in', category: 'Marketplace' },
    { src: '/work/websites/jigoworld_website.png', client: 'JIGO World', url: 'https://jigoworld.com', category: 'Manufacturing' },
    { src: '/work/websites/supertripindia_website.png', client: 'SuperTrip India', url: 'https://supertripindia.com', category: 'Travel' },
    { src: '/work/websites/sorathelabel_website.png', client: 'Sora The Label', url: 'https://sorathelabel.com', category: 'Shopify Store' },
    { src: '/work/websites/raginiiuplopwar_website.png', client: 'Raginii Uplopwar', url: 'https://raginiiuplopwar.com', category: 'Personal Brand' },
    { src: '/work/websites/khuttal_website.jpg', client: 'Khuttal', url: 'https://khuttal.com', category: 'Restaurant' },
    { src: '/work/websites/skr_group_website.jpg', client: 'SKR Group', url: 'https://skrgroup.co.in', category: 'Corporate' },
    { src: '/work/websites/badastoor_website.jpg', client: 'Badastoor', url: 'https://badastoor.in', category: 'Fashion' },
    { src: '/work/websites/mahua_house_website.jpg', client: 'Mahua House', url: 'https://mahuahouse.in', category: 'Restaurant' },
    { src: '/work/websites/mohdiamond_website.jpg', client: 'Moh Diamond', url: 'https://mohdiamond.com', category: 'Jewelry' },
    { src: '/work/websites/griha_shiksha_kendra_website.jpg', client: 'Griha Shiksha Kendra', url: 'https://grihashikshakendra.com', category: 'Education' },
  ],
};

/** True for the logo placeholders whose real client name is unknown. */
export function isUnnamedClient(client: string): boolean {
  return /^Client \d+$/.test(client);
}

export const VIDEO_WORK = [
  { id: 'bhopal_manthan', client: 'Bhopal Manthan', category: 'Brand Video' },
  { id: 'skr_group', client: 'SKR Group', category: 'Corporate' },
  { id: 'astroo_apaar', client: 'Astroo Apaar', category: 'Promotional' },
  { id: 'renny', client: 'Renny', category: 'Social Media' },
  { id: 'adi', client: 'ADI', category: 'Brand Video' },
  { id: 'concept_studio', client: 'Concept Studio', category: 'Creative' },
  { id: 'kanha', client: 'Kanha', category: 'Promotional' },
  { id: 'giovanni', client: 'Giovanni', category: 'Brand Video' },
] as const;
