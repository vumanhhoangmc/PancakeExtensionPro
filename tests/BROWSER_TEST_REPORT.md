# Kiểm thử Pancake Assistant Pro 0.4.3 — 09/10/2026

## Trên Pancake đang đăng nhập trong Chrome

- Đối chiếu dòng hội thoại `.conversation-list-item`, tab Tạo mới, ô địa chỉ, checkbox Miễn phí giao hàng, phần ghi chú và nút Tạo đơn.
- Bấm hội thoại khác: tự mở Tạo mới và chọn địa chỉ có sẵn.
- Đổi nhanh hai hội thoại liên tiếp: cuối cùng đúng hội thoại được chọn, tab Tạo mới và địa chỉ đã điền.
- Không có lỗi JavaScript được ghi nhận trong lượt kiểm tra. Trả lại hội thoại ban đầu và tab Thông tin khi kết thúc.
- Không tạo đơn thật và không sửa tag trên tài khoản. Mã 0.4.3 được kiểm tra trên môi trường cục bộ; cần tải lại extension và tab để áp dụng vào Pancake thật.

## Trên Chrome với DOM mô phỏng

Chạy `node tests/serve.cjs`, mở `http://127.0.0.1:8765/multi_pages`. Fixture nạp trực tiếp các file `content.js`, `product-summary.js`, `pricing.js` đang phát triển. DOM dựa trên bộ chọn đã xác nhận ở Pancake; `chrome.storage`, cập nhật form, phản hồi tạo đơn và tag dùng dữ liệu giả.

Kết quả cuối: **15/15 đạt**, **0 MutationObserver của extension còn hoạt động**. Không có tài khoản hoặc dữ liệu khách được đưa vào fixture.

| Trường hợp | Kết quả |
| --- | --- |
| 1kg nhỏ + 2kg to, tổng 240.000đ | Giảm 20.000đ, ghi chú đúng, tạo 1 đơn, chỉ giữ Đã Lên Đơn + Đã Gửi |
| Tắt tự tạo đơn, sau đó bấm tạo thủ công | Chỉ điền ghi chú; tag đổi sau khi có đơn mới |
| Đơn có sản phẩm khác | Không chỉnh giá |
| Tổng 7kg | Không chỉnh giá |
| Tổng thấp hơn giá mốc | Giữ mức giảm hiện có |
| Tắt ghi chú và giá | Không sửa form |
| Đổi hội thoại khi đang chờ địa chỉ | Chỉ chọn địa chỉ cho hội thoại cuối |
| Pancake trả tab về Thông tin | Mở lại Tạo mới khi thấy DOM thay đổi |
| Bật ghi nhận giữa chừng | Hủy mở form còn chờ |
| Tắt Hỗ trợ lên đơn giữa chừng | Hủy mở form còn chờ |
| Đổi sản phẩm khi đang mở ghi chú | Không điền tóm tắt cũ hoặc tạo đơn |
| Bỏ miễn phí giao hàng giữa chừng | Hủy ghi chú/tạo đơn |
| Đổi hội thoại khi đang lưu ghi chú | Không tạo đơn |
| Tạo đơn thất bại | Không sửa tag |
| Không có gợi ý địa chỉ | Không đoán địa chỉ, dọn bộ theo dõi sau hết hạn |

Kiểm tra bổ sung bằng click thật trong Chrome (`event.isTrusted`): bấm Thông tin trong lúc địa chỉ còn chờ; extension không chọn địa chỉ hoặc mở lại Tạo mới. **Đạt**.

Lượt cuối, luồng giá → ghi chú → đơn mô phỏng → tag hoàn tất trong 169 ms. Đây là thời gian trên fixture với độ trễ được đặt sẵn, không phải cam kết tốc độ trên máy chủ Pancake.

Ảnh bằng chứng: [Kết quả Chrome](artifacts/pancake-browser-tests-2026-10-09.png).

## Kiểm tra mã

- `node --check content.js`, `node --check popup.js`, `node --check tests/pancake-fixture.js`: đạt.
- `node --test product-summary.test.js pricing.test.js pos-groups.test.js`: 12/12 đạt.
- `git diff --check`: đạt (chỉ có thông báo đổi LF/CRLF của Git).

## Giới hạn

Fixture kiểm tra thứ tự thao tác, hủy tác vụ và phép tính; không mô phỏng toàn bộ React hoặc máy chủ Pancake. Khi Pancake thay giao diện, phải kiểm tra lại bộ chọn và cách ô nhập nhận sự kiện trên trang đăng nhập. Không dùng fixture làm lý do bỏ qua xác nhận trạng thái thực tế trước tự tạo đơn.
