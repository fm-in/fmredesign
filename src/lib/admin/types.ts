import { SITE_URL } from '@/lib/site-url';
/**
 * Admin Dashboard Types
 */

// Invoice Types
export interface InvoiceLineItem {
  id: string;
  description: string;
  sacCode?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  gstNumber?: string;
}

export type InvoiceCurrency = 'INR' | 'USD' | 'GBP' | 'AED' | 'EUR';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: InvoiceClient;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: InvoiceCurrency;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  placeOfSupply?: string;
  companyGstin: string;
  notes?: string;
  terms?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

// Company Information
export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  taxId?: string;
  msmeUdyamNumber?: string;
}

// Bank Account Information
export interface BankAccountInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode?: string;
  branch?: string;
  accountType?: string;
}

/** Indian clients — HDFC Bank (Freaking Minds) */
export const INDIAN_BANK_INFO: BankAccountInfo = {
  bankName: 'HDFC Bank',
  accountName: 'Freaking Minds',
  accountNumber: '50200046586390',
  ifscCode: 'HDFC0000062',
  branch: 'Arera Colony, Bhopal',
  accountType: 'Current Account',
};

/** International clients — Kotak Mahindra Bank (Freaking Minds LLP) */
export const INTERNATIONAL_BANK_INFO: BankAccountInfo = {
  bankName: 'Kotak Mahindra Bank Ltd',
  accountName: 'Freaking Minds LLP',
  accountNumber: '9451163111',
  ifscCode: 'KKBK0005886',
  swiftCode: 'KKBKINBBCPC',
  branch: 'Plot No E-2-111, Arera Colony, Bhopal 462016',
  accountType: 'Current Account',
};

/** Pick the right bank account based on client country */
export function getBankInfoForClient(country?: string): BankAccountInfo {
  if (!country || country.toLowerCase() === 'india') return INDIAN_BANK_INFO;
  return INTERNATIONAL_BANK_INFO;
}

/** Pick the right bank account based on currency */
export function getBankInfoForCurrency(currency: string): BankAccountInfo {
  if (currency === 'INR') return INDIAN_BANK_INFO;
  return INTERNATIONAL_BANK_INFO;
}

// Default company info for Freaking Minds
// Registration numbers are public (appear on invoices) — safe to hardcode
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Freaking Minds",
  address: "House No. 5, Maheshwari Bhawan, Near Qutbi Masjid, MP Nagar, Professors Colony",
  city: "Bhopal",
  state: "Madhya Pradesh",
  zipCode: "462002",
  phone: "+91 98332 57659",
  email: "freakingmindsdigital@gmail.com",
  website: SITE_URL,
  taxId: "23BQNPM3447F1ZT",
  msmeUdyamNumber: "UDYAM-MP-10-0032670",
};

/** @deprecated Use INDIAN_BANK_INFO or INTERNATIONAL_BANK_INFO instead */
export const DEFAULT_BANK_INFO: BankAccountInfo = INDIAN_BANK_INFO;

// Agency Services and Products
export interface AgencyService {
  id: string;
  name: string;
  category: 'digital_marketing' | 'web_development' | 'design' | 'content' | 'consulting' | 'advertising' | 'strategy' | 'maintenance';
  description: string;
  sacCode: string;
  suggestedRate?: number;
  unit?: string;
}

export const AGENCY_SERVICES: AgencyService[] = [
  // Digital Marketing Services
  {
    id: 'social-media-management',
    name: 'Social Media Management',
    category: 'digital_marketing',
    description: 'Complete social media management including content creation, posting, and community engagement',
    sacCode: '998365',
    suggestedRate: 25000,
    unit: 'month'
  },
  {
    id: 'ppc-advertising',
    name: 'Pay-Per-Click (PPC) Advertising',
    category: 'advertising',
    description: 'Google Ads, Facebook Ads, and other paid advertising campaign management',
    sacCode: '998365',
    suggestedRate: 35000,
    unit: 'month'
  },
  {
    id: 'seo-optimization',
    name: 'Search Engine Optimization (SEO)',
    category: 'digital_marketing',
    description: 'Complete SEO strategy, keyword research, on-page and off-page optimization',
    sacCode: '998365',
    suggestedRate: 30000,
    unit: 'month'
  },
  {
    id: 'content-marketing',
    name: 'Content Marketing Strategy',
    category: 'content',
    description: 'Blog writing, content strategy, and content calendar development',
    sacCode: '998363',
    suggestedRate: 20000,
    unit: 'month'
  },
  {
    id: 'email-marketing',
    name: 'Email Marketing Campaigns',
    category: 'digital_marketing',
    description: 'Email campaign design, automation, and performance tracking',
    sacCode: '998365',
    suggestedRate: 15000,
    unit: 'month'
  },

  // Web Development Services
  {
    id: 'website-development',
    name: 'Website Development',
    category: 'web_development',
    description: 'Custom website development using modern technologies',
    sacCode: '998314',
    suggestedRate: 75000,
    unit: 'project'
  },
  {
    id: 'ecommerce-development',
    name: 'E-commerce Website Development',
    category: 'web_development',
    description: 'Complete e-commerce solution with payment gateway integration',
    sacCode: '998314',
    suggestedRate: 125000,
    unit: 'project'
  },
  {
    id: 'mobile-app-development',
    name: 'Mobile App Development',
    category: 'web_development',
    description: 'iOS and Android app development',
    sacCode: '998314',
    suggestedRate: 150000,
    unit: 'project'
  },
  {
    id: 'website-redesign',
    name: 'Website Redesign',
    category: 'web_development',
    description: 'Complete website redesign and modernization',
    sacCode: '998314',
    suggestedRate: 50000,
    unit: 'project'
  },

  // Design Services
  {
    id: 'brand-identity-design',
    name: 'Brand Identity Design',
    category: 'design',
    description: 'Logo design, brand guidelines, and visual identity creation',
    sacCode: '998396',
    suggestedRate: 45000,
    unit: 'project'
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX Design',
    category: 'design',
    description: 'User interface and user experience design for web and mobile',
    sacCode: '998396',
    suggestedRate: 40000,
    unit: 'project'
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design Services',
    category: 'design',
    description: 'Brochures, flyers, social media graphics, and marketing materials',
    sacCode: '998396',
    suggestedRate: 15000,
    unit: 'project'
  },
  {
    id: 'video-production',
    name: 'Video Production',
    category: 'content',
    description: 'Corporate videos, promotional content, and video editing',
    sacCode: '998363',
    suggestedRate: 35000,
    unit: 'project'
  },

  // Consulting & Strategy
  {
    id: 'digital-strategy-consulting',
    name: 'Digital Strategy Consulting',
    category: 'consulting',
    description: 'Digital transformation strategy and business consulting',
    sacCode: '998319',
    suggestedRate: 8000,
    unit: 'hour'
  },
  {
    id: 'marketing-audit',
    name: 'Marketing Audit & Analysis',
    category: 'consulting',
    description: 'Comprehensive analysis of current marketing efforts and recommendations',
    sacCode: '998319',
    suggestedRate: 25000,
    unit: 'project'
  },
  {
    id: 'brand-strategy',
    name: 'Brand Strategy Development',
    category: 'strategy',
    description: 'Brand positioning, messaging, and go-to-market strategy',
    sacCode: '998319',
    suggestedRate: 35000,
    unit: 'project'
  },

  // Maintenance & Support
  {
    id: 'website-maintenance',
    name: 'Website Maintenance',
    category: 'maintenance',
    description: 'Monthly website updates, security, and technical support',
    sacCode: '998316',
    suggestedRate: 8000,
    unit: 'month'
  },
  {
    id: 'hosting-management',
    name: 'Hosting & Domain Management',
    category: 'maintenance',
    description: 'Server management, domain renewal, and hosting optimization',
    sacCode: '998316',
    suggestedRate: 5000,
    unit: 'month'
  },
  {
    id: 'analytics-reporting',
    name: 'Analytics & Performance Reporting',
    category: 'consulting',
    description: 'Monthly performance reports and data analysis',
    sacCode: '998319',
    suggestedRate: 12000,
    unit: 'month'
  }
];

// Team Management Types
export interface TeamMember {
  // Basic Info
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  
  // Employment Details  
  type: 'employee' | 'freelancer' | 'contractor';
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  startDate: string;
  endDate?: string;
  
  // Role & Skills
  role: TeamRole;
  department: TeamDepartment;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'director';
  
  // Skills & Expertise
  skills: string[];
  certifications: Certification[];
  
  // Financial
  compensation: {
    type: 'salary' | 'hourly' | 'project-based';
    amount: number;
    currency: string;
    billingRate?: number; // What clients are charged
  };
  
  // Work Details
  workType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  location: 'office' | 'remote' | 'hybrid';
  capacity: number; // Hours per week
  
  // Client Assignments
  assignedClients: string[];
  currentProjects: string[];
  workload: number; // Current utilization %
  
  // Performance
  clientRatings: number;
  tasksCompleted: number;
  efficiency: number;
  
  // Administrative
  documents: TeamDocument[];
  notes: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export type TeamRole = 
  | 'creative-director' 
  | 'account-manager' 
  | 'content-writer' 
  | 'graphic-designer' 
  | 'social-media-manager' 
  | 'web-developer'
  | 'seo-specialist' 
  | 'paid-ads-manager' 
  | 'video-editor'
  | 'ui-ux-designer'
  | 'copywriter'
  | 'project-manager'
  | 'business-analyst'
  | 'data-analyst'
  | 'operations-manager'
  | 'admin-manager';

export type TeamDepartment = 
  | 'creative' 
  | 'strategy' 
  | 'technology' 
  | 'accounts' 
  | 'management'
  | 'operations';

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  dateObtained: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface TeamDocument {
  id: string;
  type: 'contract' | 'nda' | 'certificate' | 'resume' | 'other';
  name: string;
  url?: string;
  uploadedAt: string;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
  available: boolean;
}

export interface TeamAssignment {
  id: string;
  teamMemberId: string;
  clientId: string;
  projectId?: string;
  role: string;
  startDate: string;
  endDate?: string;
  hoursAllocated: number;
  isLead: boolean;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  employees: number;
  freelancers: number;
  avgUtilization: number;
  totalCapacity: number;
  departmentBreakdown: Record<TeamDepartment, number>;
  skillsBreakdown: Record<string, number>;
}

export const TEAM_ROLES: Record<TeamRole, string> = {
  'creative-director': 'Creative Director',
  'account-manager': 'Account Manager',
  'content-writer': 'Content Writer',
  'graphic-designer': 'Graphic Designer',
  'social-media-manager': 'Social Media Manager',
  'web-developer': 'Web Developer',
  'seo-specialist': 'SEO Specialist',
  'paid-ads-manager': 'Paid Ads Manager',
  'video-editor': 'Video Editor',
  'ui-ux-designer': 'UI/UX Designer',
  'copywriter': 'Copywriter',
  'project-manager': 'Project Manager',
  'business-analyst': 'Business Analyst',
  'data-analyst': 'Data Analyst',
  'operations-manager': 'Operations Manager',
  'admin-manager': 'Admin Manager'
};

export const TEAM_DEPARTMENTS: Record<TeamDepartment, string> = {
  creative: 'Creative',
  strategy: 'Strategy',
  technology: 'Technology',
  accounts: 'Accounts',
  management: 'Management',
  operations: 'Operations'
};

export const COMMON_SKILLS = [
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Adobe After Effects',
  'Figma',
  'React',
  'Next.js',
  'WordPress',
  'Google Analytics',
  'Google Ads',
  'Facebook Ads',
  'Instagram Marketing',
  'Content Strategy',
  'SEO',
  'SEM',
  'Email Marketing',
  'Marketing Automation',
  'Project Management',
  'Client Communication',
  'Brand Strategy',
  'Video Editing',
  'Photography',
  'Copywriting',
  'Social Media Strategy',
  'Digital Marketing',
  'Web Development',
  'Mobile App Development',
  'Database Management',
  'API Integration',
  'UI/UX Design',
  'Wireframing',
  'Prototyping'
];

export const SERVICE_CATEGORIES = {
  digital_marketing: 'Digital Marketing',
  web_development: 'Web Development',
  design: 'Design & Creative',
  content: 'Content Creation',
  consulting: 'Consulting',
  advertising: 'Paid Advertising',
  strategy: 'Strategy',
  maintenance: 'Maintenance & Support'
} as const;

// Currency options for multi-currency invoicing
export interface CurrencyOption {
  value: InvoiceCurrency;
  label: string;
  symbol: string;
  locale: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'INR', label: '\u20B9 INR', symbol: '\u20B9', locale: 'en-IN' },
  { value: 'USD', label: '$ USD', symbol: '$', locale: 'en-US' },
  { value: 'GBP', label: '\u00A3 GBP', symbol: '\u00A3', locale: 'en-GB' },
  { value: 'AED', label: 'AED', symbol: 'AED ', locale: 'en-AE' },
  { value: 'EUR', label: '\u20AC EUR', symbol: '\u20AC', locale: 'de-DE' },
];

// Company GST constants
export const COMPANY_STATE = 'Madhya Pradesh';
export const COMPANY_GSTIN = '23BQNPM3447F1ZT';

// Default clients with GST numbers
export const DEFAULT_CLIENTS: InvoiceClient[] = [
  {
    id: "1",
    name: "Sample Client 1",
    email: "client1@example.com",
    phone: "+91 98765 43210",
    address: "456 Client Street",
    city: "Delhi",
    state: "Delhi",
    zipCode: "110001",
    country: "India",
    gstNumber: "07ABCDE1234F1Z5",
  },
  {
    id: "2",
    name: "Sample Client 2",
    email: "client2@example.com",
    phone: "+91 98765 43211",
    address: "789 Business Ave",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400001",
    country: "India",
    gstNumber: "27XYZAB5678G2H9",
  },
];

// Invoice utilities
export class InvoiceUtils {
  /**
   * Generate unique invoice number in professional format
   * Format: FM-YYYY-MM-XXXX (e.g., FM-2024-08-0001)
   */
  static generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Generate a sequence number (in real implementation, this would be from database)
    const timestamp = Date.now().toString().slice(-4);
    const sequenceNumber = String(parseInt(timestamp)).padStart(4, '0');
    
    return `FM-${year}-${month}-${sequenceNumber}`;
  }

  /**
   * Calculate line item amount
   */
  static calculateLineItemAmount(quantity: number, rate: number): number {
    return Math.round((quantity * rate) * 100) / 100;
  }

  /**
   * Calculate invoice totals
   */
  static calculateTotals(lineItems: InvoiceLineItem[], taxRate: number = 0) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.round((subtotal * taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * Create empty line item
   */
  static createEmptyLineItem(): InvoiceLineItem {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
  }

  /**
   * Format currency (multi-currency support)
   */
  static formatCurrency(amount: number, currency: InvoiceCurrency = 'INR'): string {
    const opt = CURRENCY_OPTIONS.find(c => c.value === currency) || CURRENCY_OPTIONS[0];
    return new Intl.NumberFormat(opt.locale, {
      style: 'currency',
      currency: opt.value,
    }).format(amount);
  }

  /**
   * Get currency symbol
   */
  static getCurrencySymbol(currency: InvoiceCurrency = 'INR'): string {
    const opt = CURRENCY_OPTIONS.find(c => c.value === currency) || CURRENCY_OPTIONS[0];
    return opt.symbol;
  }

  /**
   * Calculate GST split based on company vs client location
   * - International client: no GST
   * - Same state: CGST + SGST (split equally)
   * - Different state: IGST (full rate)
   */
  static calculateGST(
    subtotal: number,
    taxRate: number,
    companyState: string,
    clientState: string,
    clientCountry: string,
  ): { cgst: number; sgst: number; igst: number; totalTax: number } {
    // International client — no GST
    if (clientCountry && clientCountry.toLowerCase() !== 'india') {
      return { cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    }
    // Same state — CGST + SGST
    if (clientState?.toLowerCase() === companyState.toLowerCase()) {
      const half = Math.round((subtotal * taxRate / 200) * 100) / 100;
      return { cgst: half, sgst: half, igst: 0, totalTax: half * 2 };
    }
    // Different state — IGST
    const igst = Math.round((subtotal * taxRate / 100) * 100) / 100;
    return { cgst: 0, sgst: 0, igst, totalTax: igst };
  }

  /**
   * Format date
   */
  static formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  /**
   * Convert number to words (Indian format)
   */
  static numberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(num: number): string {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)];
        if (num % 10 !== 0) result += ' ' + ones[num % 10];
      } else if (num >= 10) {
        result += teens[num - 10];
      } else if (num > 0) {
        result += ones[num];
      }
      return result.trim();
    }

    if (amount === 0) return 'Zero Rupees Only';

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let result = '';

    // Convert rupees
    if (rupees >= 10000000) { // Crores
      const crores = Math.floor(rupees / 10000000);
      result += convertHundreds(crores) + ' Crore ';
      const remaining = rupees % 10000000;
      if (remaining > 0) {
        if (remaining >= 100000) {
          const lakhs = Math.floor(remaining / 100000);
          result += convertHundreds(lakhs) + ' Lakh ';
          const remAfterLakh = remaining % 100000;
          if (remAfterLakh >= 1000) {
            const thousands = Math.floor(remAfterLakh / 1000);
            result += convertHundreds(thousands) + ' Thousand ';
            const rem = remAfterLakh % 1000;
            if (rem > 0) result += convertHundreds(rem) + ' ';
          } else if (remAfterLakh > 0) {
            result += convertHundreds(remAfterLakh) + ' ';
          }
        } else if (remaining >= 1000) {
          const thousands = Math.floor(remaining / 1000);
          result += convertHundreds(thousands) + ' Thousand ';
          const rem = remaining % 1000;
          if (rem > 0) result += convertHundreds(rem) + ' ';
        } else {
          result += convertHundreds(remaining) + ' ';
        }
      }
    } else if (rupees >= 100000) { // Lakhs
      const lakhs = Math.floor(rupees / 100000);
      result += convertHundreds(lakhs) + ' Lakh ';
      const remaining = rupees % 100000;
      if (remaining >= 1000) {
        const thousands = Math.floor(remaining / 1000);
        result += convertHundreds(thousands) + ' Thousand ';
        const rem = remaining % 1000;
        if (rem > 0) result += convertHundreds(rem) + ' ';
      } else if (remaining > 0) {
        result += convertHundreds(remaining) + ' ';
      }
    } else if (rupees >= 1000) { // Thousands
      const thousands = Math.floor(rupees / 1000);
      result += convertHundreds(thousands) + ' Thousand ';
      const remaining = rupees % 1000;
      if (remaining > 0) {
        result += convertHundreds(remaining) + ' ';
      }
    } else {
      result += convertHundreds(rupees) + ' ';
    }

    result += 'Rupees';

    // Add paise if present
    if (paise > 0) {
      result += ' and ' + convertHundreds(paise) + ' Paise';
    }

    return result.trim() + ' Only';
  }
}