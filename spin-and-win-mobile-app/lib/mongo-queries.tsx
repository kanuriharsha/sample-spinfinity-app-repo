import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Dist = { result: string; count: number; prizeAmount?: number; totalPrizeAmount?: number };
export type Day = { day: string; count: number };
export type TopReturning = { fullName: string; visits: number; lastVisit?: string };
export type Hour = { hour: number; count: number };
export type DOW = { dow: number; count: number };
export type Device = { device: string; count: number };
export type AmountStats = { totalAmountSpent: number; avgAmountSpent: number };
export type DwellTime = { avgDwellSecs: number; maxDwellSecs: number; minDwellSecs: number; samples: number };
export type ByRoute = { routeName: string; count: number };
export type DailyFinancial = { day: string; spins: number; sales: number; discount?: number; income: number; customers?: number };
export type WeeklyFinancial = { week: string; spins: number; sales: number; discount?: number; income: number; customers?: number };
export type MonthlyFinancial = { month: string; spins: number; sales: number; discount?: number; income: number; customers?: number };
export type TopDaily = { 
  customers: number; 
  spins: number; 
  sales: number; 
  discounts: number; 
  prizeAmount: number; 
  income: number;
  recentSpins?: Array<{
    customerName: string;
    winner: string;
    spinTime: string;
    prizeAmount: string;
  }>;
};

export type Customer = {
  fullName: string;
  sessionId: string;
  visits: number;
  totalSpent: number;
  avgSpent: number;
  lastVisit: string;
  firstVisit: string;
  lastPrize: string;
  lastPrizeAmount: number | string; // was string
  userAgent: string;
  ipAddress: string;
  customerType: 'New' | 'Returning' | 'Loyal';
};

export type CustomerSearchResponse = {
  customers: Customer[];
  total: number;
  searchTerm: string;
};

export type AnalyticsResponse = {
  totalSpins: number;
  byResult: Dist[];
  byDay: Day[];
  byHour?: Hour[];
  dayOfWeek?: DOW[];
  uniqueVisitors?: number;
  returningVisitors?: number;
  topReturning?: TopReturning[];
  amountStats?: AmountStats;
  dwellTime?: DwellTime;
  devices?: Device[];
  byRoute?: ByRoute[];
  dailyFinancial?: DailyFinancial[];
  weeklyFinancial?: WeeklyFinancial[];
  monthlyFinancial?: MonthlyFinancial[];
  topDaily?: TopDaily;
};

export type MonthlyCustomers = {
  thisMonth: number;
  lastMonth: number;
  growth: string;
};

export type CustomerSpin = {
  fullName: string;
  sessionId: string;
  spinDate: string;
  amountSpent: number;
  prizeAmount: number;
  prize: string;
  prizeType: string;
  userAgent: string;
  ipAddress: string;
  routeName: string;
};

export type CustomerDetails = {
  customer: {
    fullName: string;
    sessionId: string;
    totalSpins: number;
    totalSpent: number;
    totalPrizeAmount: number;
    avgSpent: number;
    firstVisit: string;
    lastVisit: string;
  };
  spins: CustomerSpin[];
  dailyActivity: {
    date: string;
    spins: number;
    spent: number;
    prizes: number;
  }[];
};

export function getApiUrl(): string {
  // Try environment variable first
  const env = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (env) return env;

  // For development, try to get the host from Constants
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    console.log('Detected host from Constants:', host);
    
    // For Android emulator, map localhost/127.0.0.1 to 10.0.2.2
    const actualHost =
      Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')
        ? '10.0.2.2'
        : host;
    
    const url = `http://${actualHost}:4000`;
    console.log('Generated API URL:', url);
    return url;
  }

  // Platform-specific fallbacks
  const fallbackUrl = Platform.select({
    android: 'http://10.0.2.2:4000',
    ios: 'http://127.0.0.1:4000',
    default: 'http://localhost:4000',
  }) as string;
  
  console.log('Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
}

async function parseJsonOrThrow(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const text = await res.text();
  throw new Error(`Unexpected content-type "${ct}". Body: ${text.slice(0, 200)}`);
}

export async function fetchAnalytics(params: {
  apiUrl: string;
  creds: { username: string; password: string };
  // include optional routeName so client can request route-scoped analytics
  query?: { rangeDays?: number; from?: string; to?: string; tz?: string; routeName?: string };
}): Promise<AnalyticsResponse> {
  const { apiUrl, creds, query } = params;

  // Try POST first
  let res = await fetch(`${apiUrl}/api/analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-User': creds.username,
      'X-Password': creds.password,
    },
    body: JSON.stringify({ username: creds.username, password: creds.password, ...(query || {}) }),
  });

  let data: any;
  try {
    data = await parseJsonOrThrow(res);
  } catch {
    // Fallback to GET
    const sp = new URLSearchParams();
    if (query?.rangeDays) sp.set('rangeDays', String(query.rangeDays));
    if (query?.from) sp.set('from', query.from);
    if (query?.to) sp.set('to', query.to);
    if (query?.tz) sp.set('tz', query.tz); // pass tz to server
    if (query?.routeName) sp.set('routeName', String(query.routeName));

    res = await fetch(`${apiUrl}/api/analytics${sp.toString() ? `?${sp.toString()}` : ''}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-User': creds.username,
        'X-Password': creds.password,
      },
    });
    data = await parseJsonOrThrow(res);
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data as AnalyticsResponse;
}

export async function searchCustomers(params: {
  apiUrl: string;
  creds: { username: string; password: string };
  search?: string;
  limit?: number;
}): Promise<CustomerSearchResponse> {
  const { apiUrl, creds, search = '', limit = 50 } = params;

  const searchParams = new URLSearchParams();
  if (search) searchParams.set('search', search);
  if (limit) searchParams.set('limit', String(limit));

  const res = await fetch(`${apiUrl}/api/customers/search?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User': creds.username,
      'X-Password': creds.password,
    },
  });

  const data = await parseJsonOrThrow(res);
  
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data as CustomerSearchResponse;
}

export async function fetchMonthlyCustomers(params: {
  apiUrl: string;
  creds: { username: string; password: string };
}): Promise<MonthlyCustomers> {
  const { apiUrl, creds } = params;

  const res = await fetch(`${apiUrl}/api/customers/monthly`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User': creds.username,
      'X-Password': creds.password,
    },
  });

  const data = await parseJsonOrThrow(res);
  
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data as MonthlyCustomers;
}

export async function fetchCustomerDetails(params: {
  apiUrl: string;
  creds: { username: string; password: string };
  customerId: string;
}): Promise<CustomerDetails> {
  const { apiUrl, creds, customerId } = params;

  const res = await fetch(`${apiUrl}/api/customers/${encodeURIComponent(customerId)}/details`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User': creds.username,
      'X-Password': creds.password,
    },
  });

  const data = await parseJsonOrThrow(res);
  
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data as CustomerDetails;
}
