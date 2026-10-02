# Lịch sử phát triển

## 0.4.1 — 03/10/2026

- Đọc sản phẩm của đơn “Nhiều sản phẩm” từ bảng nổi khi rê chuột, không mở cửa sổ chi tiết từng đơn.
- Giảm thời gian chờ cuộn bảng và cập nhật tiến độ theo mỗi 10 đơn để quét nhanh hơn.

## 0.4.0 — 03/10/2026

- Chia popup thành hai mục **Pancake** và **POS Cake**, giữ nguyên năm công tắc Pancake.
- Thêm chức năng phân nhóm đơn POS theo thành phần đóng gói và số kg từng loại; đọc chi tiết những đơn hiện “Nhiều sản phẩm”.
- Hiển thị mã đơn theo nhóm, chọn nhóm để in, rồi gọi chức năng in hàng loạt gốc của POS. Bỏ qua đơn không đọc đủ và chặn in khi quét thiếu đơn so với bộ lọc.

## 0.3.0 — 27/09/2026

- Thêm công tắc **Tự điều chỉnh giá Miến Sâm**. Sau khi người dùng tích Miễn phí giao hàng, cộng kg theo tên và số lượng của toàn bộ sản phẩm Miến Sâm, đối chiếu mốc 1–6kg và 10kg, rồi điền chênh lệch vào Giảm giá nếu tổng tiền cao hơn bảng giá.
- Bỏ qua 7–9kg, khối lượng không có mốc giá, dữ liệu thiếu và đơn có sản phẩm khác. Chờ giao diện xác nhận tổng cuối trước khi luồng tự tạo đơn tiếp tục.
- Thêm `pricing.js` và `pricing.test.js` để kiểm tra phép tính tách khỏi thao tác DOM.

## 0.2.0 — 26/09/2026

- Đổi tên extension và popup thành **Pancake Assistant Pro**, đặt mô tả Chrome là **DEV: Bố Hoàng No1**.
- Viết lại `README.md`, thêm `PROJECT_HANDOFF.md` và `AGENTS.md` để chuyển máy hoặc bàn giao cho người phát triển/AI khác.

## 0.1.0 — các tính năng đã xây dựng trước đó

1. Tạo extension Chrome Manifest V3 từ thư mục trống, có popup và công tắc **Hỗ trợ lên đơn**. Khi chọn hội thoại, extension mở **Tạo mới**, bấm ô **Địa chỉ** và chọn gợi ý đầu tiên nếu có.
2. Thêm chế độ **Kiểm tra giao diện** để ghi nhận cấu trúc bốn phần tử người dùng bấm. Dữ liệu ghi nhận giúp thay bộ đoán vị trí bằng các class thực tế của Pancake.
3. Thêm **Tự điền ghi chú in**: đọc tên, số lượng sản phẩm; nhân quy cách `kg/g`, cộng cùng loại và điền tóm tắt. Bổ sung bài kiểm tra bằng Node.
4. Thêm công tắc **Tự tạo đơn** sau khi đã lưu ghi chú in và công tắc **Chuẩn hóa tag sau tạo đơn** cho cả thao tác tạo đơn tự động lẫn thủ công.
5. Sửa luồng tag sau kiểm tra thực tế: nút **Tạo đơn** ở `.box-footer` thay vì `.view-order`; đơn mới xuất hiện trong `.recent-orders` mà không nhất thiết có tin nhắn mới. Đã xác nhận thao tác chỉ giữ **Đã Lên Đơn** và **Đã Gửi** trên một hội thoại có đơn mới.

Các bộ chọn DOM, giới hạn và hướng kiểm thử được ghi trong `PROJECT_HANDOFF.md`.
