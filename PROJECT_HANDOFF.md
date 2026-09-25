# Bàn giao kỹ thuật — Pancake Assistant Pro

Cập nhật: 26/09/2026. Phiên bản manifest: `0.2.0`. Đây là extension Chrome Manifest V3 viết bằng JavaScript thuần, chạy trên giao diện Hội thoại của Pancake. Mục tiêu là giảm thao tác lên đơn, với **mỗi tính năng có công tắc bật/tắt riêng**. Trang đích là `https://pancake.vn/multi_pages`; logic trong `content.js` còn kiểm tra đường dẫn `/multi_pages` trước khi thao tác. Không có backend, build tool, API key hay cookie trong dự án.

## Cấu trúc dự án

| File | Vai trò |
| --- | --- |
| `manifest.json` | Tên, mô tả, quyền, khai báo content scripts và popup. Nạp `product-summary.js` trước `content.js`. |
| `popup.html`, `popup.css`, `popup.js` | Giao diện bốn công tắc và chế độ ghi nhận cấu trúc phần tử. Lưu lựa chọn vào `chrome.storage.local`. |
| `content.js` | Nghe sự kiện trên trang, tự động mở form, điền ghi chú, tùy chọn tạo đơn và chuẩn hóa tag. |
| `product-summary.js` | Hàm thuần `summarizeProducts(products)`; chạy trong content script và cũng xuất CommonJS để thử bằng Node. |
| `product-summary.test.js` | Kiểm tra phép nhân quy cách với số lượng, gộp sản phẩm cùng loại và xử lý dữ liệu thiếu. |
| `README.md` | Hướng dẫn cài đặt, sử dụng và chuyển sang máy khác. |
| `AGENTS.md` | Điểm bắt đầu ngắn gọn cho AI tiếp quản dự án. |

Không cần `npm install`. Node chỉ cần để chạy bài kiểm tra; Chrome nạp trực tiếp các file từ thư mục.

## Thiết lập và di chuyển

Sao chép cả thư mục chứa `manifest.json`, dùng **Tải tiện ích đã giải nén** tại `chrome://extensions`, rồi tải lại trang Pancake. Sau mỗi lần sửa file extension, phải tải lại extension **và** tab Pancake vì content script cũ vẫn nằm trong tab chưa tải lại. `chrome.storage.local` thuộc hồ sơ Chrome, không nằm trong thư mục dự án; công tắc trên máy mới trở về mặc định. Pancake cần được đăng nhập riêng trên máy mới. Không chuyển cookie cho AI hoặc lưu cookie vào mã nguồn.

Repository hiện chưa có commit. Nếu dùng Git để chuyển máy, cần commit/push toàn bộ các file trước; nếu không, chỉ việc sao chép nguyên thư mục dự án.

Manifest hiện yêu cầu `storage`, `activeTab` và quyền truy cập `pancake.vn`. Popup hiển thị tên **Pancake Assistant Pro**; mô tả manifest là **DEV: Bố Hoàng No1**.

## Cấu hình và luồng thực tế

| Khóa `chrome.storage.local` | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `autoOrder` | `true` | Bấm hội thoại → mở tab Tạo mới → chọn gợi ý địa chỉ đầu tiên. |
| `autoPrintNote` | `true` | Khi người dùng tích Miễn phí giao hàng → tóm tắt sản phẩm vào Ghi chú in. |
| `autoSubmitOrder` | `false` | Sau khi ghi chú đã điền, lưu ghi chú rồi bấm Tạo đơn. Chỉ có tác dụng khi `autoPrintNote` bật. |
| `autoOrderTags` | `false` | Sau khi đơn mới được xác nhận, chỉ giữ Đã Lên Đơn và Đã Gửi. Áp dụng cho cả nút Tạo đơn bấm tay. |
| `uiRecording` | `false` | Chế độ chẩn đoán ghi nhận 4 lần bấm; ngăn các luồng tự động đang chạy. |
| `uiEvents` | `[]` | Dữ liệu chẩn đoán gồm tag HTML, class, role, placeholder và vị trí. Không chứa nội dung chat hay cookie. |

### 1. Mở form và chọn địa chỉ

`content.js` bắt sự kiện `click` ở giai đoạn capture. Khi người dùng bấm trong `.conversation-list-item`, `prepareOrder()` đợi 180 ms để Pancake đổi hội thoại, bấm tab **Tạo mới**, bấm ô địa chỉ và chọn `role="option"` đầu tiên trong danh sách nằm ngay dưới ô. `runId` hủy luồng cũ khi chọn hội thoại khác hoặc tắt công tắc. Nếu không có gợi ý thì dừng, không điền địa chỉ tùy đoán.

### 2. Tóm tắt sản phẩm vào Ghi chú in

Extension **không tự tích Miễn phí giao hàng**. Khi checkbox này chuyển sang trạng thái tích, `orderProducts()` đọc mỗi `.row-table-product`: tên ở cột sản phẩm, số lượng ở cột số lượng. `summarizeProducts()` nhận quy cách `kg` hoặc `g` từ **tên sản phẩm**, nhân với số lượng, gộp các dòng cùng loại và viết kiểu `4kg miến sâm nhỏ + 6kg miến sâm to`. Tiền tố năm `(2026)` được bỏ; cụm `Miến Sâm Sợi` được rút còn `miến sâm`. Sản phẩm không có quy cách trong tên được ghi `số lượng x tên` để không bị mất khỏi ghi chú. Dữ liệu thiếu hoặc số lượng không hợp lệ làm hàm trả `null`, không điền ghi chú và không tự tạo đơn.

Pancake từng hiển thị dòng phụ `1000 g` ngay cả cho sản phẩm tên `2KG`; **đừng** thay thuật toán bằng cách đọc dòng phụ đó. Ghi chú cũ có nội dung khác sẽ được giữ lại và nối thêm bằng ` | `. Nếu ghi chú cũ chỉ là tóm tắt khối lượng, extension thay nó bằng tóm tắt mới. React textarea được cập nhật bằng native setter của `HTMLTextAreaElement` và sự kiện `input` để Pancake nhận trạng thái mới. Khi `autoSubmitOrder` tắt, extension **chỉ điền**, để người dùng tự bấm Lưu.

### 3. Tùy chọn tự tạo đơn

Khi `autoSubmitOrder` và `autoPrintNote` đều bật, `submitAfterNote()` đợi React nhận nội dung, bấm **Lưu** trong `.note-print-order`, đợi textarea đóng, kiểm tra lại rằng hội thoại vẫn là hội thoại ban đầu, checkbox miễn phí giao hàng vẫn tích và tóm tắt sản phẩm chưa đổi, rồi bấm nút **Tạo đơn** ở `.crm-platform .box-footer`. Không tạo đơn nếu thiếu sản phẩm, trình soạn ghi chú không đóng hoặc người dùng đổi hội thoại. Bấm nút thủ công vẫn được, bất kể công tắc tự tạo đơn.

### 4. Chuẩn hóa tag sau tạo đơn

Trình nghe `click` bắt nút `.crm-platform .box-footer button.btn-save-order` trước khi Pancake xử lý lần bấm, lưu tập ID đơn đã có, rồi chờ tối đa 30 giây. Tín hiệu thành công chính là ID mới trong `.crm-platform .recent-orders .ant-collapse-header`. Ngoài ra còn nhận tin nhắn `Đơn hàng ... đã được tạo` mới trong chat hoặc thông báo thành công mới. Khi thấy tín hiệu, `normalizeOrderTags()` tích **Đã Lên Đơn** và **Đã Gửi** nếu chưa tích, sau đó bỏ những tag khác đang tích. Nếu tạo đơn lỗi hoặc đã đổi hội thoại thì không đổi tag.

Tag được chọn có phần tử con `.ellipse` trong `button.btn-tag-item`. Tên tag được chuẩn hóa khoảng trắng trước khi so khớp. Hai tag cần giữ được tích **trước** khi bỏ các tag khác; nếu không tích được một trong hai, extension dừng việc bỏ tag cũ.

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
| Ghi chú in | `.crm-platform .note-print-order`; nút lưu là `button.btn-cancel-note` có chữ `Lưu` |
| Nút Tạo đơn | `.crm-platform .box-footer button.btn-save-order` |
| Danh sách đơn gần đây | `.crm-platform .recent-orders .ant-collapse-header` chứa ID số của đơn |
| Bảng tag | `button.btn-tag-item`; có `.ellipse` nghĩa là đang tích |

**Lỗi từng gặp:** bản đầu dùng ngưỡng tọa độ màn hình để đoán dòng hội thoại và tab Tạo mới. Giao diện thực tế nằm cao hơn ngưỡng nên không chạy; đã đổi sang class thật. Bản đầu của tính năng tag tìm nút Tạo đơn bên trong `.view-order` và chỉ chờ tin nhắn chat mới. Nút thật nằm ở `.box-footer`, còn đơn mới thường xuất hiện trong `.recent-orders` mà không gửi tin chat; cả hai đã được sửa. Không quay lại hai giả định này.

## Kiểm tra và phát triển tiếp

Chạy từ thư mục dự án:

```text
node --check content.js
node --check popup.js
node --test product-summary.test.js
```

Sau đó tải lại extension và tab Pancake, thử lần lượt các công tắc trên hội thoại thử nghiệm. Với tính năng tag, quan sát trước/sau ở dải tag: cuối cùng chỉ còn hai dấu `.ellipse` trên **Đã Lên Đơn** và **Đã Gửi**. Đừng bấm **Tạo đơn** trên đơn thật chỉ để thử bộ chọn; thao tác này tạo đơn thật. Có thể dùng chế độ **Kiểm tra giao diện** ở popup để ghi lại cấu trúc bốn phần tử khi Pancake đổi DOM.

Khi thêm tính năng: tạo công tắc riêng trong popup, dùng khóa mới của `chrome.storage.local`, cập nhật biến và listener trong `content.js`, hủy tác vụ bất đồng bộ khi tắt công tắc hoặc đổi hội thoại, và cập nhật tài liệu này. Với phép biến đổi dữ liệu như tóm tắt sản phẩm, ưu tiên hàm thuần có bài kiểm tra. Với thao tác trên trang, dùng bộ chọn gắn với thành phần thực tế và kiểm tra trạng thái sau mỗi bước. Tránh truy cập API nội bộ hoặc lưu thông tin đăng nhập Pancake nếu không có yêu cầu rõ ràng.

## Giới hạn hiện tại

- Giao diện Pancake là ứng dụng một trang và class DOM có thể đổi; extension sẽ cần cập nhật bộ chọn nếu luồng ngừng hoạt động.
- Ghi chú dựa trên quy cách nằm trong tên sản phẩm. Tên không ghi `kg/g` được giữ ở dạng số lượng, không suy ra khối lượng.
- Tự tạo đơn bắt đầu sau **lần người dùng tích** Miễn phí giao hàng, không tự đoán lúc người dùng đã thêm xong sản phẩm.
- Chuẩn hóa tag cần quan sát ID đơn mới hoặc thông báo thành công trong vòng 30 giây. Nếu Pancake đổi cách hiển thị kết quả, cần cập nhật `createdOrderIds()` hoặc `orderCreated()`.
