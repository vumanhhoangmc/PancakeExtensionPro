# Ghi chú cho AI tiếp quản

Đọc `PROJECT_HANDOFF.md` trước khi sửa mã; `README.md` dành cho người dùng. Đây là extension Chrome Manifest V3 không có build step. Các file hoạt động chính là `content.js`, `product-summary.js`, `popup.js` và `manifest.json`.

Giữ bốn tính năng có công tắc riêng. Extension **không tự tích Miễn phí giao hàng**. Nút Tạo đơn nằm trong `.crm-platform .box-footer`, ngoài `.view-order`. Tín hiệu đơn mới đáng tin cậy là ID mới trong `.crm-platform .recent-orders`; đừng chỉ chờ tin nhắn chat. Tag đang tích có `.ellipse`; sau tạo đơn chỉ giữ **Đã Lên Đơn** và **Đã Gửi**.

Kiểm tra cú pháp bằng `node --check content.js` và `node --check popup.js`; kiểm tra phép tính bằng `node --test product-summary.test.js`. Đối chiếu bộ chọn trên giao diện Pancake đang đăng nhập trước khi sửa luồng DOM. Không tạo đơn thật chỉ để thử mã. Cập nhật `README.md` và `PROJECT_HANDOFF.md` khi thay đổi hành vi.
