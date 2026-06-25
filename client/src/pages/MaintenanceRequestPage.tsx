import React, { useState, useEffect, useCallback } from 'react';
import { assetApi } from '@/api/asset.api';
import { maintenanceApi } from '@/api/maintenance.api';
import type { Asset, MaintenanceRequest } from '@/types';
import './MaintenanceRequestPage.css';

const MaintenanceRequestPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Rating & Feedback State
  const [feedbackState, setFeedbackState] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<Record<string, boolean>>({});

  // Fetch student's room assets & reported tickets
  const fetchRoomInfoAndTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assetsRes, requestsRes] = await Promise.all([
        assetApi.getMyRoomAssets().catch(() => ({ data: { success: true, data: [] } })),
        maintenanceApi.getMyRequests({ page: 1, limit: 50 }).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (assetsRes.data.success) {
        setAssets(assetsRes.data.data || []);
      }
      if (requestsRes.data.success) {
        setRequests(requestsRes.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng & yêu cầu sửa chữa:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomInfoAndTickets();
  }, [fetchRoomInfoAndTickets]);

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Vui lòng điền tiêu đề và mô tả sự cố.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        assetId: selectedAssetId || null,
      };

      const response = await maintenanceApi.create(payload);
      if (response.data.success) {
        alert('Gửi yêu cầu sửa chữa thành công!');
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setSelectedAssetId('');
        // Reload list
        fetchRoomInfoAndTickets();
      }
    } catch (err: any) {
      console.error('Lỗi gửi sự cố:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit feedback rating
  const handleSubmitFeedback = async (ticketId: string) => {
    const input = feedbackState[ticketId];
    if (!input || !input.rating) {
      alert('Vui lòng chọn số sao đánh giá (1-5 sao).');
      return;
    }

    setIsSubmittingFeedback(prev => ({ ...prev, [ticketId]: true }));
    try {
      const response = await maintenanceApi.submitFeedback(ticketId, {
        rating: input.rating,
        feedback: input.feedback?.trim() || undefined,
      });
      if (response.data.success) {
        alert('Gửi đánh giá chất lượng thành công! Cảm ơn bạn đã phản hồi.');
        // Clear state for this ticket
        setFeedbackState(prev => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
        fetchRoomInfoAndTickets();
      }
    } catch (err: any) {
      console.error('Lỗi gửi đánh giá:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setIsSubmittingFeedback(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  // Cancel reported ticket (only when status is PENDING)
  const handleCancelTicket = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu "${name}"?`)) return;

    try {
      const response = await maintenanceApi.updateStatus(id, { status: 'CANCELLED' });
      if (response.data.success) {
        alert('Đã hủy yêu cầu sửa chữa!');
        fetchRoomInfoAndTickets();
      }
    } catch (err: any) {
      console.error('Lỗi hủy yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể hủy yêu cầu này.');
    }
  };

  // Format Helper
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Chờ tiếp nhận',
    ASSIGNED: 'Đã phân công',
    IN_PROGRESS: 'Đang sửa chữa',
    RESOLVED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
  };

  const statusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-badge--pending';
      case 'ASSIGNED': return 'status-badge--assigned';
      case 'IN_PROGRESS': return 'status-badge--in_progress';
      case 'RESOLVED': return 'status-badge--resolved';
      case 'CANCELLED': return 'status-badge--cancelled';
      default: return '';
    }
  };

  return (
    <div className="student-maint">
      <header className="student-maint__header">
        <h1 className="student-maint__title">Báo cáo sự cố phòng ở</h1>
        <p className="student-maint__subtitle">
          Báo cáo các hư hỏng về thiết bị điện, nước, nội thất trong phòng để ban quản lý cử nhân viên hỗ trợ.
        </p>
      </header>

      <div className="student-maint__content">
        {/* Left Side: Submit Form */}
        <section className="student-maint__form-card">
          <h2 className="student-maint__form-title">Tạo Báo cáo Sự cố</h2>
          
          <form onSubmit={handleSubmit} className="asset-form">
            <div className="form-group">
              <label htmlFor="maint-title">Tên sự cố / Tiêu đề ngắn</label>
              <input
                id="maint-title"
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Máy lạnh chảy nước, Bóng đèn bị cháy..."
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maint-asset">Chọn thiết bị gặp sự cố</label>
              <select
                id="maint-asset"
                className="form-input"
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">-- Cơ sở vật chất phòng khác / Không có --</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.code}) — [{asset.status === 'GOOD' ? 'Bình thường' : 'Đang lỗi'}]
                  </option>
                ))}
              </select>
              {assets.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                  Không tìm thấy thiết bị phòng được gán trên hệ thống. Bạn vẫn có thể báo hỏng cơ sở vật chất phòng nói chung.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="maint-priority">Mức độ ưu tiên</label>
              <select
                id="maint-priority"
                className="form-input"
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                disabled={isSubmitting}
              >
                <option value="LOW">Thấp (Chưa cần gấp, trong tuần)</option>
                <option value="MEDIUM">Trung bình (Sửa trong 1-2 ngày)</option>
                <option value="HIGH">Cao (Cần xử lý trong ngày)</option>
                <option value="URGENT">Khẩn cấp (Sự cố nghiêm trọng, chập điện, tràn nước...)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maint-desc">Mô tả chi tiết sự cố</label>
              <textarea
                id="maint-desc"
                className="form-input"
                style={{ resize: 'vertical', minHeight: '120px' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Vui lòng tả rõ biểu hiện lỗi, vị trí thiết bị trong phòng để nhân viên dễ tìm sửa..."
                required
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="btn-submit" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu cầu Bảo trì'}
            </button>
          </form>
        </section>

        {/* Right Side: Request History */}
        <section className="student-maint__history">
          <h2 className="student-maint__history-title">Lịch sử Báo hỏng của Phòng</h2>
          
          {isLoading ? (
            <div className="loading-screen" style={{ minHeight: '30vh' }}>
              <div className="spinner" />
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--color-surface, #1F2937)', border: '1px solid var(--color-border, rgba(255, 255, 255, 0.07))', padding: '3rem', textAlign: 'center', borderRadius: 16 }}>
              <span style={{ fontSize: '2.5rem' }}>📋</span>
              <h3 style={{ marginTop: '1rem', color: 'var(--color-text, #f1f5f9)' }}>Chưa có báo cáo sự cố nào</h3>
              <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.875rem' }}>Các yêu cầu sửa chữa phòng của bạn sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            requests.map(ticket => (
              <article key={ticket.id} className="student-ticket">
                <div className="student-ticket__main">
                  <div className="student-ticket__title-row">
                    <span className={`status-badge ${statusClass(ticket.status)}`}>
                      {statusLabel[ticket.status]}
                    </span>
                    <h3 className="student-ticket__title">{ticket.title}</h3>
                  </div>

                  <p className="student-ticket__desc">{ticket.description}</p>

                  <div className="student-ticket__meta">
                    <span>Ngày báo: <strong>{formatDateTime(ticket.createdAt)}</strong></span>
                    <span>
                      Thiết bị: <strong>{ticket.asset ? `${ticket.asset.name} (${ticket.asset.code})` : 'Khác'}</strong>
                    </span>
                    {ticket.staff && (
                      <span>Nhân viên sửa: <strong>{ticket.staff.fullName}</strong></span>
                    )}
                  </div>

                  {ticket.notes && (
                    <div className="student-ticket__tech-log">
                      <strong>Phản hồi từ Ban quản lý:</strong>
                      <p className="student-ticket__tech-notes">"{ticket.notes}"</p>
                      {ticket.resolvedAt && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                          Hoàn thành lúc: {formatDateTime(ticket.resolvedAt)}
                        </div>
                      )}
                    </div>
                  )}

                  {ticket.status === 'RESOLVED' && (
                    <div className="student-ticket__feedback-section">
                      {ticket.rating ? (
                        <div className="student-ticket__feedback-view">
                          <div className="feedback-stars">
                            <span className="feedback-stars__label">Đánh giá của bạn:</span>
                            <div className="stars-row">
                              {[1, 2, 3, 4, 5].map(star => (
                                <svg
                                  key={star}
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill={star <= (ticket.rating || 0) ? "#f59e0b" : "none"}
                                  stroke={star <= (ticket.rating || 0) ? "#f59e0b" : "#64748b"}
                                  strokeWidth="2"
                                  className="star-icon star-icon--readonly"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {ticket.feedback && (
                            <p className="feedback-text-content">"{ticket.feedback}"</p>
                          )}
                        </div>
                      ) : (
                        <div className="student-ticket__feedback-form">
                          <div className="feedback-stars-input">
                            <span className="feedback-stars__label">Đánh giá chất lượng sửa chữa:</span>
                            <div className="stars-row">
                              {[1, 2, 3, 4, 5].map(star => {
                                const currentRating = feedbackState[ticket.id]?.rating || 0;
                                return (
                                  <button
                                    type="button"
                                    key={star}
                                    className="star-button"
                                    onClick={() => setFeedbackState(prev => ({
                                      ...prev,
                                      [ticket.id]: {
                                        ...(prev[ticket.id] || { feedback: '' }),
                                        rating: star
                                      }
                                    }))}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill={star <= currentRating ? "#f59e0b" : "none"}
                                      stroke={star <= currentRating ? "#f59e0b" : "#64748b"}
                                      strokeWidth="2"
                                      className="star-icon star-icon--interactive"
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="feedback-comment-input">
                            <textarea
                              className="feedback-textarea"
                              placeholder="Nhập ý kiến đánh giá (tối đa 200 chữ)..."
                              maxLength={200}
                              value={feedbackState[ticket.id]?.feedback || ''}
                              onChange={e => setFeedbackState(prev => ({
                                ...prev,
                                [ticket.id]: {
                                  ...(prev[ticket.id] || { rating: 0 }),
                                  feedback: e.target.value
                                }
                              }))}
                              disabled={isSubmittingFeedback[ticket.id]}
                            />
                            <div className="feedback-textarea-footer">
                              <span className="char-counter">
                                {(feedbackState[ticket.id]?.feedback || '').length}/200
                              </span>
                              <button
                                type="button"
                                className="btn-submit-feedback"
                                onClick={() => handleSubmitFeedback(ticket.id)}
                                disabled={isSubmittingFeedback[ticket.id] || !(feedbackState[ticket.id]?.rating)}
                              >
                                {isSubmittingFeedback[ticket.id] ? 'Đang gửi...' : 'Gửi Đánh giá'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {ticket.status === 'PENDING' && (
                  <button
                    className="btn-cancel-ticket"
                    onClick={() => handleCancelTicket(ticket.id, ticket.title)}
                  >
                    Hủy yêu cầu
                  </button>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
};

export default MaintenanceRequestPage;
