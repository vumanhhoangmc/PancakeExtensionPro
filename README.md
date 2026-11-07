# Pancake Assistant Pro

**0.10.3 — cửa sổ nhỏ:** sửa đọc số lượng khi Pancake đổi sang bố cục thu gọn, giúp ghi chú, chỉnh giá và tự tạo đơn tiếp tục hoạt động. Các công tắc và điều kiện tích Miễn phí giao hàng giữ nguyên. Sau cập nhật thủ công cần tải lại extension và tab Pancake.

**0.9.9 — ghi chú theo sản phẩm:** bật **Tự điền ghi chú in** để tự mở ô ghi chú và cập nhật khi thêm, xóa hoặc sửa số lượng sản phẩm, không cần bấm Miễn phí giao hàng hay Thêm ghi chú. Các lần sửa nhanh được gộp trong khoảng 180 ms. Giữ lời dặn riêng và thay phần tóm tắt cũ; khi xóa hết sản phẩm, xóa phần tóm tắt do extension tạo trong phiên hiện tại. Nội dung được điền vào ô ghi chú để bạn xem/sửa. Tự chỉnh giá và tự tạo đơn vẫn chỉ kích hoạt khi bạn tích Miễn phí giao hàng; việc chọn sản phẩm không tự tạo đơn.

**Mô tả trên Chrome:** DEV: Bố Hoàng No1

Extension Chrome hỗ trợ lên đơn trên trang Hội thoại `https://pancake.vn/multi_pages` và phân nhóm đơn để in trên POS Cake `https://pos.pancake.vn/shop/.../order`. Dự án dùng Manifest V3, JavaScript thuần và CSS; không cần cài thư viện hay chạy bước build.

## Cài trên máy khác

**0.10.2:** chặn vòng lặp reload khi helper và extension đọc hai thư mục khác nhau, chặn nạp bản cũ hơn và giới hạn mỗi lần đổi phiên bản chỉ thử reload một lần. Máy đã cài 0.10.0/0.10.1 cần chạy lại **gói cài Windows mới** một lần; trình cài sẽ nâng bản trong thư mục quản lý và đăng ký đúng ID. Bản Load unpacked trực tiếp từ source không tự cập nhật. Xem phần xử lý vòng lặp trong [hướng dẫn](docs/AUTO_UPDATE.md).

**0.10.1:** sửa lỗi phát hành/cập nhật trên Windows có tên thư mục ngắn 8.3 (ví dụ `RUNNER~1`). Đường dẫn này được nhận đúng; symlink/junction thật vẫn bị chặn.

**Từ 0.10.0 — tự cập nhật qua GitHub trên Windows:** tải gói `PancakeAssistantPro-Windows.zip` từ [Releases](https://github.com/vumanhhoangmc/PancakeExtensionPro/releases), giải nén và chạy `install-update.cmd`. Cần Node.js 22 trở lên. Trình cài hướng dẫn Load unpacked từ thư mục riêng trong `%LOCALAPPDATA%` và đăng ký ID extension; sau đó Chrome tự kiểm tra mỗi giờ và tự cập nhật/nạp lại khi đã đóng các tab Pancake/POS. Repo riêng tư cần token chỉ đọc Releases, được mã hóa theo tài khoản Windows. Xem [hướng dẫn cài và phát hành](docs/AUTO_UPDATE.md). Lần đầu chuyển từ thư mục cũ cần tắt bản cũ và chọn lại các công tắc; các lần cập nhật sau giữ nguyên cài đặt. Cơ chế này chỉ hoạt động sau khi repo có Release ổn định kèm gói cập nhật.

Cách cài thủ công cho phát triển, không tự cập nhật:

1. Sao chép **toàn bộ thư mục dự án** sang máy mới, giữ nguyên các file cùng cấp với `manifest.json`.
2. Mở Chrome tại `chrome://extensions`, bật **Chế độ dành cho nhà phát triển**.
3. Bấm **Tải tiện ích đã giải nén** và chọn thư mục chứa `manifest.json`.
4. Mở hoặc tải lại tab Pancake và POS Cake, đăng nhập bằng tài khoản của bạn, rồi mở popup **Pancake Assistant Pro** để chọn các công tắc.

Sau khi chỉnh mã, bấm nút tải lại của extension tại `chrome://extensions`, rồi tải lại các tab Pancake/POS Cake đang dùng. Các công tắc được lưu bằng `chrome.storage.local` theo từng hồ sơ Chrome; sao chép thư mục **không** mang theo trạng thái công tắc hay phiên đăng nhập. Không cần và không nên chép cookie vào dự án.

Nếu chuyển bằng Git, hãy commit và đẩy toàn bộ các file dự án cần chuyển trước khi clone ở máy mới. Các file chưa commit không đi theo bản clone.

## Giao diện hai mục

Popup có mục **Pancake** cho năm tính năng lên đơn hiện có và công tắc **AI tự lên đơn — Beta**, cùng mục **POS Cake** cho tính năng phân nhóm đơn để in. Khi mở popup trên trang Đơn hàng POS, mục POS Cake được chọn sẵn.

### AI tự lên đơn — Beta (0.7.4)

**0.7.4 — hoàn thiện điền nháp:** chờ đúng danh mục/SKU khi Pancake tải chậm; không còn chọn theo thời gian chờ cố định. Nếu AI nhận hệ cũ nhưng địa danh không có trong danh mục cũ, extension thử hệ mới với **cùng tên tỉnh và xã**, chỉ chọn khi từng cấp khớp duy nhất. Địa danh trùng vẫn dừng để xem lại; không tự đoán tên sau sáp nhập. Kết quả điền cho biết hệ địa chỉ thực tế đã dùng.

**Áp dụng bản mới:** tải lại extension ở `chrome://extensions`, tải lại tab Pancake, đóng/mở lại trang AI rồi đọc và phân tích lại hội thoại. **Giữ helper Node và phiên đăng nhập đang chạy.** Kết quả kiểm thử và giới hạn kiểm chứng nằm trong [Báo cáo 0.7.4](docs/TEST_REPORT_2026-10-12.md).

**0.7.3 — điều kiện địa chỉ:** địa chỉ **cũ cần tỉnh/thành phố + huyện/quận + xã/phường**; địa chỉ **mới cần tỉnh/thành phố + xã/phường**. Số nhà/đường là phần bổ sung, không bắt buộc để bật Điền đơn. Không còn bắt tên địa danh AI trả về phải xuất hiện nguyên văn trong chat (ví dụ `tphcm` có thể được AI chuẩn hóa thành Thành phố Hồ Chí Minh). Khi điền vẫn yêu cầu khớp duy nhất với danh mục địa chỉ Pancake. Tải lại extension/Pancake và mở lại trang AI; giữ helper và đăng nhập.

**0.7.2 — danh mục đầy đủ:** nhận **Cam Rốn Lồi Không Hạt Mộc Châu**, **Miến Sợi Nhỏ** (cùng loại Miến Sâm nhỏ) và tiền tố năm có khoảng trắng như `(2026 )`. Dòng có hai nhãn mã sẽ đọc riêng mã mẫu mã để tìm/chọn sản phẩm, không ghép mã sản phẩm và mã mẫu mã. Tên/quy cách/mã vẫn đọc từ shop hiện tại; không cố định MSS04 hay MS004 cho mọi shop. Tải lại extension, tab Pancake và đóng/mở trang AI rồi đọc/phân tích lại; giữ helper 0.7.0 và phiên đăng nhập.

**0.7.1 — sửa dừng ở bảng sản phẩm khoai:** nhận đúng tên **Khoai Sọ Mán Mộc Châu** trong danh mục shop, kể cả khi AI trả tên đầy đủ này. Ví dụ danh mục có KH1 3kg/KH2 5kg thì đơn 5kg chọn KH2 × 1, đơn 10kg chọn KH2 × 2. Tải lại extension, tab Pancake và đóng/mở lại trang AI, sau đó đọc/phân tích lại hội thoại. Nếu helper 0.7.0 đang chạy thì giữ nguyên helper và phiên đăng nhập.

**0.7.0 — nhận diện địa chỉ và điền đơn:** tải lại extension, tab Pancake và trang AI. Dừng helper cũ bằng Ctrl+C rồi chạy lại lệnh trên trang AI, đăng nhập lại. Helper mới yêu cầu AI trả thêm địa chỉ; helper cũ chỉ trả sản phẩm nên không điền được đơn.

Phần đọc giữ thứ tự tin và vai trò khách/shop. Tùy chọn **Đọc cả địa chỉ giao hàng** mặc định bật: địa chỉ trong bản xem trước sẽ được gửi tới OpenAI khi bấm Phân tích. SĐT/email/link thường gặp vẫn được ẩn; SĐT khách để điền đơn được giữ tại máy. Bộ lọc không bảo đảm xóa mọi thông tin riêng nên hãy kiểm tra bản xem trước. Chỉ đọc lịch sử đang tải trong DOM, không đọc ảnh/voice hoặc tự kéo lịch sử. Giới hạn 8.000 ký tự; không tự cắt mất ngữ cảnh.

Bản sửa 0.5.1: nếu từng thấy “Chỉ extension đã cấu hình được truy cập” sau đăng nhập, tải lại extension, đóng/mở lại trang Kết nối AI, dừng helper Node bằng Ctrl+C rồi chạy lại lệnh ở bước 1. Đăng nhập lại vì token chỉ ở bộ nhớ. Yêu cầu kiểm tra kết nối nay dùng POST để tránh thiếu header Origin trên GET; đúng ID extension vẫn được kiểm tra.

Công tắc mặc định **tắt**, lưu riêng theo hồ sơ Chrome. Kết nối **Sign in with ChatGPT** dùng hạn mức Plus/Pro của tài khoản đủ điều kiện. Có thể thử mẫu hoặc hội thoại thật; chỉ hội thoại thật có snapshot hợp lệ mới điền được đơn.

1. Tải lại extension, mở popup → **Kết nối ChatGPT / Thử AI**.
2. Trang kết nối hiện lệnh `node ai-bridge.cjs <ID-extension-của-bạn>`. Sao chép và chạy trong terminal tại thư mục dự án; cần Node.js 22 trở lên. Giữ chương trình chạy khi dùng AI.
3. Bấm **Continue with ChatGPT**, đăng nhập tại trang OpenAI và cấp quyền dùng hạn mức gói. Không gửi cookie, mật khẩu hay API key cho AI phát triển.
4. Quay lại trang kết nối, bấm **Kiểm tra kết nối**, chọn model từ tài khoản.
5. Bật Beta, chọn tab Pancake rồi bấm **Đọc hội thoại Pancake đang mở**. Xem lại bản chat, bấm **Phân tích bằng ChatGPT**.
6. Kiểm tra sản phẩm, tổng kg và địa chỉ trong kết quả. Nếu khách đã chốt và địa chỉ đủ rõ, bấm **Điền đơn trên Pancake**. Extension mở Tạo mới, đối chiếu danh mục hành chính cũ/mới, điền địa chỉ chi tiết, SĐT tại máy và sản phẩm/số lượng.
7. Quay lại Pancake xem đơn nháp. Tích **Miễn phí giao hàng** bằng tay để tiếp tục ghi chú/giá; công tắc **Tự tạo đơn** hiện có quyết định tự bấm Tạo đơn sau ghi chú hay để bạn bấm tay.

Miến tìm bằng từ khóa **2026**; Beta hiện ánh xạ Miến Sâm sợi to/nhỏ, **Cam → Cam rốn lồi**, **Khoai sọ → Khoai sọ mán**. Quy cách kg/g trong tên SKU quyết định số lượng gói. Ưu tiên SKU đúng tổng kg, nếu không có thì dùng SKU 1kg, sau đó quy cách lớn nhất chia hết tổng kg. Nếu trùng SKU phù hợp, thiếu địa chỉ/SĐT hoặc không có quy cách phù hợp, dừng để xem lại. Không đoán địa danh sau sáp nhập; chỉ chọn tên khớp duy nhất trong danh mục Pancake. Form có sản phẩm được giữ nguyên và từ chối thêm. Kết quả đã dùng không được bấm lại; đổi hội thoại, đổi tin, tắt Beta hay thao tác trong lúc điền sẽ dừng tác vụ. Nếu đã điền một phần thì kiểm tra form trước khi làm lại. Đây chưa phải cơ chế chống đơn trùng qua reload hoặc mua lại.

Chương trình kết nối chạy trên `127.0.0.1:18765`, chỉ cho ID extension bạn truyền vào truy cập. Token chỉ giữ trong bộ nhớ; dừng chương trình hoặc hết hạn phiên phải đăng nhập lại. Ngắt kết nối xóa phiên tại máy, không thu hồi quyền trên tài khoản OpenAI. Không có cơ chế tự chuyển sang API tính phí. Khi hết hạn mức/không có quyền/model, hiển thị lỗi và dừng phân tích. Người dùng đã xác nhận đăng nhập và nhận diện sản phẩm trên hội thoại thật hoạt động; lượt địa chỉ/điền đơn mới cần được kiểm chứng trên tài khoản sau tải lại. Tool trình duyệt chặn chrome-extension://; DOM form thật được đối chiếu, luồng điền được kiểm thử bằng fixture.

Phân tích và lộ trình tiếp theo nằm trong [AI_BETA_PLAN.md](AI_BETA_PLAN.md).

## Các công tắc Pancake

### Hỗ trợ trả lời comment (0.9.6)

Sau khi bạn bấm **nút Gửi comment** hoặc nhấn **Enter** trong ô comment, extension chờ ô comment được xóa và comment mới của shop xuất hiện, rồi mở hộp nhắn riêng giống **Alt+B** và điền **/** vào ô **Nhập nội dung tin nhắn**. Bạn tiếp tục chọn/soạn nội dung và tự gửi tin riêng. Không ghi đè nháp riêng có sẵn; đổi hội thoại, bắt đầu gõ hoặc tắt công tắc sẽ hủy bước đang chờ. Bước này dùng chung công tắc Hỗ trợ trả lời comment. Bản 0.9.4 nhận diện hội thoại cả khi dòng đang chọn nằm ngoài danh sách hiển thị, chờ nút khi Pancake vẽ lại giao diện; giữ sửa nhận diện comment hai dòng và mở bằng nút nhắn riêng của comment, không phụ thuộc phím giả lập. Bản 0.9.5 bổ sung Enter; Shift+Enter xuống dòng, gõ bộ gõ và giữ phím không kích hoạt. Bản 0.9.6 nhận cả hai dạng biểu tượng nhắn riêng trước và sau khi đã liên hệ khách. Sau cập nhật cần tải lại extension và tab Pancake.

Bản 0.9.1 xác nhận comment bằng khóa hội thoại và ID dòng comment tương ứng trong vùng đang mở, không phụ thuộc hình dạng icon. Sửa điều kiện chờ khi Pancake thay node hội thoại hoặc giữ nguyên nội dung comment. Sau cập nhật phải tải lại extension và tab Pancake, kiểm tra công tắc này đang bật rồi bấm lại dòng comment.

Tải lại extension và tab Pancake, rồi mở popup → Pancake → bật **Hỗ trợ trả lời comment** (mặc định tắt). Khi bấm dòng hội thoại comment ở cột trái, extension chờ vùng bài viết/comment tải xong rồi điền vào ô trả lời trống:

```text
Dạ em đã gửi tin nhắn cho mình rồi đó ạ 🥰
Anh/chị vui lòng kiểm tra tin nhắn giúp em nha.
```

Bạn tự gửi. Đây là mẫu điền cố định, không kiểm tra hoặc thực hiện gửi tin nhắn riêng cho khách. Tin nhắn Messenger được bỏ qua; ô đã có nội dung được giữ nguyên. Chuyển hội thoại, bắt đầu gõ, tắt công tắc hoặc bật ghi nhận giao diện sẽ hủy lần điền đang chờ. Tính năng độc lập với hỗ trợ lên đơn và AI.

| Công tắc | Mặc định | Hoạt động |
| --- | --- | --- |
| Hỗ trợ lên đơn | Bật | Khi bấm một hội thoại, mở **Tạo mới**, bấm **Địa chỉ**, chọn gợi ý đầu tiên nếu có. |
| Tự điền ghi chú in | Bật | Khi thêm/xóa/sửa số lượng sản phẩm, tự mở và cập nhật **Ghi chú in** theo quy cách × số lượng, không cần tích miễn phí giao hàng. |
| Tự điều chỉnh giá Miến Sâm | Tắt | Khi **bạn** tích **Miễn phí giao hàng**, nếu mọi sản phẩm đều là Miến Sâm và tổng kg có trong bảng giá, điền mức chênh lệch vào **Giảm giá** khi tổng tiền lớn hơn giá mốc. |
| Tự tạo đơn | Tắt | Sau bước trên, bấm **Lưu** ghi chú, chờ trình soạn đóng, rồi bấm **Tạo đơn**. Chỉ hoạt động khi **Tự điền ghi chú in** cũng bật. |
| Chuẩn hóa tag sau tạo đơn | Tắt | Sau lần bấm **Tạo đơn** tự động hoặc thủ công, đợi Pancake xác nhận có đơn mới, rồi chỉ giữ **Đã Lên Đơn** và **Đã Gửi**. |

Extension **không tự tích Miễn phí giao hàng**. Khi **Tự tạo đơn** tắt, bạn tự xem lại, lưu ghi chú và tạo đơn. Khi **Chuẩn hóa tag** tắt, extension không sửa tag.

Bản 0.4.2 tiếp tục nhận diện đúng hội thoại khi Pancake không còn gắn `id` lên dòng hội thoại; bước điều chỉnh giá và tự tạo đơn không bị dừng sớm vì thiếu `id`. Nếu Pancake trả tab về **Thông tin** trong lúc đổi hội thoại, extension kiểm tra và mở lại **Tạo mới** một lần.

Bản 0.4.3 phản ứng ngay khi giao diện sẵn sàng để giảm thời gian chờ giữa các bước. Khi bạn thao tác thủ công trong form hoặc bấm Tạo đơn, extension hủy thao tác mở form/chọn địa chỉ còn chờ. Ghi chú cũng được kiểm tra lại theo hội thoại và sản phẩm hiện tại trước khi điền.

Trong **Kiểm tra giao diện**, việc ghi nhận tạm dừng các thao tác tự động cho đến khi đủ 4 lần bấm hoặc bạn bấm **Dừng ghi nhận**. Bắt đầu ghi nhận không thay đổi các công tắc tính năng đã chọn.

## Phân nhóm đơn trên POS Cake

**Sửa nhãn tồn kho (0.9.11):** “Còn thiếu: 1/4/…” là cảnh báo tồn kho của POS. Extension loại nhãn này khỏi tên trước khi đọc quy cách/số lượng, nên miến có hoặc không có cảnh báo vẫn cộng chung và vào cùng nhóm in. Sau khi cập nhật, Reload extension và tab POS rồi quét lại để thay kết quả cũ.

**Tổng sản phẩm (0.9.10):** sau khi quét, phía trên danh sách nhóm có bảng tổng kg từng loại trên toàn bộ kết quả, cùng tổng khối lượng. Các quy cách cùng loại được cộng chung (1kg × 2 và 2kg × 1); miến sợi to/nhỏ vẫn riêng. Đơn chưa đọc đủ sản phẩm không được cộng và có cảnh báo số đơn còn thiếu. Sản phẩm không có kg/g trong tên hiển thị số đơn vị riêng. Clear xóa cả bảng tổng; quét lại tính mới, không cộng dồn lần trước.

**Bản 0.9.7:** thao tác POS dừng khi tắt tính năng hoặc phát hiện URL/trạng thái lọc thay đổi; không mở in khi đang chọn nhóm. Nếu dừng giữa chừng, những đơn đã chọn vẫn giữ nguyên: dùng Clear ở bộ lọc cũ hoặc bỏ chọn trên POS trước khi quét lại. Đã tăng thời gian chờ tối đa cho bảng nổi sản phẩm tải chậm, đồng thời giữ tốc độ đọc nhanh khi nội dung sẵn có. Sau khi cập nhật, tải lại extension và tab Pancake/POS.

Nút **Clear** xóa kết quả phân nhóm và bỏ chọn các đơn do extension đã chọn trong bộ lọc hiện tại. Nếu còn đơn được chọn thủ công trên POS, hãy bỏ chọn trước khi quét lại. Sau khi **Chọn nhóm để in** thành công, nút của nhóm đó chuyển màu xám để đánh dấu đã thao tác; vẫn có thể bấm lại để chọn lại nhóm. Màu xám được giữ đến khi Clear hoặc quét lại.

1. Trên trang **Đơn hàng** của POS Cake, đặt bộ lọc đơn cần in (ví dụ **Chưa in**).
2. Trong popup, mở mục **POS Cake** và bật **Phân nhóm đơn để in**.
3. Bấm nút **Phân nhóm đơn** ở góc dưới phải của trang POS, rồi bấm **Quét và phân nhóm**. Extension cuộn danh sách trong bộ lọc hiện tại; với đơn có “Nhiều sản phẩm”, nó đọc bảng nổi chứa đầy đủ tên và số lượng như khi rê chuột vào ô này. Không cần mở cửa sổ chi tiết từng đơn nên quét nhanh hơn. Quá trình này chỉ đọc đơn, không lưu hay đổi trạng thái.
4. Chọn một nhóm, kiểm tra mã đơn, rồi bấm **In nhóm bằng POS**. Extension dùng chức năng in hàng loạt của POS để in **phiếu gốc của từng đơn** trong nhóm. Lặp lại cho các nhóm khác. POS có thể mở bước xác nhận hoặc hộp thoại máy in theo cấu hình in của bạn.

Nhóm được xác định theo **thành phần đóng gói**: khối lượng trong tên sản phẩm nhân với số lượng, tách riêng sợi nhỏ, sợi to và các sản phẩm khác. Chẳng hạn `2KG Miến Sâm Sợi To x 1` và `1KG Miến Sâm Sợi To x 2` cùng nhóm **2kg miến sâm to**; đơn gồm **2kg miến sâm nhỏ + 1kg miến sâm to** thành nhóm riêng. Tên `Miến Sợi Nhỏ/To` trên POS được hiểu là Miến Sâm tương ứng. Sản phẩm không có `kg/g` được gom theo tên và số lượng.

Extension không in đơn có dữ liệu sản phẩm thiếu hoặc không đọc đủ. Nếu số đơn quét được khác tổng số đơn POS báo trong bộ lọc, tính năng yêu cầu quét lại. Hãy bỏ chọn những đơn đã chọn thủ công trên POS trước khi quét. Sau khi thay bộ lọc, quét lại để có nhóm mới.

### Bảng giá Khoai Sọ Mán Mộc Châu (từ 0.9.8)

Dùng chung công tắc **Tự điều chỉnh giá Miến Sâm / Khoai**. Khi bạn tích Miễn phí giao hàng, đơn chỉ gồm Khoai Sọ Mán Mộc Châu được tính tổng kg từ tên × số lượng: **6kg = 240.000đ**, **10kg = 380.000đ**. Ví dụ gói 3kg × 2 giá 260.000đ hoặc gói 5kg × 2 giá 400.000đ đều điền Giảm giá 20.000đ. Chỉ giảm khi tổng tiền cao hơn mốc; các khối lượng khác, loại khoai khác hoặc đơn lẫn khoai/miến/sản phẩm khác được bỏ qua. Công tắc đã lưu từ bản cũ được giữ nguyên.

### Bảng giá Miến Sâm

| Tổng kg | Giá |
| --- | ---: |
| 1kg | 90.000đ |
| 2kg | 140.000đ |
| 3kg | 199.000đ |
| 4kg | 260.000đ |
| 5kg | 325.000đ |
| 6kg | 390.000đ |
| 10kg | 600.000đ |

Extension đọc quy cách từ tên từng sản phẩm, nhân với số lượng rồi cộng tổng kg, không phân biệt sợi to hay nhỏ. Tên **Miến Sợi Nhỏ/To** cũng được tính vì trên Pancake có biến thể này thiếu chữ “Sâm”; các loại miến khác không được tính. Ví dụ 3kg có **Tổng giá trị đơn hàng** 240.000đ sẽ nhập **Giảm giá** 41.000đ để tổng cuối là 199.000đ. Mức giảm được nhập là số tiền tuyệt đối, không cộng dồn qua các lần chạy. Nếu tổng tiền đã bằng hoặc thấp hơn giá mốc, extension không chỉnh giảm giá. Đơn có sản phẩm khác, thiếu quy cách hoặc tổng 7–9kg sẽ được bỏ qua; các khối lượng không có trong bảng cũng vậy. Công tắc này hoạt động độc lập với **Tự điền ghi chú in**; nếu đang bật **Tự tạo đơn** mà việc điền giá đủ điều kiện không được xác nhận trên giao diện, extension sẽ không tự bấm **Tạo đơn**.

### Ví dụ ghi chú

- `(2026) 1KG Miến Sâm Sợi Nhỏ` số lượng 1 → `1kg miến sâm nhỏ`.
- `1Kg Miến Sâm Sợi To` số lượng 2 → `2kg miến sâm to`.
- `(2026) 2KG Miến Sâm Sợi To` số lượng 2 → `4kg miến sâm to`.
- Các dòng cùng loại được cộng lại; ví dụ hai dòng sợi to trên → `6kg miến sâm to`.

Extension lấy quy cách từ **tên sản phẩm**, không lấy dòng khối lượng phụ trên Pancake: sản phẩm mang tên `2KG` từng hiển thị `1000 g` ở dòng phụ. Sản phẩm không có quy cách `kg/g` trong tên được ghi dưới dạng `số lượng x tên sản phẩm`. Ghi chú có sẵn không phải tóm tắt khối lượng được giữ và nối thêm bằng ` | `.

## Kiểm tra nhanh

Chạy `node --test product-summary.test.js pricing.test.js pos-groups.test.js` để kiểm tra phép tính khối lượng, bảng giá và gom nhóm. Có thể chạy `node --check content.js`, `node --check pos-content.js` và `node --check popup.js` để kiểm tra cú pháp. Kiểm thử luồng tạo đơn và tag trên một hội thoại thử nghiệm; nút **Tạo đơn** có tác dụng thật trên Pancake.

Để thử toàn bộ luồng bằng dữ liệu mô phỏng trên Chrome, chạy `node tests/serve.cjs`, mở `http://127.0.0.1:8765/multi_pages` rồi bấm **Chạy toàn bộ kiểm thử**. Trang này dùng mã extension thật, không tạo đơn trên Pancake. Các bộ chọn vẫn cần được đối chiếu lại trên trang đăng nhập khi Pancake đổi giao diện.

AI Beta: chạy `node --test ai-order-plan.test.cjs chat-reader.test.cjs chat-content.test.cjs ai-protocol.test.cjs ai-transport.test.cjs`. Kiểm thử điền nháp trên Chrome: `node tests/ai-serve.cjs`, mở `http://127.0.0.1:8766` rồi bấm **Chạy kiểm thử**. Dữ liệu mô phỏng, không gọi OpenAI/Pancake.

## Dành cho người phát triển hoặc AI tiếp theo

Kết quả rà soát gần nhất: [Báo cáo kiểm thử 15/10/2026](docs/TEST_REPORT_2026-10-15.md). Kiểm thử POS trên Chrome: `node tests/pos-serve.cjs` rồi mở `http://127.0.0.1:8769/shop/test/order`. Kiểm thử popup: `node tests/popup-serve.cjs` rồi mở `http://127.0.0.1:8770/`. Các trang mô phỏng dùng mã extension thật và không tạo đơn, gửi khách hoặc in phiếu thật.

Đọc [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) để nắm luồng xử lý, bộ chọn DOM đã xác nhận trực tiếp, nguyên nhân các lỗi đã sửa và cách mở rộng. [AGENTS.md](AGENTS.md) là bản hướng dẫn ngắn cho tác nhân AI mới.
Lịch sử các mốc phát triển nằm trong [CHANGELOG.md](CHANGELOG.md).
