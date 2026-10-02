# Bàn giao kỹ thuật — Pancake Assistant Pro

Cập nhật: 03/10/2026. Phiên bản manifest: `0.4.1`. Đây là extension Chrome Manifest V3 viết bằng JavaScript thuần, chạy trên giao diện Hội thoại Pancake và Đơn hàng POS Cake. Mỗi tính năng có công tắc riêng. Trang đích là `https://pancake.vn/multi_pages` và `https://pos.pancake.vn/shop/.../order`. Không có backend, build tool, API key hay cookie trong dự án.

## Cấu trúc dự án

| File | Vai trò |
| --- | --- |
| `manifest.json` | Tên, mô tả, quyền, khai báo content scripts và popup. Nạp `product-summary.js`, `pricing.js` trước `content.js`. |
| `popup.html`, `popup.css`, `popup.js` | Popup hai mục Pancake/POS Cake. Giữ năm công tắc Pancake, thêm công tắc POS; lưu lựa chọn vào `chrome.storage.local`. |
| `content.js` | Nghe sự kiện trên trang, tự động mở form, điền ghi chú, tùy chọn tạo đơn và chuẩn hóa tag. |
| `product-summary.js` | Hàm thuần `summarizeProducts(products)`; chạy trong content script và cũng xuất CommonJS để thử bằng Node. |
| `product-summary.test.js` | Kiểm tra phép nhân quy cách với số lượng, gộp sản phẩm cùng loại và xử lý dữ liệu thiếu. |
| `pricing.js` | Hàm thuần `calculateDiscount(products, orderTotal)`; bảng giá Miến Sâm và điều kiện áp dụng. |
| `pricing.test.js` | Kiểm tra giá 1–6kg và 10kg, đơn lẫn sản phẩm khác, mốc không hỗ trợ, mức giảm. |
| `pos-groups.js`, `pos-groups.test.js` | Hàm thuần gom đơn theo thành phần sản phẩm và tổng kg từng loại. |
| `pos-content.js`, `pos-content.css` | Nút nổi và bảng phân nhóm trên trang Đơn hàng POS; quét DOM, chọn nhóm và gọi nút in hàng loạt gốc của POS. |
| `README.md` | Hướng dẫn cài đặt, sử dụng và chuyển sang máy khác. |
| `AGENTS.md` | Điểm bắt đầu ngắn gọn cho AI tiếp quản dự án. |

Không cần `npm install`. Node chỉ cần để chạy bài kiểm tra; Chrome nạp trực tiếp các file từ thư mục.

## Thiết lập và di chuyển

Sao chép cả thư mục chứa `manifest.json`, dùng **Tải tiện ích đã giải nén** tại `chrome://extensions`, rồi tải lại các tab Pancake/POS Cake. Sau mỗi lần sửa file extension, phải tải lại extension **và** tab đang dùng vì content script cũ vẫn nằm trong tab chưa tải lại. `chrome.storage.local` thuộc hồ sơ Chrome, không nằm trong thư mục dự án; công tắc trên máy mới trở về mặc định. Pancake/POS Cake cần được đăng nhập riêng trên máy mới. Không chuyển cookie cho AI hoặc lưu cookie vào mã nguồn.

Repository hiện chưa có commit. Nếu dùng Git để chuyển máy, cần commit/push toàn bộ các file trước; nếu không, chỉ việc sao chép nguyên thư mục dự án.

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
| `uiRecording` | `false` | Chế độ chẩn đoán ghi nhận 4 lần bấm; ngăn các luồng tự động đang chạy. |
| `uiEvents` | `[]` | Dữ liệu chẩn đoán gồm tag HTML, class, role, placeholder và vị trí. Không chứa nội dung chat hay cookie. |

### 1. Mở form và chọn địa chỉ

`content.js` bắt sự kiện `click` ở giai đoạn capture. Khi người dùng bấm trong `.conversation-list-item`, `prepareOrder()` đợi 180 ms để Pancake đổi hội thoại, bấm tab **Tạo mới**, bấm ô địa chỉ và chọn `role="option"` đầu tiên trong danh sách nằm ngay dưới ô. `runId` hủy luồng cũ khi chọn hội thoại khác hoặc tắt công tắc. Nếu không có gợi ý thì dừng, không điền địa chỉ tùy đoán.

### 2. Tóm tắt sản phẩm vào Ghi chú in

Extension **không tự tích Miễn phí giao hàng**. Khi checkbox này chuyển sang trạng thái tích, `orderProducts()` đọc mỗi `.row-table-product`: tên ở cột sản phẩm, số lượng ở cột số lượng. `summarizeProducts()` nhận quy cách `kg` hoặc `g` từ **tên sản phẩm**, nhân với số lượng, gộp các dòng cùng loại và viết kiểu `4kg miến sâm nhỏ + 6kg miến sâm to`. Tiền tố năm `(2026)` được bỏ; cụm `Miến Sâm Sợi` được rút còn `miến sâm`. Sản phẩm không có quy cách trong tên được ghi `số lượng x tên` để không bị mất khỏi ghi chú. Dữ liệu thiếu hoặc số lượng không hợp lệ làm hàm trả `null`, không điền ghi chú và không tự tạo đơn.

Pancake từng hiển thị dòng phụ `1000 g` ngay cả cho sản phẩm tên `2KG`; **đừng** thay thuật toán bằng cách đọc dòng phụ đó. Ghi chú cũ có nội dung khác sẽ được giữ lại và nối thêm bằng ` | `. Nếu ghi chú cũ chỉ là tóm tắt khối lượng, extension thay nó bằng tóm tắt mới. React textarea được cập nhật bằng native setter của `HTMLTextAreaElement` và sự kiện `input` để Pancake nhận trạng thái mới. Khi `autoSubmitOrder` tắt, extension **chỉ điền**, để người dùng tự bấm Lưu.

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

Những bộ chọn sau được đọc từ trang Pancake đang đăng nhập trong Chrome ngày 26/09/2026. Chúng phụ thuộc giao diện của Pancake và có thể cần sửa khi Pancake cập nhật.

| Thành phần | Bộ chọn hoặc dấu hiệu |
| --- | --- |
| Hội thoại đang chọn | `.conversation-list-item.selected` và thuộc tính `id` |
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

- Giao diện Pancake là ứng dụng một trang và class DOM có thể đổi; extension sẽ cần cập nhật bộ chọn nếu luồng ngừng hoạt động.
- Ghi chú dựa trên quy cách nằm trong tên sản phẩm. Tên không ghi `kg/g` được giữ ở dạng số lượng, không suy ra khối lượng.
- Tự tạo đơn bắt đầu sau **lần người dùng tích** Miễn phí giao hàng, không tự đoán lúc người dùng đã thêm xong sản phẩm.
- Chuẩn hóa tag cần quan sát ID đơn mới hoặc thông báo thành công trong vòng 30 giây. Nếu Pancake đổi cách hiển thị kết quả, cần cập nhật `createdOrderIds()` hoặc `orderCreated()`.
