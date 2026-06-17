import axiosClient from '@/api/axiosClient';

export const utilityService = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    roomId?: string;
  }) => axiosClient.get('/utilities', { params }),

  getById: (id: string) => axiosClient.get(`/utilities/${id}`),

  create: (data: {
    roomId: string;
    billingMonth: number;
    billingYear: number;
    previousElectric: number;
    currentElectric: number;
    previousWater: number;
    currentWater: number;
    electricPrice: number;
    waterPrice: number;
  }) => axiosClient.post('/utilities', data),

  update: (id: string, data: any) => axiosClient.put(`/utilities/${id}`, data),

  delete: (id: string) => axiosClient.delete(`/utilities/${id}`),

  calculate: (data: {
    roomFee: number;
    previousElectric: number;
    currentElectric: number;
    previousWater: number;
    currentWater: number;
    electricPrice: number;
    waterPrice: number;
    serviceFee: number;
  }) => axiosClient.post('/utilities/calculate', data),
};
