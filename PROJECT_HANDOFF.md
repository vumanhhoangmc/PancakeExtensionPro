# Bàn giao kỹ thuật — Pancake Assistant Pro

Cập nhật: 05/11/2026. Phiên bản manifest: `0.10.2`. Đây là extension Chrome Manifest V3 viết bằng JavaScript thuần, chạy trên giao diện Hội thoại Pancake và Đơn hàng POS Cake. Mỗi tính năng có công tắc riêng. Trang đích là `https://pancake.vn/multi_pages` và `https://pos.pancake.vn/shop/.../order`. Có helper Node localhost cho AI Beta và helper Native Messaging cho cập nhật Windows; không có backend được triển khai trên mạng, API key hay cookie trong dự án. Không cần build để phát triển; có script đóng gói dành riêng cho GitHub Releases.

## Chặn vòng lặp cập nhật 0.10.2

Triệu chứng thật: worker đang chạy 0.10.1 nhưng helper đọc `%LOCALAPPDATA%\PancakeAssistantPro\extension` bản 0.10.0. Điều kiện `installedVersion !== loaded` cũ coi cả bản thấp hơn là sẵn sàng và reload không đổi thư mục, dẫn tới lặp. Worker nay so số phiên bản, chặn hạ bản và dữ liệu thiếu, kiểm tra marker `update-installation.json` cùng helper trước check/apply, đọc manifest của chính folder trước reload. `extensionUpdateReload: { from, to }` lưu trước reload để worker mới không lặp nếu loaded vẫn không đổi; thành công/current mới xóa guard. Lỗi không giữ pending nên đóng tab không kích tiếp.

Helper yêu cầu installationId và loadedVersion, chặn bản đang chạy mới hơn bản quản lý ngay trước truy cập mạng. Marker UUID được installer sinh tại máy, applyBundle giữ qua stage/swap/rollback; không nhận marker từ release. Installer gọi `installPackage` để nâng bản đã cài nếu source mới hơn, không bỏ qua folder cũ như trước; dùng mutex/journal, giữ marker và không downgrade. Cần chạy lại ZIP/installer 0.10.2 một lần để nâng helper và Load unpacked đúng folder được in ra, nhập ID của bản quản lý. Source không có marker nên tự cập nhật bị dừng rõ ràng.

Đã vá riêng helper core đang cài trên máy trong phiên này để nó từ chối giao thức/folder cũ, không yêu cầu reload tiếp; lưu bản gốc `updater/core.before-0.10.2.cjs`. Kiểm tra qua framing native vào host thật xác nhận trả lỗi an toàn. Không thay ID đã đăng ký, token, công tắc hoặc tab đang làm việc. Bản mới cần người dùng chạy installer và nạp đúng thư mục; không tự phát hành GitHub.

## Sửa đường dẫn Windows 0.10.1

Run GitHub Actions `41995380930` thất bại tại Verify: máy runner dùng `%TEMP%` qua tên ngắn `RUNNER~1`, `realpath` trả `runneradmin`; `assertDirectory` cũ so chuỗi nên nhầm alias thành junction. Sửa bằng lstat từng thành phần đường dẫn đến root, không so cách viết. Vẫn từ chối liên kết ở thư mục đích lẫn ancestor. Test installer so realpath hai đường dẫn file host để chấp nhận tên ngắn/dài; test đóng gói đọc version từ manifest để không chặn các release sau. Thêm hồi quy 8.3 thật trên Windows (đã thấy thất bại trước sửa) và junction ở ancestor. Chuẩn bị phát hành `v0.10.1`; không cần đổi/xóa tag `v0.10.0` đã lỗi. Không sửa luồng DOM Pancake.

## Tự cập nhật GitHub 0.10.0

`update-worker.js` là service worker mới, chỉ xử lý cập nhật; thêm quyền `alarms` và `nativeMessaging`. Kiểm tra khi Chrome khởi động/cài, mỗi 60 phút và theo nút popup. Chỉ nhận yêu cầu thủ công từ URL popup cùng ID, không nhận yêu cầu từ content script. Khi còn tab pancake.vn/subdomain thì chờ; sau khi đóng hết, gọi helper apply rồi `chrome.runtime.reload()`. Kiểm tra lại tab sau apply để trì hoãn reload nếu tab vừa mở. Popup dùng script riêng `popup-update.js`, giữ nguyên năm công tắc và logic `popup.js`/`content.js`.

`updater/install.ps1` trong ZIP phát hành chép extension vào `%LOCALAPPDATA%\PancakeAssistantPro\extension`, helper vào thư mục anh em `updater`, đăng ký HKCU Chrome NativeMessagingHosts `com.pancakeassistant.updater`. Node.js >=22, không admin/service/task nền. Người dùng Load unpacked thư mục cài và nhập ID để bind allowed_origins; lần đầu đổi thư mục/ID cần tắt bản cũ, chọn lại công tắc. Các lần update dùng cùng đường dẫn nên giữ storage. Repo private dùng PAT Contents: read lưu DPAPI `github-token.xml` tại máy; token chỉ gửi GitHub API, bỏ Authorization khi chuyển hướng CDN. Không copy token vào extension hoặc source.

`updater/core.cjs`: đọc release ổn định mới nhất của `vumanhhoangmc/PancakeExtensionPro`, kiểm tra version Chrome/tag, asset cố định `pancake-update.json`, digest SHA-256 GitHub, từng file base64/hash và dependency manifest/HTML. Chỉ nhận tên file runtime ở cấp gốc. Chặn downgrade, checkout `.git`, symlink/junction. Ghi stage đầy đủ, journal bền vững rồi rename thư mục; lỗi/ngắt trước commit khôi phục backup ở lần gọi tiếp theo. Mutex Windows theo đường dẫn cài + khóa PID chống hai host cùng sửa, kể cả khi thu hồi khóa sau crash. Helper native không tự thay chính nó; thay giao thức cần chạy lại installer. AI helper đang chạy không bị dừng, người dùng phải khởi động lại nếu release thay mã AI helper.

`updater/build-release.cjs` + `runtime-files.json` tạo bundle và thư mục cài (không có test, .git, token). Workflow `.github/workflows/release.yml` chạy tests và xuất bản 2 asset khi push tag `v<manifest.version>`. Push tag là phát hành tới mọi máy đã cài updater, chỉ làm khi sẵn sàng. Hướng dẫn đầy đủ: `docs/AUTO_UPDATE.md`. Repo không truy cập được hoặc chưa có Release phải hiện lỗi, không báo bản mới nhất giả. Chưa publish trong phiên triển khai; kiểm chứng tải Release thật cần repo/token và bản phát hành đầu tiên.

Kiểm chứng 05/11: 86/86 Node tests toàn dự án, gồm apply/check, checksum, rollback sau swap, journal/khóa PID sau crash, mutex Windows chống host song song và giải phóng khi process bị kill, framing native, origin, private token redirect và installer PowerShell thật với registry mô phỏng. Popup Chrome fixture 6/6 hồi quy, mục hướng dẫn cập nhật hiển thị đúng. Cú pháp JS/PowerShell và whitespace đạt. Chưa cài host vào registry thật, chưa kiểm chứng `sendNativeMessage` từ extension cài thật hay tải Release thật. Không tạo đơn/gửi tin/in thật.

## Sửa nhãn tồn kho POS 0.9.11

Nguyên nhân: `readMultiProductOrder` dùng textContent cả `.ant-menu-title-content`, ghép badge “Còn thiếu: 1” vào tên `(2026) 1KG Miến Sâm Sợi Nhỏ`. Tiền tố năm không còn ở đầu nên normalizeName không bỏ được; composition giữ nhãn như một phần tên, làm tách cả tổng kg và nhóm in. Đã tái hiện parser cũ trả `1kg còn thiếu: 1(2026) miến sâm sợi nhỏ`.

`productText(element)` clone DOM, chỉ bỏ `.ant-tag` có nội dung bắt đầu “Còn thiếu:”, rồi đọc text. Dùng chung cho ô đơn lẻ và từng dòng tooltip, giữ nguyên lượng mua `x N` và quy cách sản phẩm. `parseListProduct` có fallback bỏ prefix cảnh báo khi còn ranh giới rõ (space hoặc dấu ngoặc trước tên); chuỗi số dính liền không phân định được bị từ chối để tránh đoán kg. Không lấy số thiếu tồn kho làm số lượng mua.

Đối chiếu POS đăng nhập: nhãn tồn kho trong chi tiết đơn là `<span class="ant-tag ...">Còn thiếu: 1</span>` đứng cạnh tên hàng. Đã đóng modal, không chọn/in/sửa đơn thật. Fixture thêm badge 1/4 không có khoảng trắng trước tên cho cả ô đơn lẻ lẫn tooltip; kiểm tra vẫn 3 nhóm 8 đơn, 16kg nhỏ/32kg to/48kg. Kết quả cũ cần Reload extension/tab và quét lại.

Kiểm tra 0.9.11: 18/18 Node tests POS/summary/pricing, 13/13 Chrome POS fixture và cú pháp đạt. Console fixture không có lỗi/cảnh báo. Ảnh kiểm thử: `docs/pos-stock-label-fix-0.9.11.png`. Phiên bản cài chưa được reload bằng công cụ, cần người dùng Reload extension/tab rồi quét lại.

## Tổng sản phẩm POS 0.9.10

`groupOrders` bổ sung `productTotals: [{ name, unit: 'kg'|'item', quantity }]`. Cộng các entry của khóa composition đã chuẩn hóa × số đơn trong mỗi nhóm; không đọc DOM hoặc quét lại. Cùng tên khác quy cách kg/g được cộng chung, khác loại vẫn tách. Chỉ cộng đơn đọc đủ/đủ mã và rowKey; đơn unclassified không cộng một phần. Làm tròn đến 0,001kg như khóa nhóm. Kiểu trả về composition và luồng chọn/in giữ nguyên. `renderGroups` thêm `.pap-pos-totals` bên trong `#pap-pos-groups`, hiển thị bảng và tổng kg; đơn thiếu dữ liệu/không có quy cách có chú thích. Clear và quét mới xóa/thay cùng container nên không lưu tổng cũ. Unit tests kiểm tra đổi quy cách, g, alias, đơn hỗn hợp và thiếu dữ liệu; Chrome fixture kiểm tra bảng 16kg nhỏ/32kg to/48kg và Clear.

Kiểm tra 0.9.10: 16/16 Node tests (POS + pricing + summary), 12/12 Chrome POS fixture, cú pháp content/popup/POS/fixture và diff whitespace đạt. Ảnh UI mô phỏng: `docs/pos-totals-0.9.10.png`. Không in đơn thật để thử.

## Ghi chú theo sản phẩm 0.9.9

`checkProductNote` so sánh form, hội thoại và JSON `orderProducts`; MutationObserver lọc các thay đổi DOM thuộc `.crm-platform`, cộng listener input/change cho quantity. Mỗi thay đổi hủy note/create cũ, debounce 180 ms rồi gọi `fillPrintNote(..., false, true)`. Cờ `productChange` bỏ yêu cầu free shipping nhưng tuyệt đối không gọi `submitAfterNote`; vẫn kiểm tra form còn gắn đúng DOM, hội thoại, runId và snapshot sản phẩm. Checkbox miễn phí chụp lại baseline/hủy timer để luồng giá → note → create hiện có không bị tranh tác vụ. Không chỉnh giá do riêng thay đổi sản phẩm.

`sectionSummaries` WeakMap lưu summary theo section + hội thoại, giữ được sau khi editor được dựng lại. `noteWithSummary` thay hậu tố đã sinh, giữ lời dặn và dọn dấu ` | ` khi xóa hết sản phẩm. Nếu sản phẩm không hợp lệ, chưa có tóm tắt hoặc không biết phần nào do extension sinh thì không xóa tùy tiện. Chỉ điền editor, không tự lưu/tạo đơn từ thay đổi sản phẩm. Đã đối chiếu form và `.note-print-order .text-note` (Thêm ghi chú) trên Chrome đăng nhập ngày 27/10; dùng `.text-note` để mở cả ghi chú đã lưu. Bộ fixture bổ sung thêm/xóa/quantity/focus, ghi chú riêng/đã lưu, free tích sẵn, đổi nhanh và tắt/chuyển hội thoại. Có 1 observer thường trực; các observer chờ tạm vẫn phải thu hồi.

## Bảng giá Khoai 0.9.8

Kiểm tra bản 0.9.9 ngày 27/10: 23/23 ca Chrome fixture (8 ca mới + 15 ca hồi quy), 58/58 Node tests, syntax content/popup/fixture và diff whitespace đều đạt. Không tạo đơn/gửi tin thật; bản mới cần Reload extension + tab. Ảnh kết quả: `docs/live-note-0.9.9.png`.

`pricing.js` thêm `taroPrices`: 6kg → 240000, 10kg → 380000. `calculateDiscount` nhận chính xác tên Khoai Sọ Mán Mộc Châu sau khi bỏ quy cách/năm và chuẩn hóa khoảng trắng, cộng kg × số lượng. Tất cả dòng phải thuộc cùng bảng (miến hoặc khoai); hỗn hợp và mốc chưa khai báo trả null. Giữ kiểu kết quả `{ kilograms, targetTotal, discount }` để hai caller `adjustMienSamPrice` và `priceVerifiedForCurrentOrder` dùng nguyên luồng hiện tại. Giữ khóa storage `autoMienSamPrice` và ID popup để không mất lựa chọn cũ, chỉ đổi nhãn hiển thị sang Miến Sâm / Khoai. Không tự tích miễn phí giao hàng. Bổ sung test 3kg×2, 5kg×2, cộng nhiều dòng, không tăng giá, sai loại và đơn hỗn hợp.

## Rà soát ổn định 0.9.7

Giữ nguyên luồng Pancake, comment và AI sau khi chạy hồi quy. Sửa POS: mỗi thao tác giữ `operationContext` gồm generation, URL/trạng thái lọc và holder. Kiểm tra lại sau await, trước click checkbox và trước công bố kết quả. Tắt rồi bật nhanh vẫn làm generation cũ hết hiệu lực. `finally` không cuộn lại danh sách mới nếu tác vụ đã bị hủy. Không mở in khi `scanning` hoặc đang có modal hiển thị.

`changeSelection` lấy lại row/input theo `data-row-key` sau mỗi lần click vì React có thể thay toàn bộ hàng. Ghi nhận `selectedKeys` theo từng checkbox đã xác minh, kể cả khi mới chọn một phần, để Clear có thể xử lý phần đã chọn. Bỏ chọn dùng bản sao của Set, tránh vừa duyệt vừa thay tập khóa. Sau hủy, các checkbox đã chọn trước đó được giữ; không tự hoàn tác trên bộ lọc khác. Người dùng có thể Clear ở bộ lọc cũ hoặc bỏ chọn trên POS. Khóa bộ lọc hiện gồm URL và nội dung các radio đang chọn; bộ lọc chỉ đổi nội bộ nhưng giữ nguyên cả hai dấu hiệu này vẫn cần người dùng quét lại.

Modal ẩn không chặn tác vụ. Tooltip nhiều sản phẩm được chờ tối đa 1.500 ms (trước 700 ms), trả về ngay khi có nội dung; vẫn poll 70 ms và cuộn 60 ms nên không thêm 800 ms vào các dòng tải bình thường. Không thay đổi cách nhóm/giá hoặc thêm tự gửi/tự tích miễn phí giao hàng.

Bộ thử mới: `node tests/pos-serve.cjs` → `http://127.0.0.1:8769/shop/test/order` (11 ca bảng ảo, tooltip tái sử dụng/tải chậm, React thay row, chọn lại/xám/Clear, tắt/đổi URL giữa tác vụ, chặn in thiếu/đang chọn). `node tests/popup-serve.cjs` → `http://127.0.0.1:8770/` (6 ca dùng popup HTML/CSS/JS thật, mock Chrome storage/tabs). Máy chủ chỉ nghe 127.0.0.1, không nạp vào manifest. Xem báo cáo [15/10/2026](docs/TEST_REPORT_2026-10-15.md).

GitNexus được rebuild thành công sau khi tăng buffer cho riêng tiến trình lên 1 GiB. Impact `changeSelection` HIGH: callers trực tiếp `selectGroup` và `clearGroups`, lan tới render/quét nhóm; đã kiểm tra cả các luồng đó. Entry handlers có UNKNOWN được đối chiếu addEventListener/storage trong nguồn. Graph có cảnh báo giới hạn số flow, không coi các flow vắng mặt là không có ảnh hưởng.

## Hai trạng thái nút nhắn riêng 0.9.6

Người dùng đã xác nhận 0.9.5 chạy tốt rồi báo lại lỗi ngày 14/10. Đối chiếu Sinh Đinh trên Pancake: root/selected key và nút gửi vẫn khớp, nhưng action nhắn riêng chưa kích hoạt dùng SVG outline path bắt đầu M140,128a12 và chứa 84,116. Bản trước chỉ nhận SVG filled bắt đầu M128,24A104, chứa 84,140 (is-active). Thêm đúng selector outline vào cùng action trong root comment; không chọn theo vị trí hoặc toàn trang. Bấm nút outline thật mở modal “Gửi tin nhắn từ bình luận tới” với #previewReplyInput; modal tùy lịch sử có thể khác tiêu đề “Gửi tin nhắn trực tiếp tới”. Đã đóng modal, không gửi tin thật, giữ draft comment của người dùng.

Chrome fixture nay mặc định dùng path outline đầy đủ lấy từ DOM, #filled dùng dạng cũ. Xác nhận selector cũ false trên outline; bản mới click và Enter đều mở box nhận '/'; filled click vẫn nhận '/'. 25 Node tests và cú pháp content/popup/followup đạt. Impact file/fixture UNKNOWN do chưa có trong graph; nơi nạp manifest và fixture được xác minh nguồn. Chưa kiểm chứng lượt gửi thật với bản cài 0.9.6; cần reload extension/tab.

## Lịch sử gửi comment bằng Enter 0.9.5

Người dùng xác nhận gặp lỗi cả nút gửi và Enter. onAction capture dùng chung cho click/keydown. Enter chỉ arm khi target chính là #messageCol #replyBoxComposer, không Shift, không IME/isComposing/keyCode 229, không repeat; không preventDefault và không tự gửi. Cả hai cách vẫn phải thấy composer trống và comment shop ID mới khớp nội dung, rồi mở box và điền '/'. Các phím/thao tác trusted khác hủy chờ. Vẫn giữ bản sửa khóa hội thoại khi row không còn trong DOM ở 0.9.4.

25 kiểm thử Node đạt; Chrome fixture xác nhận cả Enter và bấm gửi mở box nhận '/'. Fixture send handler hỗ trợ hai cách, xóa selected row và render br. Không gửi khách thật để thử. Impact module/test/fixture UNKNOWN; manifest/fixture/test là nơi dùng đã đối chiếu nguồn. Bản cài cần reload extension và tab Pancake; chưa xác nhận lượt gửi thật sau reload.

## Lịch sử sửa khóa hội thoại khi mở nhắn riêng 0.9.4

Đối chiếu tab Pancake thật: comment khách message_1077252308444161_2885370075178481 vẫn mở, nhưng .conversation-list-item.selected không có trong DOM do danh sách ảo chỉ giữ các row đang hiển thị. selectedKey cũ trả undefined nên điều kiện khởi động followup dừng trước khi chờ gửi. Nay ưu tiên row key; khi row vắng chỉ fallback nếu có đúng một #messageCol .comment-message-ele.media-current-customer[id], lấy khóa số_số từ id. Không fallback từ tên khách hoặc comment shop; nhiều comment khách thì từ chối. Kiểm tra lại khóa trong từng lần polling để không mở nhầm người.

Không yêu cầu nút nhắn riêng có kích thước vì action có thể ẩn khi không hover. Chỉ mở khi tìm đúng action trong root đang mở và không disabled. Nếu nút tạm mất do React rerender, tiếp tục polling trong giới hạn 8 giây; chỉ đặt opened sau khi tìm được nút. Không tự gửi comment/inbox. Node 23/23 đạt; Chrome fixture xóa selected row ngay lúc gửi, comment hai dòng dùng br, vẫn mở box và điền '/'. Chưa kiểm chứng toàn bộ luồng gửi thật trên extension đã reload, không gửi khách chỉ để thử. Impact file/test/fixture UNKNOWN, caller qua manifest và fixture/test đã xác minh trực tiếp.

## Lịch sử sửa mở nhắn riêng comment 0.9.3

Lỗi thực tế: comment-body-text dùng <br> giữa hai dòng. textContent ghép “🥰Anh/chị” trong khi composer có xuống dòng, khiến includes(sentText) thất bại và không chạy bước mở box. Nay dùng innerText để đối chiếu văn bản hiển thị. Không bỏ điều kiện composer trống + comment shop ID mới.

Mở box bằng nút .comment-action-btn trong root message_<selectedKey>, có SVG path bắt đầu M128,24A104 và chứa 84,140; đây là nút bong bóng ba chấm của comment khách, đã bấm trên Pancake thật và xác nhận mở đúng modal #previewReplyInput như Alt+B. Không dùng nút Trả lời nhanh ở reply_box. Bỏ phím giả lập để tránh phụ thuộc shortcut/focus. Chỉ bấm một lần sau thành công, không tự gửi nội dung. Các guard, giữ nháp và công tắc vẫn áp dụng.

GitNexus repo PancakeExtensionPro: index chậm 1 commit, impact file/test/fixture UNKNOWN; query không có flow mới. Đối chiếu manifest và test/fixture xác nhận nơi nạp trước sửa. 19 kiểm thử Node đạt, Chrome fixture tái hiện <br> làm textContent dính hai dòng và xác nhận box nhận '/'. Không gửi comment thật để thử. Tool không reload extension đang cài; người dùng reload extension và tab để nạp 0.9.3.

## Lịch sử hỗ trợ trả lời comment 0.9.2

`comment-followup.js` nạp sau comment-reply.js; dùng chung autoCommentReply/uiRecording. Capture click trusted ở #messageCol #reply_box .new-reply-box-btn có send SVG path bắt đầu M240,127.89 (đối chiếu DOM thật). Lưu khóa hội thoại, text gửi và các ID comment shop trước thao tác. Chờ tối đa 8 giây: selected key giữ nguyên, composer trống và có comment shop ID mới chứa text đã gửi. Sau đó dispatch keydown/keyup Alt+B (key/code/keyCode/which), chờ textarea #previewReplyInput visible, focus và native setter '/' + input/change. Không gọi nút gửi hoặc Enter. Draft riêng đang có nội dung giữ nguyên. Click/input/keydown trusted, tắt tính năng/ghi nhận hoặc đổi selected key hủy. Hiện chỉ bắt nút gửi comment, chưa bắt gửi bằng bàn phím.

Đối chiếu Pancake thật: Alt+B mở modal nhắn riêng, #previewReplyInput nhận '/', đã xóa ký tự thử và đóng modal, giữ nguyên comment draft. Không gửi comment/tin riêng thật để thử. Synthetic Alt+B được kiểm thử trong fixture; không reload extension đang cài vì công cụ chặn chrome-extension://. 4 ca followup Node + 7 ca comment Node đạt; Chrome fixture bấm gửi mô phỏng → Alt+B → '/' đạt. Popup.html/CSS thật được render qua localhost (bỏ popup.js cho preview), 7 hàng có mô tả nằm trong chiều cao, không overlap. CSS .feature dùng padding/border-bottom chung, checkbox không co và min-width 0 cho text. Tải lại extension/Pancake để nạp mã mới.

### Nhận diện comment từ 0.9.1

Đối chiếu lại trên comment Hant Ha: bộ chọn SVG 0.9.0 vẫn true, nên không kết luận icon là nguyên nhân. Row .list-tags-conv có class list_tags_conv_<postId>_<rootCommentId>; comment root trong #messageCol có id message_<postId>_<rootCommentId> và class comment-message-ele. Bản 0.9.1 bỏ gate SVG, tham chiếu row DOM và so sánh node/text cũ. `conversationKey()` lấy khóa bằng regex số_số từ class list-tags-conv. Mỗi lần chờ đọc lại selected row cùng khóa và document.getElementById(message_key), yêu cầu node matches #messageCol .comment-message-ele. Không cần post-module visible; không đoán comment từ tên khách hoặc một icon không rõ. Inbox cùng khóa có inbox-message-ele nên không điền. Nếu thiếu khóa/root thì hết hạn và giữ form. Không dùng nội dung tin nhắn để nhận diện.

Impact comment-reply.js/fixture/tests UNKNOWN vì chưa index; xác minh manifest, test VM và fixture là nơi nạp bằng nguồn. Chưa kiểm chứng toàn bộ bản mới trong extension đang cài vì công cụ chặn chrome-extension://. Đã tái hiện bản cài bấm selected comment không điền; xác nhận selector và khóa trên DOM thật. 7/7 Node đạt, thêm ca thay node row. Chrome fixture thay row mỗi click và tái dùng comment root: điền đúng; click lại với root không đổi vẫn điền; giữ draft; inbox không điền. Không gửi tin/comment thật.

### Lịch sử 0.9.0 (đã thay điều kiện nhận diện ở 0.9.1)

`comment-reply.js` chạy riêng, không sửa content.js. Công tắc `autoCommentReply` mặc định false trong popup. Khi bấm .conversation-list-item có biểu tượng comment (.tag-wrap svg path bắt đầu M232,128A104, đối chiếu thực tế), chờ row selected, #messageCol .post-module và .comment-message-ele cùng #replyBoxComposer visible. Chuyển row cần node/nội dung comment đổi để không điền vào khung cũ khi React đang tải. Chờ tối đa 4 giây, polling 50ms, generation/cancel hủy timer khi click khác, input/keydown trusted, tắt công tắc hoặc ghi nhận UI. Không điền lúc vừa bật công tắc hoặc lúc nạp trang.

Composer textarea dùng native value setter + input/change để React nhận bản nháp. Không focus, không Enter, không gọi nút gửi/API. Ô có text, disabled/readOnly bị bỏ qua. Mẫu đúng hai dòng trong README, không tự kiểm tra/gửi inbox. Chỉ hỗ trợ comment Facebook nhận diện theo icon + vùng bài viết; nếu Pancake đổi icon/selector cần đối chiếu lại, không suy đoán mọi row là comment.

Graph query đã kiểm tra luồng hội thoại; impact popup.js UNKNOWN/index chậm 1 commit nên xác minh popup.html và storage trực tiếp. Module mới được manifest nạp, không có caller cũ. 6/6 kiểm thử comment-reply.test.cjs đạt (text/events, inbox/recording, draft, timeout, cancel, click nhanh). Chrome fixture xác nhận điền hai dòng, giữ draft và bỏ qua inbox. `tests/comment-serve.cjs` cổng 8768, /multi_pages; không kết nối khách. Tool chặn chrome-extension:// nên người dùng reload extension/Pancake để nạp bản thực. Không gửi comment thật khi kiểm thử. Dark mode vẫn đã gỡ.

## Gỡ Dark mode 0.8.2

Người dùng yêu cầu gỡ tính năng. Đã xóa công tắc popup, script/CSS trong manifest và các file dark-mode cùng fixture/ảnh xem trước. Không còn sử dụng khóa pancakeDarkMode cũ trong storage. Tải lại extension và tab Pancake để gỡ CSS/script đã nạp từ phiên bản trước. Impact graph UNKNOWN; đối chiếu manifest/popup/fixture trực tiếp trước khi xóa. Các tính năng Pancake/POS/AI giữ luồng hiện có.

## Cấu trúc dự án

| File | Vai trò |
| --- | --- |
| `manifest.json` | Tên, mô tả, quyền, khai báo content scripts và popup. Nạp `product-summary.js`, `pricing.js` trước `content.js`. |
| `popup.html`, `popup.css`, `popup.js` | Popup hai mục Pancake/POS Cake. Năm công tắc Pancake, công tắc AI Beta và công tắc POS; lưu lựa chọn vào `chrome.storage.local`. |
| `AI_BETA_PLAN.md` | Đánh giá, lịch sử và bước tiếp theo sau kết nối ChatGPT. |
| `ai-beta.html/js/css` | Trang đăng nhập, xem trước chat thật/mẫu, phân tích và chủ động điền đơn nháp. |
| `ai-order-plan.js`, `ai-order-plan.test.cjs` | Schema địa chỉ, đối chiếu hành chính duy nhất, ánh xạ loại sản phẩm/quy cách SKU. Dùng cả Node và content script. |
| `ai-order-dom.js` | Adapter DOM điền tỉnh/huyện/xã, địa chỉ chi tiết, SĐT tại máy và SKU/số lượng; không gửi đơn. |
| `tests/ai-draft-fixture.html/js`, `tests/ai-serve.cjs` | Kiểm thử DOM trong Chrome bằng dữ liệu mô phỏng, cổng 8766. |
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

## AI tự lên đơn — Beta (0.7.4)

### Hoàn thiện và kiểm thử 0.7.4

`searchCatalog()` chờ sản phẩm đúng loại xuất hiện (tối đa 8 giây), rồi mới ổn định/quét danh mục. `addSku()` chờ đúng tên + mã mẫu mã trên popup hiện tại, không ngủ cố định 500ms rồi kết luận thiếu SKU; nhiều lựa chọn cùng danh tính bị từ chối. `quantityInput()` chịu được khoảng trống lúc React thay dòng. Các điểm chờ vẫn gọi guard `current()` để hủy khi người dùng đổi hội thoại/thao tác.

`matchRegion()` trả mã lỗi REGION_NOT_FOUND/REGION_AMBIGUOUS. `selectAddress()` thử hệ cũ trước theo AI; chỉ khi REGION_NOT_FOUND mới thử hệ mới với cùng province/commune. Từng cấp chờ tối đa 6 giây và chỉ chọn equality duy nhất; không fallback khi trùng tên, tác vụ bị hủy hoặc lỗi điều khiển. Không đổi tên địa danh hay đoán huyện. Hàm trả `{region, system}`; `applyDraft()` trả thêm `addressSystem`, trang AI hiển thị hệ đã dùng. Chi tiết trống không tạo dấu phẩy đầu chuỗi hoặc chữ null. Thông báo khởi động lại helper chỉ xuất hiện khi đề xuất thiếu delivery.

Đối chiếu ngày 12/10/2026 trên Pancake đăng nhập: hệ mới có Phường Chánh Hưng thuộc Hồ Chí Minh (168 lựa chọn xã/phường trong DOM). Chat có quận cũ nên AI có thể nhận old, mặc dù xã thuộc new; fallback giải quyết sự lệch hệ bằng danh mục. Shop cam có CAM4/CAM5 TikTok và CAM1/CAM2 thường; ánh xạ tên chính xác chọn CAM2 thường. Thử thêm CAM2 trên form trống, đổi số lượng 2, xác nhận tổng 750.000đ; đã xóa dòng thử, xác nhận 0 dòng/0đ và giữ thông tin khách. Không tạo đơn thật, không thay công tắc, không tự tích Miễn phí giao hàng.

GitNexus impact đã chạy trước sửa các symbol adapter/plan/UI, trả UNKNOWN do các file AI chưa nằm trong index. Đã kiểm tra caller bằng nguồn: validate/adapter dùng matchRegion, applyDraft dùng searchCatalog/selectAddress/addSku, chat-content gọi applyDraft, ai-beta nhận kết quả. UNKNOWN không được tính là không có tác động. Không commit trong lượt này.

38/38 kiểm thử Node, 12/12 ca AI DOM Chrome và 15/15 ca Pancake cũ Chrome đạt; cú pháp content/popup/adapter/plan/UI/chat-content/fixture đạt. Chi tiết tại [báo cáo kiểm thử](docs/TEST_REPORT_2026-10-12.md). Tool chặn chrome-extension:// nên không reload extension hoặc chạy lượt AI thật qua trang extension trong kiểm thử này; không tuyên bố đã kiểm chứng phần đó. Nâng 0.7.x lên 0.7.4 chỉ reload extension/Pancake và mở lại trang AI, giữ helper/đăng nhập.

### Sửa điều kiện địa chỉ — 12/10/2026

Người dùng yêu cầu địa chỉ cũ chỉ cần province/district/commune, mới chỉ cần province/commune. `validateDraft()` bỏ bắt buộc detail (null chuẩn hóa thành chuỗi rỗng để adapter không điền chữ null); new bỏ district dư bằng null. Bỏ vòng kiểm tra tên hành chính phải xuất hiện nguyên văn trong evidence: ảnh khách ghi `tphcm` nhưng AI trả `Thành phố Hồ Chí Minh`, nên bị chặn sai dù đủ cấp. Cho phép AI chuẩn hóa/diễn giải địa danh; `selectAddress()` vẫn đối chiếu tên duy nhất trong catalog old/new, không sửa selector hay luồng DOM. Giữ kiểm tra evidence nằm trong transcript, bằng chứng số nhà nếu có, dữ liệu bị ẩn, ý định chốt và sản phẩm. Tác động validateDraft: trang AI bật nút Điền đơn, chat-content kiểm tra message và applyDraft kiểm tra trước điền. Impact UNKNOWN vì AI chưa được index; các caller được xác minh qua nguồn. Hồi quy đúng địa chỉ trong ảnh và thiếu từng cấp old/new: thất bại trước sửa, đạt sau sửa; 38/38 ca Node và cú pháp content/popup/plan/adapter đạt. Không chạy inference hay tạo đơn thật trong lượt này. Nâng lên 0.7.3 chỉ reload extension/Pancake/trang AI, giữ helper và phiên đăng nhập.

### Luồng mới nhất — 10/10/2026

Kiểm chứng 0.7.2: 36/36 ca Node và 8/8 ca Chrome mô phỏng đạt; cú pháp `content.js`, `popup.js`, hai module AI và fixture đạt. Ca hai nhãn mã đã thất bại trước sửa (`MSS 02MSS02`) và đạt sau sửa (`MSS02`). Lượt extension thật sau reload cần người dùng chạy vì giới hạn tool nêu bên dưới.

Sửa 0.7.2 theo ảnh danh mục người dùng: thêm alias chính xác `cam ron loi khong hat`/`cam ron loi khong hat moc chau`; chuẩn hóa tiền tố `^\(\s*\d{4}\s*\)\s*`. Regex miến đã nhận `Miến Sợi Nhỏ/To` thiếu chữ Sâm, giữ ánh xạ cùng nhóm nhỏ/to. Các tên mẫu: cam 3/5kg CAM1/CAM2; miến nhỏ 1kg MSS04, 2kg MSS08; miến to 1/2/3kg MSS01/MSS02/MSS03. DOM shop đang đăng nhập còn có MS004 và `(2026 ) 2Kg Miến Sâm Sợi Nhỏ`; mã khác nhau theo shop nên không hardcode. `skuData()` từng đọc toàn bộ `.variation-id`, ghép nhãn sản phẩm `MSS 02` với mẫu mã `MSS02` thành `MSS 02MSS02`, đã tái hiện lỗi tìm lại SKU trong Chrome. Nay lấy riêng `.variation-id .tag-custom-id-variation` (class đối chiếu DOM thật); chỉ fallback text khi tối đa một nhãn, từ chối nếu nhiều mã mẫu mã khác nhau. Tác động: `productKind` dùng bởi validate/gộp/chọn SKU; `skuData` dùng bởi quét catalog và `addSku` trong `applyDraft`. Impact UNKNOWN do AI chưa được index, đã xác minh tham chiếu nguồn. 36 kiểm thử Node; fixture 8 ca gồm tên đầy đủ, hai nhãn mã và khoảng trắng năm. Giữ helper cũ, chỉ reload extension/Pancake/trang AI.

Sửa 0.7.1: đối chiếu DOM shop thật thấy `3Kg Khoai Sọ Mán Mộc Châu [KH1]` và `5Kg Khoai Sọ Mán Mộc Châu [KH2]`; tìm KH2 trả đúng một lựa chọn. `productKind()` cũ chỉ chấp nhận `khoai so`/`khoai so man`, trả null cho hậu tố Mộc Châu nên `chooseSku()` loại cả hai, dừng tại catalog. Thêm alias chính xác `khoai so man moc chau`, không đổi sang substring và vẫn từ chối combo/loại khoai khác hoặc kg không chia hết. Alias dùng chung cho kiểm tra đề xuất, gộp loại và chọn SKU. Không sửa luồng DOM hay helper. Impact GitNexus trả UNKNOWN vì các hàm AI chưa có trong index; đã xác minh tham chiếu trong `validateDraft`, `chooseSku`, `applyDraft` bằng nguồn. Kiểm thử hồi quy dùng tên/mã KH1/KH2 thật; fixture cam/khoai cũng dùng danh mục Mộc Châu. 35 kiểm thử Node đạt; giữ giới hạn không tạo đơn thật để thử.

Người dùng đã xác nhận OAuth và phân tích sản phẩm trong hội thoại thật hoạt động. Bản 0.7.0 thêm `delivery` gồm `detail`, `province`, `district`, `commune`, `system: old|new|null`, `evidence`; trường thiếu là null. Prompt giữ địa chỉ khách chốt mới nhất, tách lời mua hàng/SĐT khỏi chi tiết, không đoán hoặc tự chuyển địa danh sau sáp nhập. `parseProposal()` giữ schema cũ để không làm hỏng kiểm tra kết nối, nhưng `validateDraft()` từ chối điền nếu thiếu delivery đầy đủ hoặc bằng chứng không nằm trong bản xem trước. Khách hỏi giá/hủy/chưa rõ không được điền.

`include-address` mặc định bật; `pap-read-chat` truyền `includeAddress:true` để giữ địa chỉ trong preview. Bản preview được gửi lên OpenAI chỉ khi bấm Phân tích. SĐT/email/link vẫn lọc; `collectMessages()` đọc SĐT khách mới nhất tại máy vào `contactPhone`, không trả trường đó hay chữ ký raw cho trang AI. Nhiều số trong tin khách gần nhất làm dừng điền. Chưa đọc ảnh/voice hoặc lịch sử ngoài DOM. Biên 8.000 ký tự vẫn giữ.

Trang AI lưu kết quả trong bộ nhớ, kiểm tra bản preview chưa bị sửa, snapshot chat trước/sau inference, rồi bật **Điền đơn trên Pancake** cho hội thoại thật có đủ dữ liệu. `pap-apply-draft` chỉ nhận sender cùng extension, Beta bật, ghi nhận UI tắt, cùng snapshot chưa dùng. Snapshot được đánh dấu used trước thao tác và không retry tự động; không dùng lại sau một phần thất bại. Bấm tay/nhập tay trong lúc điền, đổi row/tin/path, tắt Beta hoặc bật ghi nhận đều dừng ở điểm chờ tiếp theo. Không có khóa chống đơn trùng bền vững qua reload; chưa chạy nền tự động.

`ai-order-dom.js` mở Tạo mới; form có dòng sản phẩm bị từ chối. Quét danh mục trước khi ghi địa chỉ, tìm miến bằng **2026**, cam bằng **cam rốn lồi**, khoai bằng **khoai sọ mán**. `productKind()` chuẩn hóa Miến Sâm (Đất) to/nhỏ và hai ánh xạ cam/khoai do người dùng chỉ định. `chooseSku()` ưu tiên quy cách đúng kg, rồi 1kg, rồi quy cách lớn nhất chia hết kg; yêu cầu đúng một SKU tại mức ưu tiên, không chọn đầu tiên tùy ý hoặc tối ưu theo giá. Kg trong tên × số lượng phải bằng kg đề xuất. Catalog virtual được cuộn tới cuối, giới hạn 100 bước và từ chối khi không quét đủ. Sau đó chọn chế độ hành chính old/new và lần lượt tỉnh/huyện/xã (new bỏ huyện), đối chiếu tên không dấu/tiền tố bằng equality duy nhất; không dùng substring/fuzzy. Điền chi tiết, SĐT mới nhất tại máy (hoặc giữ SĐT hợp lệ trên form khi chat không có), thêm từng SKU và số lượng, xác nhận tên/số lượng/aria-valuenow. Có thể để lại một phần form nếu lỗi; không xóa hay rollback thông tin khách tự sửa.

DOM đã đối chiếu trực tiếp ngày 10/10/2026: `.customer-province input`, `.popup-select-address input[value="old"|"new"]`, `[data-node-key="province"|"district"|"commune"] [role="tab"]`, `.ant-tabs-tabpane-active .ant-select-item-option`; new chỉ có province/commune. Catalog `.ul-result-product .li-variation`, `.product-name .div-name`, `.variation-id`, `.rc-virtual-list-holder`; dòng nháp/số lượng dùng selector hiện có. Từ khóa 2026 trả MS004/MSS01/MSS02/MSS03 trên shop đang mở; không hardcode các mã đó. Dùng native setter + input/change/blur. Sự kiện riêng `pap-ai-draft-start` hủy các tác vụ opener/note/price/submit cũ, không đổi công tắc.

AI chỉ điền đơn nháp. Người dùng xem lại và tích Miễn phí giao hàng để chạy năm tính năng cũ (kể cả tùy chọn Tự tạo đơn). Không tự tích checkbox hoặc tự bấm Tạo đơn trong adapter AI. Muốn tự động hoàn toàn tiếp theo cần thiết kế chống trùng qua reload, gate giá/ghi chú và xác nhận đơn thành công.

Nâng từ 0.6.x lên 0.7.0 phải restart helper Node và đăng nhập lại vì thay schema địa chỉ. Nâng 0.7.0/0.7.1 lên 0.7.2 chỉ reload extension + tab Pancake + đóng/mở trang AI; giữ helper và phiên đăng nhập. Kiểm tra `node --check ai-order-dom.js`, `node --check ai-order-plan.js`, `node --check ai-beta.js`, `node --check chat-content.js` và các gate cũ. Chạy `node --test ai-order-plan.test.cjs chat-reader.test.cjs chat-content.test.cjs ai-protocol.test.cjs ai-transport.test.cjs product-summary.test.js pricing.test.js`. Fixture: `node tests/ai-serve.cjs` → http://127.0.0.1:8766 → Chạy kiểm thử. Fixture hiện có 8 ca Chrome: old/new, cam/khoai, hai nhãn mã, khoảng trắng năm, SKU trùng, form có hàng, hủy giữa chừng. Không tạo đơn thật để thử. Tool trình duyệt chặn chrome-extension://, nên lượt inference địa chỉ + nút điền qua extension thật cần người dùng kiểm chứng sau reload; không dùng cách vòng để vượt policy.

### Lịch sử AI 0.6.0 và 0.5.x (khả năng tại từng mốc)

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

Trước khi điền ghi chú, nếu `autoMienSamPrice` bật, `adjustMienSamPrice()` đọc các dòng sản phẩm, **Tổng giá trị đơn hàng** và đối chiếu bảng giá trong `pricing.js`: 1kg 90.000đ, 2kg 140.000đ, 3kg 199.000đ, 4kg 260.000đ, 5kg 325.000đ, 6kg 390.000đ, 10kg 600.000đ. Chỉ nhận đơn mà mọi tên sản phẩm là `Miến Sâm`, `Miến Sâm Sợi Nhỏ/To` hoặc biến thể `Miến Sợi Nhỏ/To` thiếu chữ “Sâm” đã thấy trên Pancake, có quy cách `kg/g` trong tên và số lượng nguyên dương. Quy cách nhân số lượng rồi cộng khối lượng, không phân biệt sợi to/nhỏ. 7–9kg và các khối lượng không có mốc được bỏ qua. Nếu tổng tiền vượt giá mốc, điền số tiền chênh lệch **tuyệt đối** vào ô Giảm giá và chờ tổng cuối bằng giá mốc. Nếu không xác nhận được, ghi chú vẫn có thể điền nhưng luồng **tự tạo đơn** không chạy. Nếu tổng tiền bằng/thấp hơn mốc, không sửa ô Giảm giá.

Ô Giảm giá được cập nhật qua native setter của `HTMLInputElement`, sự kiện `input`/`change` và blur để Pancake nhận thay đổi. Không đọc giá ở chân form làm tổng trước giảm; chân form chỉ dùng để xác nhận kết quả. Logic giá bắt đầu khi **người dùng tích** Miễn phí giao hàng; extension vẫn không tự tích checkbox đó.

Khi `autoSubmitOrder` và `autoPrintNote` đều bật, `submitAfterNote()` đợi React nhận nội dung, bấm **Lưu** trong `.note-print-order`, đợi textarea đóng, kiểm tra lại rằng hội thoại vẫn là hội thoại ban đầu, checkbox miễn phí giao hàng vẫn tích và tóm tắt sản phẩm chưa đổi, rồi bấm nút **Tạo đơn** ở `.crm-platform .box-footer`. Không tạo đơn nếu thiếu sản phẩm, trình soạn ghi chú không đóng hoặc người dùng đổi hội thoại. Bấm nút thủ công vẫn được, bất kể công tắc tự tạo đơn.

### 4. Chuẩn hóa tag sau tạo đơn

Trình nghe `click` bắt nút `.crm-platform .box-footer button.btn-save-order` trước khi Pancake xử lý lần bấm, lưu tập ID đơn đã có, rồi chờ tối đa 30 giây. Tín hiệu thành công chính là ID mới trong `.crm-platform .recent-orders .ant-collapse-header`. Ngoài ra còn nhận tin nhắn `Đơn hàng ... đã được tạo` mới trong chat hoặc thông báo thành công mới. Khi thấy tín hiệu, `normalizeOrderTags()` tích **Đã Lên Đơn** và **Đã Gửi** nếu chưa tích, sau đó bỏ những tag khác đang tích. Nếu tạo đơn lỗi hoặc đã đổi hội thoại thì không đổi tag.

Tag được chọn có phần tử con `.ellipse` trong `button.btn-tag-item`. Tên tag được chuẩn hóa khoảng trắng trước khi so khớp. Hai tag cần giữ được tích **trước** khi bỏ các tag khác; nếu không tích được một trong hai, extension dừng việc bỏ tag cũ.

### 5. Phân nhóm và in đơn POS Cake

Content script POS chỉ chạy ở `/shop/{id}/order`. Công tắc `posGroupPrint` (mặc định tắt) bật nút **Phân nhóm đơn** trên trang. Người dùng đặt bộ lọc POS trước, rồi bấm **Quét và phân nhóm**. `pos-content.js` cuộn `.ant-table-tbody-virtual-holder`, đọc các `.ant-table-row[data-row-key]` và mã đơn trong `.order-id-column a`. Cột sản phẩm là ô thứ 10 của mỗi dòng (chỉ số 9), đã đối chiếu với header **Sản phẩm** trên POS ngày 03/10/2026. Dòng một sản phẩm hiển thị `Tên x Số lượng`; dòng nhiều sản phẩm chỉ hiển thị `Nhiều sản phẩm`. Script phát sự kiện rê chuột lên ô này, đọc từng `.ant-menu-title-content` trong bảng nổi `.order-action-list:not(.ant-popover-hidden)` rồi rời ô. Mỗi dòng phải khớp mẫu `Tên x Số lượng` của `parseListProduct()`; nếu bảng nổi không hiện hoặc có dòng không hợp lệ trong 1.500 ms, đơn vào mục cần xem lại. Không mở modal chi tiết. Giữa hai vị trí cuộn chỉ chờ 60 ms; trạng thái tiến độ cập nhật mỗi 10 đơn. Không đọc cookie hoặc API nội bộ.

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
