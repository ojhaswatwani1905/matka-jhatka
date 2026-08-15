// ========================================
// Core Type Definitions
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin';
  isAdmin?: boolean;
  balance: number;
  isActive?: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  createdAt: string;
}

export interface Bet {
  id: string;
  userId: string;
  gameType: GameType;
  period: string;
  selection: string;
  amount: number;
  result?: 'win' | 'loss' | 'pending';
  payout?: number;
  createdAt: string;
}

export interface GameResult {
  id: string;
  gameType: GameType;
  period: string;
  result: string;
  color?: string;
  number?: number;
  createdAt: string;
}

export type GameType = 'color-prediction' | 'matka' | 'wingo' | 'lottery';

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  isLoading: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface BankDetail {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
}

// Color Prediction specific
export type ColorChoice = 'green' | 'red' | 'violet';
export type SizeChoice = 'big' | 'small';
export type NumberChoice = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ColorPredictionBet {
  type: 'color' | 'size' | 'number';
  selection: string;
  amount: number;
}

export interface ColorPredictionResult {
  period: string;
  number: number;
  color: ColorChoice;
  size: SizeChoice;
}

// Matka specific
export type MatkaMarket = 'single' | 'jodi' | 'patti' | 'half-sangam' | 'full-sangam';

export interface MatkaMarketInfo {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  status: 'open' | 'closed' | 'result';
  lastResult?: string;
}

// Toast
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Banner
export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  gradient: string;
  icon?: string;
}

// Admin
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalBets: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

// Winner
export interface RecentWinner {
  id: string;
  name: string;
  avatar?: string;
  amount: number;
  game: string;
  timestamp: string;
}

// KYC
export type KYCStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

export interface KYCData {
  userId: string;
  fullName: string;
  dob: string;
  idType: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  idNumber: string;
  frontDoc?: string;
  backDoc?: string;
  selfie?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface KYCState {
  status: KYCStatus;
  data: KYCData | null;
}

// Game Config (admin-controlled)
export interface GameConfig {
  id: string;
  name: string;
  enabled: boolean;
  odds: Record<string, number>;
  timerDuration?: number; // seconds
}

// Payment / Fund Requests (Demo Flow)
export type PaymentRequestType = 'deposit' | 'withdrawal';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequestAccountDetails {
  id?: string;
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  upiId?: string;
  type?: 'bank' | 'upi';
  label?: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: PaymentRequestType;
  amount: number;
  whatsappNumber: string;
  accountDetails?: PaymentRequestAccountDetails;
  status: PaymentRequestStatus;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  demo: boolean;
}
