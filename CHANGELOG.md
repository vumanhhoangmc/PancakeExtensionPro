# Lịch sử phát triển

## 0.9.3 — 13/10/2026

- Sửa lỗi không mở hộp nhắn riêng sau gửi comment: đọc innerText để nhận đúng comment hai dòng có thẻ br.
- Dùng nút nhắn riêng của comment khách mở đúng hộp Alt+B, rồi điền '/'; bỏ shortcut giả lập.
- 19 kiểm thử Node đạt; Chrome fixture với br đạt; đối chiếu nút mở modal trên Pancake thật, không gửi comment thật.

## 0.9.2 — 13/10/2026

- Khi người dùng bấm Gửi comment và thấy comment mới xuất hiện, tự mở Alt+B và điền '/' vào khung nhắn riêng.
- Không tự gửi tin riêng; giữ nháp riêng có sẵn và hủy khi người dùng chuyển hội thoại/thao tác.
- Sửa khoảng cách từng mục popup, chiều cao mô tả và vị trí công tắc.
- 11 kiểm thử comment/followup Node, luồng Chrome mô phỏng và bố cục 7 mục đạt. Đối chiếu Alt+B và ô nhập trên Pancake thật, không gửi tin thật.

## 0.9.1 — 13/10/2026

- Bỏ nhận diện theo SVG; xác nhận bằng khóa list_tags_conv và ID message cùng khóa có class comment-message-ele trong vùng chat.
- Không phụ thuộc row DOM giữ nguyên hoặc comment đổi nội dung; hỗ trợ React thay node/tái dùng root.
- 7 ca Node và 4 tình huống Chrome mô phỏng đạt; đối chiếu khóa comment/inbox trên giao diện thật.

## 0.9.0 — 13/10/2026

- Thêm công tắc Hỗ trợ trả lời comment, mặc định tắt.
- Khi mở hội thoại comment, điền mẫu hai dòng vào ô trả lời trống; không tự gửi.
- Bỏ qua Messenger và draft có sẵn; hủy khi thao tác tay, đổi hội thoại, tắt công tắc hoặc ghi nhận UI.
- Đối chiếu DOM comment thật, 6 ca Node và 3 tình huống Chrome mô phỏng đạt.

## 0.8.2 — 12/10/2026

- Gỡ Dark mode theo yêu cầu người dùng: công tắc, content script, CSS và fixture riêng.
- Tải lại extension và tab Pancake để bỏ giao diện tối đã nạp từ phiên bản trước.

## 0.8.1 — 12/10/2026

- Làm lại palette theo pixel ảnh Facebook: chat #242526, input #333334, tin khách #303030, tin shop #1a5ff7.
- Sửa thẻ đính kèm xanh nhạt, viền trắng và header navy còn sót; tăng khả năng đọc icon tối.
- Thanh tag và nhãn hội thoại dùng màu xám dịu; tag đã chọn phân biệt bằng xanh xám và dấu chọn gốc.
- Tắt dark mode gỡ cả marker border; không sửa dữ liệu đơn/tag.

## 0.8.0 — 12/10/2026

- Thêm Dark mode trong mục Pancake, mặc định tắt và lưu lựa chọn riêng.
- Nền xám tối, chữ sáng, bong bóng shop xanh theo phong cách Facebook; hỗ trợ ô nhập và bảng nổi mới xuất hiện.
- Giữ ảnh/video và màu tag; tắt khôi phục giao diện sáng, không đổi dữ liệu form. CSS không áp dụng bản in hoặc POS Cake.
- Đối chiếu selector trên Pancake thật; kiểm tra bật/tắt và bảng động bằng fixture Chrome. Reload extension/tab Pancake để nạp bản mới.

## 0.7.4 — 12/10/2026

- Chờ danh mục và đúng SKU theo trạng thái DOM khi mạng/giao diện tải chậm; bỏ chờ cố định lúc chọn SKU.
- Nếu AI nhận hệ cũ nhưng thiếu địa danh, đối chiếu lại cùng tên tỉnh/xã ở hệ mới; chỉ chọn tên khớp duy nhất, dừng khi trùng.
- Kết quả điền hiển thị hệ địa chỉ thực tế; địa chỉ không có số nhà không chèn null hoặc dấu phẩy thừa.
- 38/38 Node, 12/12 AI DOM Chrome, 15/15 Pancake cũ Chrome đạt. Đối chiếu địa chỉ và SKU/số lượng trên form thật; đã dọn dòng thử, không tạo đơn thật.
- Reload extension/Pancake/trang AI; giữ helper và phiên đăng nhập. Báo cáo: docs/TEST_REPORT_2026-10-12.md.

## 0.7.3 — 12/10/2026

- Địa chỉ cũ cần tỉnh/huyện/xã, mới cần tỉnh/xã; số nhà/đường không còn bắt buộc, bỏ huyện dư ở hệ mới.
- Bỏ yêu cầu tên hành chính nguyên văn trong chat để chấp nhận AI chuẩn hóa viết tắt như tphcm. Vẫn đối chiếu danh mục Pancake khi điền.
- Thêm hồi quy địa chỉ trong ảnh và các trường hợp thiếu cấp; 38 ca Node đạt. Giữ helper và phiên đăng nhập.

## 0.7.2 — 10/10/2026

- Nhận tên Cam Rốn Lồi Không Hạt Mộc Châu và tiền tố năm `(2026 )`; kiểm thử tên Miến Sợi Nhỏ thiếu chữ Sâm theo danh mục người dùng.
- Sửa đọc hai nhãn mã: lấy riêng mã mẫu mã, tránh tìm từ khóa sai `MSS 02MSS02`.
- Danh mục mô phỏng dùng đủ tên/quy cách người dùng cung cấp, thêm hai ca Chrome cho hai nhãn mã và khoảng trắng năm. Không cố định SKU theo một shop.
- Reload extension/Pancake/trang AI; giữ helper và đăng nhập.

## 0.7.1 — 10/10/2026

- Sửa dừng ở bảng tìm khoai: nhận tên Khoai Sọ Mán Mộc Châu đúng như danh mục shop, dùng alias chính xác để không lẫn sản phẩm/combo khác.
- Đối chiếu DOM catalog và tìm theo mã KH2 trên Pancake; thêm hồi quy KH1/KH2, số lượng 3/5/6/10kg và từ chối quy cách 4kg không có.
- Fixture dùng tên khoai thật. Chỉ cần reload extension/Pancake/trang AI; helper 0.7.0 và đăng nhập giữ nguyên.

## 0.7.0 — 10/10/2026

- AI nhận diện địa chỉ giao hàng mới nhất cùng sản phẩm/kg, yêu cầu bằng chứng và giữ trường thiếu để xem lại.
- Thêm lựa chọn đọc địa chỉ trong preview và nút Điền đơn trên Pancake; SĐT dùng điền chỉ giữ tại máy.
- Đối chiếu tỉnh/huyện/xã old/new và SKU theo danh mục shop; miến tìm 2026, cam → Cam rốn lồi, khoai sọ → Khoai sọ mán.
- Form có sản phẩm/SKU trùng/dữ liệu thiếu bị từ chối, hủy khi đổi hội thoại/tin/Beta hoặc thao tác tay; kết quả đã dùng không retry.
- Giữ bước tích Miễn phí giao hàng bằng tay và công tắc tạo đơn hiện có. Adapter AI chỉ điền nháp.
- Đối chiếu DOM thật, thêm kiểm thử schema/mapping/race và 6 ca Chrome mô phỏng. Lượt extension thật cần người dùng kiểm chứng vì tool chặn chrome-extension://.

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
