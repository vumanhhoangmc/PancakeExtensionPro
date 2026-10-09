# Pancake Assistant Pro

**Mô tả trên Chrome:** DEV: Bố Hoàng No1

Extension Chrome hỗ trợ lên đơn trên trang Hội thoại `https://pancake.vn/multi_pages` và phân nhóm đơn để in trên POS Cake `https://pos.pancake.vn/shop/.../order`. Dự án dùng Manifest V3, JavaScript thuần và CSS; không cần cài thư viện hay chạy bước build.

## Cài trên máy khác

1. Sao chép **toàn bộ thư mục dự án** sang máy mới, giữ nguyên các file cùng cấp với `manifest.json`.
2. Mở Chrome tại `chrome://extensions`, bật **Chế độ dành cho nhà phát triển**.
3. Bấm **Tải tiện ích đã giải nén** và chọn thư mục chứa `manifest.json`.
4. Mở hoặc tải lại tab Pancake và POS Cake, đăng nhập bằng tài khoản của bạn, rồi mở popup **Pancake Assistant Pro** để chọn các công tắc.

Sau khi chỉnh mã, bấm nút tải lại của extension tại `chrome://extensions`, rồi tải lại các tab Pancake/POS Cake đang dùng. Các công tắc được lưu bằng `chrome.storage.local` theo từng hồ sơ Chrome; sao chép thư mục **không** mang theo trạng thái công tắc hay phiên đăng nhập. Không cần và không nên chép cookie vào dự án.

Nếu chuyển bằng Git thay vì sao chép thư mục, hãy commit và đẩy các file dự án trước khi clone ở máy mới. Repository tại thời điểm viết tài liệu **chưa có commit**, nên clone trực tiếp sẽ chưa mang theo mã nguồn.

## Giao diện hai mục

Popup có mục **Pancake** cho năm tính năng lên đơn hiện có và công tắc **AI tự lên đơn — Beta**, cùng mục **POS Cake** cho tính năng phân nhóm đơn để in. Khi mở popup trên trang Đơn hàng POS, mục POS Cake được chọn sẵn.

### AI tự lên đơn — Beta (0.5.0)

**0.6.0 — thử hội thoại thật:** tải lại extension và tab Pancake, mở hội thoại cần thử rồi vào **Kết nối ChatGPT / Thử AI**. Chọn tab Pancake và bấm **Đọc hội thoại Pancake đang mở**. Xem lại văn bản, xóa dữ liệu riêng còn sót rồi bấm **Phân tích bằng ChatGPT**. Chỉ gửi bản xem trước khi bạn bấm nút phân tích; đọc chat chưa gọi AI. Không điền sản phẩm/tạo đơn/gửi tin cho khách. Không cần khởi động lại helper nếu đang dùng 0.5.1.

Phần đọc giữ thứ tự tin và vai trò khách/shop, ẩn số điện thoại, email, link và dòng địa chỉ thường gặp; bộ lọc không bảo đảm xóa mọi thông tin riêng nên phải kiểm tra bản xem trước. Chỉ đọc lịch sử đang tải trong DOM, không tự kéo lịch sử, không đọc ảnh/voice. Nếu đổi hội thoại hoặc có tin thay đổi trong lúc thử, kết quả bị bỏ và yêu cầu đọc lại. Hội thoại dài hơn 8.000 ký tự không tự cắt mất ngữ cảnh; có thể chọn phần mua hàng để nhập mẫu. Sau phân tích hãy so kết quả với chat thật: loại to/nhỏ, tổng kg, khách chốt/hủy/hỏi giá. Chưa có đối chiếu SKU hoặc cơ chế tránh đơn trùng nên kết quả chỉ là đề xuất.

Bản sửa 0.5.1: nếu từng thấy “Chỉ extension đã cấu hình được truy cập” sau đăng nhập, tải lại extension, đóng/mở lại trang Kết nối AI, dừng helper Node bằng Ctrl+C rồi chạy lại lệnh ở bước 1. Đăng nhập lại vì token chỉ ở bộ nhớ. Yêu cầu kiểm tra kết nối nay dùng POST để tránh thiếu header Origin trên GET; đúng ID extension vẫn được kiểm tra.

Công tắc mặc định **tắt**, lưu riêng theo hồ sơ Chrome. Bản 0.5.0 có kết nối **Sign in with ChatGPT** để thử dùng hạn mức Plus/Pro của tài khoản đủ điều kiện. Hiện chỉ phân tích **chat mẫu bạn nhập**, trả loại sản phẩm, tổng kg, ý định mua/hủy/hỏi giá; chưa đọc hội thoại Pancake, chọn SKU hoặc tạo đơn tự động.

1. Tải lại extension, mở popup → **Kết nối ChatGPT / Thử AI**.
2. Trang kết nối hiện lệnh `node ai-bridge.cjs <ID-extension-của-bạn>`. Sao chép và chạy trong terminal tại thư mục dự án; cần Node.js 22 trở lên. Giữ chương trình chạy khi dùng AI.
3. Bấm **Continue with ChatGPT**, đăng nhập tại trang OpenAI và cấp quyền dùng hạn mức gói. Không gửi cookie, mật khẩu hay API key cho AI phát triển.
4. Quay lại trang kết nối, bấm **Kiểm tra kết nối**, chọn model từ tài khoản.
5. Bật công tắc Beta trong popup; nhập chat mẫu đã ẩn danh rồi bấm **Phân tích bằng ChatGPT**. Nội dung này sẽ được gửi tới OpenAI, có thể dùng hạn mức Plus. Kết quả chỉ là đề xuất để kiểm chứng khả năng nhận diện.

Chương trình kết nối chạy trên `127.0.0.1:18765`, chỉ cho ID extension bạn truyền vào truy cập. Token chỉ giữ trong bộ nhớ, không lưu vào dự án; dừng chương trình hoặc hết hạn phiên phải đăng nhập lại. Ngắt kết nối xóa phiên tại máy, không thu hồi quyền đã cấp trên tài khoản OpenAI. Muốn thu hồi hoàn toàn, dùng cài đặt quyền ứng dụng ChatGPT. Không có cơ chế tự chuyển sang API tính phí. Khi hết hạn mức/không có quyền/model, hiển thị lỗi và dừng phân tích. Đăng nhập và phân tích bằng tài khoản thật cần được kiểm chứng sau khi bạn cấp quyền.

Phân tích và lộ trình tiếp theo nằm trong [AI_BETA_PLAN.md](AI_BETA_PLAN.md).

## Các công tắc Pancake

| Công tắc | Mặc định | Hoạt động |
| --- | --- | --- |
| Hỗ trợ lên đơn | Bật | Khi bấm một hội thoại, mở **Tạo mới**, bấm **Địa chỉ**, chọn gợi ý đầu tiên nếu có. |
| Tự điền ghi chú in | Bật | Khi **bạn** tích **Miễn phí giao hàng**, đọc sản phẩm, nhân quy cách với số lượng và điền tóm tắt vào **Ghi chú in**. |
| Tự điều chỉnh giá Miến Sâm | Tắt | Khi **bạn** tích **Miễn phí giao hàng**, nếu mọi sản phẩm đều là Miến Sâm và tổng kg có trong bảng giá, điền mức chênh lệch vào **Giảm giá** khi tổng tiền lớn hơn giá mốc. |
| Tự tạo đơn | Tắt | Sau bước trên, bấm **Lưu** ghi chú, chờ trình soạn đóng, rồi bấm **Tạo đơn**. Chỉ hoạt động khi **Tự điền ghi chú in** cũng bật. |
| Chuẩn hóa tag sau tạo đơn | Tắt | Sau lần bấm **Tạo đơn** tự động hoặc thủ công, đợi Pancake xác nhận có đơn mới, rồi chỉ giữ **Đã Lên Đơn** và **Đã Gửi**. |

Extension **không tự tích Miễn phí giao hàng**. Khi **Tự tạo đơn** tắt, bạn tự xem lại, lưu ghi chú và tạo đơn. Khi **Chuẩn hóa tag** tắt, extension không sửa tag.

Bản 0.4.2 tiếp tục nhận diện đúng hội thoại khi Pancake không còn gắn `id` lên dòng hội thoại; bước điều chỉnh giá và tự tạo đơn không bị dừng sớm vì thiếu `id`. Nếu Pancake trả tab về **Thông tin** trong lúc đổi hội thoại, extension kiểm tra và mở lại **Tạo mới** một lần.

Bản 0.4.3 phản ứng ngay khi giao diện sẵn sàng để giảm thời gian chờ giữa các bước. Khi bạn thao tác thủ công trong form hoặc bấm Tạo đơn, extension hủy thao tác mở form/chọn địa chỉ còn chờ. Ghi chú cũng được kiểm tra lại theo hội thoại và sản phẩm hiện tại trước khi điền.

Trong **Kiểm tra giao diện**, việc ghi nhận tạm dừng các thao tác tự động cho đến khi đủ 4 lần bấm hoặc bạn bấm **Dừng ghi nhận**. Bắt đầu ghi nhận không thay đổi các công tắc tính năng đã chọn.

## Phân nhóm đơn trên POS Cake

Nút **Clear** xóa kết quả phân nhóm và bỏ chọn các đơn do extension đã chọn trong bộ lọc hiện tại. Nếu còn đơn được chọn thủ công trên POS, hãy bỏ chọn trước khi quét lại. Sau khi **Chọn nhóm để in** thành công, nút của nhóm đó chuyển màu xám để đánh dấu đã thao tác; vẫn có thể bấm lại để chọn lại nhóm. Màu xám được giữ đến khi Clear hoặc quét lại.

1. Trên trang **Đơn hàng** của POS Cake, đặt bộ lọc đơn cần in (ví dụ **Chưa in**).
2. Trong popup, mở mục **POS Cake** và bật **Phân nhóm đơn để in**.
3. Bấm nút **Phân nhóm đơn** ở góc dưới phải của trang POS, rồi bấm **Quét và phân nhóm**. Extension cuộn danh sách trong bộ lọc hiện tại; với đơn có “Nhiều sản phẩm”, nó đọc bảng nổi chứa đầy đủ tên và số lượng như khi rê chuột vào ô này. Không cần mở cửa sổ chi tiết từng đơn nên quét nhanh hơn. Quá trình này chỉ đọc đơn, không lưu hay đổi trạng thái.
4. Chọn một nhóm, kiểm tra mã đơn, rồi bấm **In nhóm bằng POS**. Extension dùng chức năng in hàng loạt của POS để in **phiếu gốc của từng đơn** trong nhóm. Lặp lại cho các nhóm khác. POS có thể mở bước xác nhận hoặc hộp thoại máy in theo cấu hình in của bạn.

Nhóm được xác định theo **thành phần đóng gói**: khối lượng trong tên sản phẩm nhân với số lượng, tách riêng sợi nhỏ, sợi to và các sản phẩm khác. Chẳng hạn `2KG Miến Sâm Sợi To x 1` và `1KG Miến Sâm Sợi To x 2` cùng nhóm **2kg miến sâm to**; đơn gồm **2kg miến sâm nhỏ + 1kg miến sâm to** thành nhóm riêng. Tên `Miến Sợi Nhỏ/To` trên POS được hiểu là Miến Sâm tương ứng. Sản phẩm không có `kg/g` được gom theo tên và số lượng.

Extension không in đơn có dữ liệu sản phẩm thiếu hoặc không đọc đủ. Nếu số đơn quét được khác tổng số đơn POS báo trong bộ lọc, tính năng yêu cầu quét lại. Hãy bỏ chọn những đơn đã chọn thủ công trên POS trước khi quét. Sau khi thay bộ lọc, quét lại để có nhóm mới.

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

Chạy `node --test product-summary.test.js pricing.test.js pos-groups.test.js` để kiểm tra phép tính khối lượng, bảng giá và gom nhóm. Có thể chạy `node --check content.js`, `node --check pos-content.js` và `node --check popup.js` để kiểm tra cú pháp. Kiểm thử luồng tạo đơn và tag trên một hội thoại thử nghiệm; nút **Tạo đơn** có tác dụng thật trên Pancake.

Để thử toàn bộ luồng bằng dữ liệu mô phỏng trên Chrome, chạy `node tests/serve.cjs`, mở `http://127.0.0.1:8765/multi_pages` rồi bấm **Chạy toàn bộ kiểm thử**. Trang này dùng mã extension thật, không tạo đơn trên Pancake. Các bộ chọn vẫn cần được đối chiếu lại trên trang đăng nhập khi Pancake đổi giao diện.

## Dành cho người phát triển hoặc AI tiếp theo

Đọc [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) để nắm luồng xử lý, bộ chọn DOM đã xác nhận trực tiếp, nguyên nhân các lỗi đã sửa và cách mở rộng. [AGENTS.md](AGENTS.md) là bản hướng dẫn ngắn cho tác nhân AI mới.
Lịch sử các mốc phát triển nằm trong [CHANGELOG.md](CHANGELOG.md).
