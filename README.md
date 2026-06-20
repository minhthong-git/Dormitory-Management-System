# Tài liệu Hướng dẫn Logic Vận hành Ký túc xá (Dormitory Management System)

Tài liệu này tổng hợp toàn bộ các bộ quy tắc (Logic/Rules) cốt lõi đang chạy ngầm trong dự án hiện tại. Các thành viên trong team cần đọc kỹ để khi code các tính năng tiếp theo (Thống kê, Thanh toán, Điện nước,...) không làm hỏng cấu trúc dữ liệu.

## 1. Logic Quản lý Tài khoản & Hồ sơ Sinh viên (Profile)
* **Tách biệt User và Student:** Khi một sinh viên đăng ký tài khoản, hệ thống tạo ra một bản ghi trong bảng `User`. Tuy nhiên, lúc này sinh viên chưa có hồ sơ KTX (`Student`).
* **Bắt buộc cập nhật hồ sơ:** Ngay sau khi đăng nhập, sinh viên **bắt buộc** phải cập nhật Hồ sơ cá nhân (Quan trọng nhất là **Giới tính** và **MSSV**). 
* **Quy tắc chặn (Block Rule):** Hệ thống sẽ **KHÔNG** hiển thị danh sách phòng và không cho phép đặt giường nếu sinh viên chưa khai báo Giới tính.

## 2. Logic Quản lý Phòng & Giường (Room & Bed)
Dự án được thiết kế theo chuẩn Ký túc xá thực tế, tuyệt đối không dùng chuẩn Khách sạn.

* **Loại phòng và Sức chứa (Cứng):**
  * `SMALL` (Phòng nhỏ): Mặc định khóa sức chứa là **2 giường**.
  * `STANDARD` (Phòng tiêu chuẩn): Mặc định khóa sức chứa là **4 giường**.
  * `LARGE` (Phòng đông): Mặc định khóa sức chứa là **6 giường**.
  * 👉 *Lưu ý:* Admin chỉ được chọn loại phòng, sức chứa sẽ tự động được gán ở Backend. Backend sẽ văng lỗi (Error 400) nếu ai đó cố tình gửi sức chứa sai lên API.
* **Tự động sinh Giường (Auto-generate Beds):** Khi Admin bấm "Lưu" để tạo một phòng mới, Backend sẽ **tự động** tạo ra số lượng giường trống tương ứng với sức chứa của phòng đó. (VD: Tạo phòng Tiêu chuẩn -> Tự có sẵn 4 giường 1,2,3,4).
* **Phân chia Giới tính (Gender Strict):**
  * Tòa nhà có thể chứa cả nam và nữ (`MIXED`).
  * Nhưng **PHÒNG** thì bắt buộc phải quy định rõ ràng là Phòng Nam (`MALE`) hoặc Phòng Nữ (`FEMALE`). Tuyệt đối không có phòng nam nữ ở chung.
  * *Ràng buộc thay đổi:* Admin **không thể** đổi Giới tính của một phòng nếu phòng đó đang có sinh viên ở (`currentOccupancy > 0`).

## 3. Logic Đặt phòng (Booking Flow)
* **Quy tắc lọc phòng hiển thị:** Sinh viên Nam chỉ nhìn thấy phòng Nam, sinh viên Nữ chỉ nhìn thấy phòng Nữ.
* **Quy tắc chọn giường:** Sinh viên bấm đặt giường sẽ tạo ra một Hợp đồng (`Contract`) ở trạng thái chờ duyệt (`PENDING`). Lúc này giường chuyển sang trạng thái "Đã được đặt".
* **Kiểm tra chéo:** Backend luôn kiểm tra giới tính của Student có khớp với `genderType` của Room hay không trước khi lưu hợp đồng.

## 4. Lưu ý cho Devs khi code tiếp
1. **Cập nhật Database:** Nếu có ai đó pull code mới về, họ **BẮT BUỘC** phải chạy các lệnh sau ở thư mục `server`:
   - `npx prisma db push` (Cập nhật schema)
   - `npx prisma generate` (Cập nhật client)
   - `npm run db:seed` (Reset dữ liệu test chuẩn)
2. **Dữ liệu giả (Mock data):** 
   * File chuẩn quản lý dữ liệu gốc nằm ở `server/prisma/seed.ts` (10 phòng, 40 giường, 20 sinh viên test). Đừng tự ý gõ SQL tay xóa dữ liệu.
3. **Form Input (Tiền tệ):** 
   * Các form nhập tiền như `Giá phòng` hiện đã được format bằng Text tự động thêm hàng nghìn (1.500.000) nhưng khi lưu xuống DB hoặc state (`formData.pricePerMonth`) thì vẫn được ép về kiểu số `Number`. Đừng để nhầm lẫn kiểu dữ liệu khi làm các form thanh toán tiền Điện/Nước sau này.
4. **Mở rộng (Scalability):** 
   * Sau này khi code các tính năng như "Sửa chữa (Maintenance)", nếu set trạng thái Giường thành "Bảo trì" thì nhớ update luôn logic không cho sinh viên đặt cái giường bị hỏng đó nhé.
