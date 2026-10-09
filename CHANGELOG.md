# Lịch sử phát triển

## 0.6.0 — 09/10/2026

- Thêm chọn tab và đọc hội thoại Pancake vào bản xem trước trên trang AI.
- Đối chiếu DOM thật: .media-current-customer/.media-current-user và .media-body .message-text-ele.
- Lọc thông tin liên hệ/địa chỉ thường gặp tại máy; chỉ gửi khi người dùng bấm Phân tích.
- Kiểm tra cùng dòng hội thoại và chữ ký tin nhắn trước/sau AI, bỏ kết quả khi dữ liệu đổi. Chưa điền hoặc tạo đơn.

## 0.5.1 — 09/10/2026

- Sửa kiểm tra kết nối AI: dùng POST JSON cho status/models để Chrome gửi Origin nhất quán như luồng đăng nhập.
- Giữ kiểm tra Host và đúng origin extension; không cho yêu cầu thiếu Origin đi qua.
- Thông báo ID không khớp hướng dẫn khởi động lại helper với lệnh hiện tại.

## 0.5.0 — 09/10/2026

- Thêm trang Kết nối ChatGPT / Thử AI, model lấy từ tài khoản và phân tích chat mẫu bằng Responses streaming.
- Thêm chương trình Node loopback nhận OAuth chính thức với PKCE/state/nonce và kiểm tra chữ ký ID token. Token chỉ trong bộ nhớ, không dùng cookie hay API key tính phí.
- Thêm quyền localhost cho trang kết nối. Chưa nối đọc chat Pancake hay tự tạo đơn; cần đăng nhập và kiểm chứng tài khoản thật.
- Thêm kiểm tra OAuth, chữ ký token, SSE và giới hạn truy cập localhost.

## 0.4.5 — 09/10/2026

- Thêm công tắc AI tự lên đơn — Beta ở mục Pancake, mặc định tắt và lưu trạng thái riêng.
- Hiển thị rõ chưa kết nối AI; chưa đọc chat hay tạo đơn từ chat.
- Thêm AI_BETA_PLAN.md để bàn giao đánh giá và lộ trình tích hợp AI miễn phí.

## 0.4.4 — 09/10/2026

- Thêm nút Clear trên bảng POS để bỏ chọn nhóm do extension chọn và xóa kết quả phân nhóm.
- Nút Chọn nhóm để in chuyển màu xám sau khi chọn thành công; vẫn bấm lại được. Clear/quét lại xóa dấu màu xám.

## 0.4.3 — 09/10/2026

- Chờ thay đổi DOM bằng MutationObserver để chọn địa chỉ, mở/lưu ghi chú, xác nhận giá và đổi tag ngay khi giao diện sẵn sàng, thay cho nhịp kiểm tra cố định. Bộ theo dõi được thu hồi khi hoàn tất, hủy hoặc hết hạn.
- Chọn gợi ý địa chỉ hợp lệ đầu tiên theo thứ tự hiển thị, không duyệt và sắp xếp cả danh sách.
- Phục hồi tab Tạo mới ngay khi Pancake trả về Thông tin; thao tác thủ công trong form, tạo đơn hoặc bật ghi nhận sẽ hủy việc mở form còn chờ.
- Kiểm tra lại hội thoại và sản phẩm trước khi ghi chú để không điền dữ liệu cũ khi người dùng đổi giữa chừng.
- Thêm môi trường kiểm thử Chrome cục bộ trong `tests/`, dùng các file extension thật với dữ liệu mô phỏng.

## 0.4.2 — 08/10/2026

- Khắc phục luồng giá, tự tạo đơn và tag bị dừng khi Pancake bỏ `id` trên dòng hội thoại.
- Kiểm tra lại tab sau khi mở Tạo mới; nếu Pancake chuyển về Thông tin trong lúc đổi hội thoại, mở lại một lần.
- Chế độ Kiểm tra giao diện không tự tắt công tắc Hỗ trợ lên đơn.

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
