# Bàn giao kỹ thuật — Pancake Assistant Pro

Cập nhật: 09/10/2026. Phiên bản manifest: `0.6.0`. Đây là extension Chrome Manifest V3 viết bằng JavaScript thuần, chạy trên giao diện Hội thoại Pancake và Đơn hàng POS Cake. Mỗi tính năng có công tắc riêng. Trang đích là `https://pancake.vn/multi_pages` và `https://pos.pancake.vn/shop/.../order`. Có helper Node localhost cho AI Beta; không có backend được triển khai trên mạng, build tool, API key hay cookie trong dự án.

## Cấu trúc dự án

| File | Vai trò |
| --- | --- |
| `manifest.json` | Tên, mô tả, quyền, khai báo content scripts và popup. Nạp `product-summary.js`, `pricing.js` trước `content.js`. |
| `popup.html`, `popup.css`, `popup.js` | Popup hai mục Pancake/POS Cake. Năm công tắc Pancake, công tắc AI Beta và công tắc POS; lưu lựa chọn vào `chrome.storage.local`. |
| `AI_BETA_PLAN.md` | Đánh giá, lịch sử và bước tiếp theo sau kết nối ChatGPT. |
| `ai-beta.html/js/css` | Trang đăng nhập và thử phân tích chat mẫu, không đọc chat trực tiếp. |
| `ai-bridge.cjs`, `ai-protocol.cjs`, `ai-protocol.test.cjs` | Helper OAuth localhost, parser/kiểm tra và kiểm thử bằng tài khoản mô phỏng. |
| `content.js` | Nghe sự kiện trên trang, tự động mở form, điền ghi chú, tùy chọn tạo đơn và chuẩn hóa tag. |
| `product-summary.js` | Hàm thuần `summarizeProducts(products)`; chạy trong content script và cũng xuất CommonJS để thử bằng Node. |
| `product-summary.test.js` | Kiểm tra phép nhân quy cách với số lượng, gộp sản phẩm cùng loại và xử lý dữ liệu thiếu. |
| `pricing.js` | Hàm thuần `calculateDiscount(products, orderTotal)`; bảng giá Miến Sâm và điều kiện áp dụng. |
| `pricing.test.js` | Kiểm tra giá 1–6kg và 10kg, đơn lẫn sản phẩm khác, mốc không hỗ trợ, mức giảm. |
| `pos-groups.js`, `pos-groups.test.js` | Hàm thuần gom đơn theo thành phần sản phẩm và tổng kg từng loại. |
| `pos-content.js`, `pos-content.css` | Nút nổi và bảng phân nhóm trên trang Đơn hàng POS; quét DOM, chọn nhóm và gọi nút in hàng loạt gốc của POS. |
| `README.md` | Hướng dẫn cài đặt, sử dụng và chuyển sang máy khác. |
| `AGENTS.md` | Điểm bắt đầu ngắn gọn cho AI tiếp quản dự án. |
| `tests/serve.cjs`, `tests/pancake-fixture.html`, `tests/pancake-fixture.js` | Trang kiểm thử Chrome cục bộ, dùng mã extension thật và DOM mô phỏng đã đối chiếu với Pancake. Không chứa dữ liệu khách hoặc gọi Pancake. |

Không cần `npm install`. Chrome nạp trực tiếp các file extension; Node cần cho kiểm thử và helper kết nối ChatGPT.

## AI tự lên đơn — Beta (0.6.0)

Phiên bản mới nhất 0.6.0 thêm `chat-reader.js`/`chat-content.js` trong content script Pancake. Bộ chọn đã đối chiếu trên trang đăng nhập ngày 09/10/2026: `.message-list.media-list-conversation .inbox-message-ele`, vai trò `.media-current-customer`/`.media-current-user`, văn bản `.media-body .message-text-ele`. `buildTranscript()` lọc điện thoại/email/link/dòng địa chỉ thường gặp và thông báo media/unknown; không khẳng định đầy đủ hoặc ẩn danh tuyệt đối. `collectMessages()` từ chối >8.000 ký tự, không tự cắt/cuộn. Các message `pap-read-chat`/`pap-check-chat` chỉ chấp nhận sender.id đúng extension và Beta bật; snapshot giữ row DOM + chữ ký nội dung tại máy, không ghi storage. Trang AI gửi tabs.sendMessage, cho sửa bản xem trước, kiểm tra snapshot trước và sau inference. Không đổi helper/cloud request hoặc năm luồng lên đơn cũ. Chạy thêm `node --test chat-reader.test.cjs ai-transport.test.cjs`. Tool trình duyệt bị policy chặn chrome-extension:// nên người dùng thực hiện lượt inference trực tiếp; không tuyên bố đã kiểm thử lượt đó nếu chưa có kết quả.

Phiên bản mới nhất 0.5.1: `callBridge()` luôn POST JSON, kể cả `/status` và `/models`, vì Chrome có thể không gửi Origin trên GET. Helper chấp nhận POST cho hai endpoint đọc này, vẫn giữ GET cho client cũ có Origin hợp lệ. Không mở quyền cho Origin thiếu/null/sai ID. Khi cập nhật phải khởi động lại cả helper Node và trang extension; phiên đăng nhập cũ trong bộ nhớ mất sau restart. Kiểm thử hồi quy bao gồm transport POST, preflight và giữ chặn yêu cầu sai Origin.

Manifest hiện tại 0.5.0. `aiAutoOrderBeta` (mặc định false) cho phép thử chat mẫu trong `ai-beta.html/js/css`, mở từ popup. `ai-bridge.cjs` là server Node bind 127.0.0.1:18765 nhận OAuth callback `/auth/callback` và chuyển yêu cầu tới OpenAI. Chạy với đúng ID extension; CORS/origin và Host được kiểm tra. `/login` tạo PKCE/state/nonce; callback kiểm tra chữ ký JWKS, issuer/audience/nonce/expiry và scopes. `/models` lấy `models` theo quyền tài khoản; `/analyze` yêu cầu model trong danh sách, đọc SSE tới `response.completed` rồi kiểm tra JSON sản phẩm/kg. Không dùng endpoint backend-api. Token chỉ trong bộ nhớ, không tự refresh; hết phiên đăng nhập lại. Host ID không bí mật nằm ngoài repo ở LOCALAPPDATA/PancakeAssistantPro/ai-host-id.txt. Không log token/chat.

`ai-protocol.cjs` chứa OAuth/kiểm tra token/parser SSE/parser đề xuất; `ai-protocol.test.cjs` kiểm tra các ranh giới này và server origin. Chạy `node --test ai-protocol.test.cjs product-summary.test.js pricing.test.js`. Manifest thêm localhost host permission; trang Pancake/POS không được cấp quyền đọc token. Chưa có engine đọc chat hay điền SKU/đơn. Content scripts không dùng cờ Beta; bật Beta không kích hoạt `autoSubmitOrder`. Chỉ gửi mẫu khi người dùng bấm Phân tích; trạng thái ghi rõ chưa tạo đơn. Sau tắt Beta kết quả đang về bị bỏ, nhưng request đã gửi vẫn có thể tiêu thụ hạn mức. Xem AI_BETA_PLAN.md. Giữ năm công tắc hiện tại độc lập; không tự tích Miễn phí giao hàng.

## Thiết lập và di chuyển

Sao chép cả thư mục chứa `manifest.json`, dùng **Tải tiện ích đã giải nén** tại `chrome://extensions`, rồi tải lại các tab Pancake/POS Cake. Sau mỗi lần sửa file extension, phải tải lại extension **và** tab đang dùng vì content script cũ vẫn nằm trong tab chưa tải lại. `chrome.storage.local` thuộc hồ sơ Chrome, không nằm trong thư mục dự án; công tắc trên máy mới trở về mặc định. Pancake/POS Cake cần được đăng nhập riêng trên máy mới. Không chuyển cookie cho AI hoặc lưu cookie vào mã nguồn.

Repository đã có lịch sử Git; các thay đổi đang làm có thể chưa commit. Nếu dùng Git để chuyển máy, cần commit/push toàn bộ các file cần chuyển trước; nếu không, chỉ việc sao chép nguyên thư mục dự án.

Manifest hiện yêu cầu `storage`, `activeTab` và quyền truy cập `pancake.vn`. Popup hiển thị tên **Pancake Assistant Pro**; mô tả manifest là **DEV: Bố Hoàng No1**.

## Cấu hình và luồng thực tế

| Khóa `chrome.storage.local` | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `autoOrder` | `true` | Bấm hội thoại → mở tab Tạo mới → chọn gợi ý địa chỉ đầu tiên. |
| `autoPrintNote` | `true` | Khi người dùng tích Miễn phí giao hàng → tóm tắt sản phẩm vào Ghi chú in. |
| `autoMienSamPrice` | `false` | Khi người dùng tích Miễn phí giao hàng → điều chỉnh Giảm giá cho đơn chỉ có Miến Sâm nếu tổng tiền vượt giá mốc. Hoạt động độc lập với ghi chú. |
| `autoSubmitOrder` | `false` | Sau khi ghi chú đã điền, lưu ghi chú rồi bấm Tạo đơn. Chỉ có tác dụng khi `autoPrintNote` bật. |
| `autoOrderTags` | `false` | Sau khi đơn mới được xác nhận, chỉ giữ Đã Lên Đơn và Đã Gửi. Áp dụng cho cả nút Tạo đơn bấm tay. |
| `posGroupPrint` | `false` | Bật nút Phân nhóm đơn trên trang Đơn hàng POS Cake. |
| `uiRecording` | `false` | Chế độ chẩn đoán ghi nhận 4 lần bấm; tạm ngăn các luồng tự động khi đang ghi nhận. Bật chế độ này không đổi công tắc `autoOrder`. |
| `uiEvents` | `[]` | Dữ liệu chẩn đoán gồm tag HTML, class, role, placeholder và vị trí. Không chứa nội dung chat hay cookie. |

### 1. Mở form và chọn địa chỉ

`content.js` bắt sự kiện `click` ở giai đoạn capture. Khi người dùng bấm trong `.conversation-list-item`, `prepareOrder()` đợi 180 ms để Pancake đổi hội thoại, bấm tab **Tạo mới**, bấm ô địa chỉ và chọn `role="option"` hợp lệ đầu tiên theo thứ tự DOM trong danh sách nằm ngay dưới ô. Sau đó theo dõi tab trong 500 ms bằng MutationObserver; nếu Pancake vừa chuyển lại **Thông tin** trong quá trình tải hội thoại, lặp lại thao tác ngay, tối đa một lần. Không chờ đủ 500 ms mới phục hồi. `runId` hủy luồng cũ khi chọn hội thoại khác, tắt công tắc, bật ghi nhận, người dùng thao tác trong `.crm-platform`/dropdown hoặc bấm Tạo đơn. Các lần `.click()` của extension không bị hiểu nhầm là thao tác thủ công (`event.isTrusted`). Nếu không có gợi ý thì dừng, không điền địa chỉ tùy đoán. Từ 08/10/2026, dòng hội thoại không còn thuộc tính `id`; `selectedConversationId()` dùng chính phần tử `.conversation-list-item.selected` làm dấu hiệu nhận diện nếu thiếu `id`. Các luồng giá, tự tạo đơn và tag so sánh phần tử này để không chạy sang hội thoại khác.

`waitForDom(find, current, timeoutMs)` kiểm tra ngay, sau đó chỉ giữ MutationObserver trong lúc chờ DOM. Timer 80 ms dự phòng dùng để nhận hủy tác vụ hoặc thay đổi thuộc tính input không gây mutation. Observer/timer được dọn khi đạt điều kiện, hết hạn hoặc `current()` không còn đúng. Mở địa chỉ, mở ghi chú, xác nhận giá, chờ lưu ghi chú, nhận đơn mới và xác nhận tag dùng helper này. Các lần chờ 80 ms cố định trước ghi chú/tạo đơn đã đổi thành nhường một lượt event loop (`pause(0)`) để Pancake xử lý xong sự kiện React.

### 2. Tóm tắt sản phẩm vào Ghi chú in

Extension **không tự tích Miễn phí giao hàng**. Khi checkbox này chuyển sang trạng thái tích, `orderProducts()` đọc mỗi `.row-table-product`: tên ở cột sản phẩm, số lượng ở cột số lượng. `summarizeProducts()` nhận quy cách `kg` hoặc `g` từ **tên sản phẩm**, nhân với số lượng, gộp các dòng cùng loại và viết kiểu `4kg miến sâm nhỏ + 6kg miến sâm to`. Tiền tố năm `(2026)` được bỏ; cụm `Miến Sâm Sợi` được rút còn `miến sâm`. Sản phẩm không có quy cách trong tên được ghi `số lượng x tên` để không bị mất khỏi ghi chú. Dữ liệu thiếu hoặc số lượng không hợp lệ làm hàm trả `null`, không điền ghi chú và không tự tạo đơn.

Pancake từng hiển thị dòng phụ `1000 g` ngay cả cho sản phẩm tên `2KG`; **đừng** thay thuật toán bằng cách đọc dòng phụ đó. Ghi chú cũ có nội dung khác sẽ được giữ lại và nối thêm bằng ` | `. Nếu ghi chú cũ chỉ là tóm tắt khối lượng, extension thay nó bằng tóm tắt mới. Trước khi điền, kiểm tra lại hội thoại, checkbox miễn phí giao hàng và danh sách sản phẩm vẫn khớp dữ liệu đã đọc; nếu người dùng đổi giữa chừng thì dừng. React textarea được cập nhật bằng native setter của `HTMLTextAreaElement` và sự kiện `input` để Pancake nhận trạng thái mới. Khi `autoSubmitOrder` tắt, extension **chỉ điền**, để người dùng tự bấm Lưu.

### 3. Điều chỉnh giá và tùy chọn tự tạo đơn

Trước khi điền ghi chú, nếu `autoMienSamPrice` bật, `adjustMienSamPrice()` đọc các dòng sản phẩm, **Tổng giá trị đơn hàng** và đối chiếu bảng giá trong `pricing.js`: 1kg 95.000đ, 2kg 160.000đ, 3kg 220.000đ, 4kg 280.000đ, 5kg 350.000đ, 6kg 420.000đ, 10kg 600.000đ. Chỉ nhận đơn mà mọi tên sản phẩm là `Miến Sâm`, `Miến Sâm Sợi Nhỏ/To` hoặc biến thể `Miến Sợi Nhỏ/To` thiếu chữ “Sâm” đã thấy trên Pancake, có quy cách `kg/g` trong tên và số lượng nguyên dương. Quy cách nhân số lượng rồi cộng khối lượng, không phân biệt sợi to/nhỏ. 7–9kg và các khối lượng không có mốc được bỏ qua. Nếu tổng tiền vượt giá mốc, điền số tiền chênh lệch **tuyệt đối** vào ô Giảm giá và chờ tổng cuối bằng giá mốc. Nếu không xác nhận được, ghi chú vẫn có thể điền nhưng luồng **tự tạo đơn** không chạy. Nếu tổng tiền bằng/thấp hơn mốc, không sửa ô Giảm giá.

Ô Giảm giá được cập nhật qua native setter của `HTMLInputElement`, sự kiện `input`/`change` và blur để Pancake nhận thay đổi. Không đọc giá ở chân form làm tổng trước giảm; chân form chỉ dùng để xác nhận kết quả. Logic giá bắt đầu khi **người dùng tích** Miễn phí giao hàng; extension vẫn không tự tích checkbox đó.

Khi `autoSubmitOrder` và `autoPrintNote` đều bật, `submitAfterNote()` đợi React nhận nội dung, bấm **Lưu** trong `.note-print-order`, đợi textarea đóng, kiểm tra lại rằng hội thoại vẫn là hội thoại ban đầu, checkbox miễn phí giao hàng vẫn tích và tóm tắt sản phẩm chưa đổi, rồi bấm nút **Tạo đơn** ở `.crm-platform .box-footer`. Không tạo đơn nếu thiếu sản phẩm, trình soạn ghi chú không đóng hoặc người dùng đổi hội thoại. Bấm nút thủ công vẫn được, bất kể công tắc tự tạo đơn.

### 4. Chuẩn hóa tag sau tạo đơn

Trình nghe `click` bắt nút `.crm-platform .box-footer button.btn-save-order` trước khi Pancake xử lý lần bấm, lưu tập ID đơn đã có, rồi chờ tối đa 30 giây. Tín hiệu thành công chính là ID mới trong `.crm-platform .recent-orders .ant-collapse-header`. Ngoài ra còn nhận tin nhắn `Đơn hàng ... đã được tạo` mới trong chat hoặc thông báo thành công mới. Khi thấy tín hiệu, `normalizeOrderTags()` tích **Đã Lên Đơn** và **Đã Gửi** nếu chưa tích, sau đó bỏ những tag khác đang tích. Nếu tạo đơn lỗi hoặc đã đổi hội thoại thì không đổi tag.

Tag được chọn có phần tử con `.ellipse` trong `button.btn-tag-item`. Tên tag được chuẩn hóa khoảng trắng trước khi so khớp. Hai tag cần giữ được tích **trước** khi bỏ các tag khác; nếu không tích được một trong hai, extension dừng việc bỏ tag cũ.

### 5. Phân nhóm và in đơn POS Cake

Content script POS chỉ chạy ở `/shop/{id}/order`. Công tắc `posGroupPrint` (mặc định tắt) bật nút **Phân nhóm đơn** trên trang. Người dùng đặt bộ lọc POS trước, rồi bấm **Quét và phân nhóm**. `pos-content.js` cuộn `.ant-table-tbody-virtual-holder`, đọc các `.ant-table-row[data-row-key]` và mã đơn trong `.order-id-column a`. Cột sản phẩm là ô thứ 10 của mỗi dòng (chỉ số 9), đã đối chiếu với header **Sản phẩm** trên POS ngày 03/10/2026. Dòng một sản phẩm hiển thị `Tên x Số lượng`; dòng nhiều sản phẩm chỉ hiển thị `Nhiều sản phẩm`. Script phát sự kiện rê chuột lên ô này, đọc từng `.ant-menu-title-content` trong bảng nổi `.order-action-list:not(.ant-popover-hidden)` rồi rời ô. Mỗi dòng phải khớp mẫu `Tên x Số lượng` của `parseListProduct()`; nếu bảng nổi không hiện hoặc có dòng không hợp lệ trong 700 ms, đơn vào mục cần xem lại. Không mở modal chi tiết. Giữa hai vị trí cuộn chỉ chờ 60 ms; trạng thái tiến độ cập nhật mỗi 10 đơn. Không đọc cookie hoặc API nội bộ.

`pos-groups.js` chuẩn hóa tiền tố năm, gom `Miến Sợi Nhỏ/To` cùng biến thể `Miến Sâm Sợi Nhỏ/To`, nhân quy cách `kg/g` với số lượng và tạo khóa nhóm không phụ thuộc thứ tự sản phẩm. Sản phẩm không có quy cách được gom theo tên và số lượng. Bảng kết quả hiện thành phần, số đơn và mã đơn. Script đối chiếu số đơn đã quét với số ở trạng thái POS đang chọn; nếu thiếu, không cho in từ kết quả chưa đủ. Đơn thiếu tên/số lượng được liệt kê ở mục cần xem lại.

Người dùng bấm **Chọn nhóm để in** để tích các checkbox POS của đúng nhóm, kể cả các dòng ngoài vùng render hiện tại. Script từ chối khi POS đang có đơn được chọn ngoài nhóm và xác nhận `Đã chọn: N` bằng số đơn của nhóm. Nút **In nhóm bằng POS** bấm nút in hàng loạt gốc trong `.action-btn-container .ant-space-compact` (nhận dạng biểu tượng máy in), để POS in phiếu đơn từng đơn theo cấu hình sẵn. Không tự in khi vừa quét. Sau khi đổi bộ lọc phải quét lại. Khi thử mã, không bấm nút in trên đơn thật chỉ để xem kết quả.

## Bộ chọn DOM đã xác nhận trên Pancake

Từ 0.4.4, `selectGroup(group, button)` thêm class `pap-pos-selected` vào chính nút chọn của nhóm sau khi đã xác nhận đủ đơn. Class chỉ đổi nền thành xám, không đặt `disabled`, không có nghĩa là đã in; các nhóm đã thao tác giữ dấu này khi chọn nhóm khác. `clearGroups()` bỏ chọn `selectedKeys` của extension bằng `changeSelection()` nếu vẫn ở URL đã quét, rồi xóa `lastScan`, `selectedKeys` và các thẻ nhóm. Không tự bỏ chọn đơn ngoài tập theo dõi. Nếu bộ lọc/URL đổi, chỉ xóa kết quả và nhắc người dùng bỏ chọn POS còn lại. Clear từ chối trong lúc quét/chọn hoặc khi có modal; nếu bỏ chọn nhóm cũ không đủ, giữ kết quả để người dùng thử lại. Quét lại tạo nút mới nên xóa dấu màu xám.

Những bộ chọn sau được đọc từ trang Pancake đang đăng nhập trong Chrome ngày 26/09/2026 và đối chiếu lại ngày 09/10/2026. Chúng phụ thuộc giao diện của Pancake và có thể cần sửa khi Pancake cập nhật.

| Thành phần | Bộ chọn hoặc dấu hiệu |
| --- | --- |
| Hội thoại đang chọn | `.conversation-list-item.selected`; hiện không có `id`, dùng tham chiếu phần tử |
| Một dòng hội thoại | `.conversation-list-item` |
| Tab Tạo mới | `.crm-platform .tab-label-item` có chữ `Tạo mới` |
| Ô địa chỉ | `.customer-address input[placeholder="Địa chỉ"]` |
| Gợi ý địa chỉ | `[role="listbox"] [role="option"]`, chọn mục ở ngay dưới ô địa chỉ |
| Dòng sản phẩm | `.crm-platform .view-order .row-table-product` |
| Tên sản phẩm | `.col-product-name .info-order-item > .font-weight-500` trong dòng sản phẩm |
| Số lượng | `.table-product > .ant-col-4 input.ant-input-number-input` trong dòng sản phẩm |
| Checkbox miễn phí giao hàng | `label` trong form có chữ `Miễn phí giao hàng`, chứa `input[type="checkbox"]` |
| Tổng trước giảm | `.crm-platform .view-order .content-order-payment > .row-content-payment` có nhãn `Tổng giá trị đơn hàng` |
| Ô Giảm giá | Hàng cùng selector có nhãn `Giảm giá`, chứa `input.ant-input-number-input` |
| Tổng sau giảm | `.crm-platform .box-footer .text-final-price` |
| Ghi chú in | `.crm-platform .note-print-order`; nút lưu là `button.btn-cancel-note` có chữ `Lưu` |
| Nút Tạo đơn | `.crm-platform .box-footer button.btn-save-order` |
| Danh sách đơn gần đây | `.crm-platform .recent-orders .ant-collapse-header` chứa ID số của đơn |
| Bảng tag | `button.btn-tag-item`; có `.ellipse` nghĩa là đang tích |

Các bộ chọn POS đã đọc trên trang đăng nhập ngày 03/10/2026: `.ant-table-tbody-virtual-holder`, `.ant-table-row[data-row-key]`, `.order-id-column a`, `.order-action-list`, `.ant-menu-title-content`, `.action-btn-container .ant-space-compact button`. POS dùng bảng ảo nên DOM chỉ chứa các dòng đang trong vùng cuộn; tuyệt đối không giả định `querySelectorAll('.ant-table-row')` là toàn bộ bộ lọc.

**Lỗi từng gặp:** bản đầu dùng ngưỡng tọa độ màn hình để đoán dòng hội thoại và tab Tạo mới. Giao diện thực tế nằm cao hơn ngưỡng nên không chạy; đã đổi sang class thật. Bản đầu của tính năng tag tìm nút Tạo đơn bên trong `.view-order` và chỉ chờ tin nhắn chat mới. Nút thật nằm ở `.box-footer`, còn đơn mới thường xuất hiện trong `.recent-orders` mà không gửi tin chat; cả hai đã được sửa. Không quay lại hai giả định này.

## Kiểm tra và phát triển tiếp

Chạy từ thư mục dự án:

```text
node --check content.js
node --check popup.js
node --test product-summary.test.js
node --test pricing.test.js
node --check pos-content.js
node --test pos-groups.test.js
```

Sau đó tải lại extension và tab Pancake, thử lần lượt các công tắc trên hội thoại thử nghiệm. Với tính năng tag, quan sát trước/sau ở dải tag: cuối cùng chỉ còn hai dấu `.ellipse` trên **Đã Lên Đơn** và **Đã Gửi**. Đừng bấm **Tạo đơn** trên đơn thật chỉ để thử bộ chọn; thao tác này tạo đơn thật. Có thể dùng chế độ **Kiểm tra giao diện** ở popup để ghi lại cấu trúc bốn phần tử khi Pancake đổi DOM.

Khi thêm tính năng: tạo công tắc riêng trong popup, dùng khóa mới của `chrome.storage.local`, cập nhật biến và listener trong `content.js`, hủy tác vụ bất đồng bộ khi tắt công tắc hoặc đổi hội thoại, và cập nhật tài liệu này. Với phép biến đổi dữ liệu như tóm tắt sản phẩm, ưu tiên hàm thuần có bài kiểm tra. Với thao tác trên trang, dùng bộ chọn gắn với thành phần thực tế và kiểm tra trạng thái sau mỗi bước. Tránh truy cập API nội bộ hoặc lưu thông tin đăng nhập Pancake nếu không có yêu cầu rõ ràng.

## Giới hạn hiện tại

Kiểm thử trình duyệt cục bộ: chạy `node tests/serve.cjs`, mở `http://127.0.0.1:8765/multi_pages` trong Chrome rồi bấm **Chạy toàn bộ kiểm thử**. Trang nạp `content.js`, `product-summary.js`, `pricing.js` thật, mock `chrome.storage.local` và mô phỏng DOM theo các bộ chọn đã xác nhận. Kết quả kiểm tra gồm ghi chú/giá, tạo thủ công/tự động, tag thành công/thất bại, hủy khi đổi hội thoại/sản phẩm/công tắc, phục hồi tab và dọn MutationObserver. Nút **Chuẩn bị thử ưu tiên thao tác tay** dùng để kiểm tra bằng click thật (`isTrusted`) rằng tab Thông tin không bị extension mở lại. Đây là kiểm tra hồi quy cục bộ, không thay thế đối chiếu trên Pancake đăng nhập khi trang đổi DOM.

- Giao diện Pancake là ứng dụng một trang và class DOM có thể đổi; extension sẽ cần cập nhật bộ chọn nếu luồng ngừng hoạt động.
- Ghi chú dựa trên quy cách nằm trong tên sản phẩm. Tên không ghi `kg/g` được giữ ở dạng số lượng, không suy ra khối lượng.
- Tự tạo đơn bắt đầu sau **lần người dùng tích** Miễn phí giao hàng, không tự đoán lúc người dùng đã thêm xong sản phẩm.
- Chuẩn hóa tag cần quan sát ID đơn mới hoặc thông báo thành công trong vòng 30 giây. Nếu Pancake đổi cách hiển thị kết quả, cần cập nhật `createdOrderIds()` hoặc `orderCreated()`.
