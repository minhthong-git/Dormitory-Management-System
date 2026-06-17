import axiosClient from '@/api/axiosClient';

// Helper to trigger direct browser file download from Blob response
export const downloadBlobFile = async (url: string, params: any, defaultFilename: string) => {
  const response = await axiosClient.get(url, {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: (response.headers['content-type'] as string) || 'application/octet-stream' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

export const invoiceService = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    roomId?: string;
    billingMonth?: number;
    billingYear?: number;
    search?: string;
  }) => axiosClient.get('/invoices', { params }),

  getById: (id: string) => axiosClient.get(`/invoices/${id}`),

  create: (data: any) => axiosClient.post('/invoices', data),

  update: (id: string, data: any) => axiosClient.put(`/invoices/${id}`, data),

  delete: (id: string) => axiosClient.delete(`/invoices/${id}`),

  generate: (data: { roomId: string; billingMonth: number; billingYear: number; serviceFee?: number }) =>
    axiosClient.post('/invoices/generate', data),

  updatePayment: (id: string, data: { paymentStatus: string; paidDate?: string | Date }) =>
    axiosClient.patch(`/invoices/${id}/payment`, data),

  getStatistics: () => axiosClient.get('/invoices/statistics'),

  exportExcel: (params?: { roomId?: string; billingMonth?: number; billingYear?: number; reportType?: string }) => {
    const filename = params?.reportType === 'monthly'
      ? `BaoCaoDoanhThuThang_${new Date().getFullYear()}.xlsx`
      : params?.reportType === 'yearly'
      ? 'BaoCaoDoanhThuNam.xlsx'
      : `LichSuHoaDon_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return downloadBlobFile('/invoices/export/excel', params, filename);
  },

  exportPdf: (params?: { id?: string; roomId?: string; billingMonth?: number; billingYear?: number }) => {
    const filename = params?.id
      ? `HoaDon_${params.id.slice(0, 8)}.pdf`
      : `LichSuHoaDon_${new Date().toISOString().slice(0, 10)}.pdf`;
    return downloadBlobFile('/invoices/export/pdf', params, filename);
  },
};
