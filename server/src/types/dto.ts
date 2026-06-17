export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export interface CreateInvoiceDto {
  roomId: string;
  contractId?: string;
  billingMonth: number;
  billingYear: number;
  roomFee: number;
  electricityFee: number;
  waterFee: number;
  serviceFee: number;
  totalAmount: number;
  paymentStatus?: PaymentStatus;
  dueDate: string | Date;
  paidDate?: string | Date;
}

export interface UpdateInvoiceDto {
  roomId?: string;
  contractId?: string;
  billingMonth?: number;
  billingYear?: number;
  roomFee?: number;
  electricityFee?: number;
  waterFee?: number;
  serviceFee?: number;
  totalAmount?: number;
  paymentStatus?: PaymentStatus;
  dueDate?: string | Date;
  paidDate?: string | Date | null;
}

export interface CreateUtilityReadingDto {
  roomId: string;
  billingMonth: number;
  billingYear: number;
  previousElectric: number;
  currentElectric: number;
  previousWater: number;
  currentWater: number;
  electricPrice: number;
  waterPrice: number;
}

export interface UpdateUtilityReadingDto {
  roomId?: string;
  billingMonth?: number;
  billingYear?: number;
  previousElectric?: number;
  currentElectric?: number;
  previousWater?: number;
  currentWater?: number;
  electricPrice?: number;
  waterPrice?: number;
}

export interface RevenueStatisticsDto {
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  totalInvoices: number;
  overdueInvoices: number;
  revenueGrowthPercent: number;
  monthlyRevenue: {
    month: string;
    amount: number;
  }[];
  yearlyRevenue: {
    year: number;
    amount: number;
  }[];
  revenueByStatus: {
    status: string;
    amount: number;
    count: number;
  }[];
  revenueByRoom: {
    roomNumber: string;
    amount: number;
  }[];
}
