# Pancake Assistant Pro

**Mô tả trên Chrome:** DEV: Bố Hoàng No1

Extension Chrome hỗ trợ lên đơn trên trang Hội thoại `https://pancake.vn/multi_pages`. Dự án dùng Manifest V3, JavaScript thuần và CSS; không cần cài thư viện hay chạy bước build.

## Cài trên máy khác

1. Sao chép **toàn bộ thư mục dự án** sang máy mới, giữ nguyên các file cùng cấp với `manifest.json`.
2. Mở Chrome tại `chrome://extensions`, bật **Chế độ dành cho nhà phát triển**.
3. Bấm **Tải tiện ích đã giải nén** và chọn thư mục chứa `manifest.json`.
4. Mở hoặc tải lại tab `https://pancake.vn/multi_pages`, đăng nhập Pancake bằng tài khoản của bạn, rồi mở popup **Pancake Assistant Pro** để chọn các công tắc.

Sau khi chỉnh mã, bấm nút tải lại của extension tại `chrome://extensions`, rồi tải lại tab Pancake. Các công tắc được lưu bằng `chrome.storage.local` theo từng hồ sơ Chrome; sao chép thư mục **không** mang theo trạng thái công tắc hay phiên đăng nhập. Không cần và không nên chép cookie vào dự án.

Nếu chuyển bằng Git thay vì sao chép thư mục, hãy commit và đẩy các file dự án trước khi clone ở máy mới. Repository tại thời điểm viết tài liệu **chưa có commit**, nên clone trực tiếp sẽ chưa mang theo mã nguồn.

## Các công tắc

| Công tắc | Mặc định | Hoạt động |
| --- | --- | --- |
| Hỗ trợ lên đơn | Bật | Khi bấm một hội thoại, mở **Tạo mới**, bấm **Địa chỉ**, chọn gợi ý đầu tiên nếu có. |
| Tự điền ghi chú in | Bật | Khi **bạn** tích **Miễn phí giao hàng**, đọc sản phẩm, nhân quy cách với số lượng và điền tóm tắt vào **Ghi chú in**. |
| Tự điều chỉnh giá Miến Sâm | Tắt | Khi **bạn** tích **Miễn phí giao hàng**, nếu mọi sản phẩm đều là Miến Sâm và tổng kg có trong bảng giá, điền mức chênh lệch vào **Giảm giá** khi tổng tiền lớn hơn giá mốc. |
| Tự tạo đơn | Tắt | Sau bước trên, bấm **Lưu** ghi chú, chờ trình soạn đóng, rồi bấm **Tạo đơn**. Chỉ hoạt động khi **Tự điền ghi chú in** cũng bật. |
| Chuẩn hóa tag sau tạo đơn | Tắt | Sau lần bấm **Tạo đơn** tự động hoặc thủ công, đợi Pancake xác nhận có đơn mới, rồi chỉ giữ **Đã Lên Đơn** và **Đã Gửi**. |

Extension **không tự tích Miễn phí giao hàng**. Khi **Tự tạo đơn** tắt, bạn tự xem lại, lưu ghi chú và tạo đơn. Khi **Chuẩn hóa tag** tắt, extension không sửa tag.

### Bảng giá Miến Sâm

| Tổng kg | Giá |
| --- | ---: |
| 1kg | 95.000đ |
| 2kg | 160.000đ |
| 3kg | 220.000đ |
| 4kg | 280.000đ |
| 5kg | 350.000đ |
| 6kg | 420.000đ |
| 10kg | 600.000đ |

Extension đọc quy cách từ tên từng sản phẩm, nhân với số lượng rồi cộng tổng kg, không phân biệt sợi to hay nhỏ. Tên **Miến Sợi Nhỏ/To** cũng được tính vì trên Pancake có biến thể này thiếu chữ “Sâm”; các loại miến khác không được tính. Ví dụ 3kg có **Tổng giá trị đơn hàng** 240.000đ sẽ nhập **Giảm giá** 20.000đ để tổng cuối là 220.000đ. Mức giảm được nhập là số tiền tuyệt đối, không cộng dồn qua các lần chạy. Nếu tổng tiền đã bằng hoặc thấp hơn giá mốc, extension không chỉnh giảm giá. Đơn có sản phẩm khác, thiếu quy cách hoặc tổng 7–9kg sẽ được bỏ qua; các khối lượng không có trong bảng cũng vậy. Công tắc này hoạt động độc lập với **Tự điền ghi chú in**; nếu đang bật **Tự tạo đơn** mà việc điền giá đủ điều kiện không được xác nhận trên giao diện, extension sẽ không tự bấm **Tạo đơn**.

### Ví dụ ghi chú

- `(2026) 1KG Miến Sâm Sợi Nhỏ` số lượng 1 → `1kg miến sâm nhỏ`.
- `1Kg Miến Sâm Sợi To` số lượng 2 → `2kg miến sâm to`.
- `(2026) 2KG Miến Sâm Sợi To` số lượng 2 → `4kg miến sâm to`.
- Các dòng cùng loại được cộng lại; ví dụ hai dòng sợi to trên → `6kg miến sâm to`.

Extension lấy quy cách từ **tên sản phẩm**, không lấy dòng khối lượng phụ trên Pancake: sản phẩm mang tên `2KG` từng hiển thị `1000 g` ở dòng phụ. Sản phẩm không có quy cách `kg/g` trong tên được ghi dưới dạng `số lượng x tên sản phẩm`. Ghi chú có sẵn không phải tóm tắt khối lượng được giữ và nối thêm bằng ` | `.

## Kiểm tra nhanh

Chạy `node --test product-summary.test.js pricing.test.js` để kiểm tra phép tính khối lượng và bảng giá. Có thể chạy `node --check content.js` và `node --check popup.js` để kiểm tra cú pháp. Kiểm thử luồng tạo đơn và tag trên một hội thoại thử nghiệm; nút **Tạo đơn** có tác dụng thật trên Pancake.

## Dành cho người phát triển hoặc AI tiếp theo

Đọc [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) để nắm luồng xử lý, bộ chọn DOM đã xác nhận trực tiếp, nguyên nhân các lỗi đã sửa và cách mở rộng. [AGENTS.md](AGENTS.md) là bản hướng dẫn ngắn cho tác nhân AI mới.
Lịch sử các mốc phát triển nằm trong [CHANGELOG.md](CHANGELOG.md).
