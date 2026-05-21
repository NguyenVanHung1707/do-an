# 🎓 Hệ Thống Thi Trực Tuyến Tích Hợp Giám Thị & Điểm Danh AI (Online Exam Proctoring & Attendance System)

Hệ thống thi trực tuyến hoàn chỉnh được thiết kế theo kiến trúc **Microservices** phân tán hiện đại, tích hợp Trí tuệ nhân tạo (AI/Computer Vision) để tự động điểm danh nhận diện khuôn mặt và giám sát chống gian lận thi cử thời gian thực. 

Nền tảng mang lại giải pháp chuyển đổi số toàn diện cho trường học, tối ưu hóa công tác tổ chức kiểm tra, quản lý lớp học và nâng cao tính minh bạch, khách quan trong kiểm tra trực tuyến.

🌐 **Trải nghiệm trực tuyến tại địa chỉ chính thức**: [https://thuvienso.io.vn](https://thuvienso.io.vn)

---

## 🌟 Các Phân Hệ & Tính Năng Nổi Bật (Key Features)

Hệ thống được chia thành các phân hệ chuyên biệt đáp ứng nhu cầu thực tế của cả Giảng viên, Sinh viên và Giám thị:

### 1. Phân Hệ Sinh Viên (Student Module)
*   **Không Gian Học Tập Cá Nhân**: Theo dõi danh sách các lớp học phần đang tham gia, lịch sử điểm danh và tình trạng chuyên cần trực quan.
*   **Đăng Ký Hồ Sơ Khuôn Mặt (Face Registration)**: Chụp và tải ảnh chân dung chính thức lên hệ thống AI để làm cơ sở đối khớp nhận diện tự động trong phòng thi và các buổi học tập trung.
*   **Làm Bài Thi Trực Tuyến**: Giao diện làm bài toàn màn hình tối ưu, hỗ trợ lưu nháp liên tục (Auto-save) bảo vệ dữ liệu khi mất kết nối mạng.
*   **Tra Cứu Kết Quả Chi Tiết**: Xem điểm thi tức thì sau khi công bố, kèm theo bảng phân tích câu trả lời đúng/sai, bài làm tự luận và nhận xét, phản hồi chi tiết từ Giảng viên cho từng câu hỏi.
*   **Thảo Luận Lớp Học**: Diễn đàn trao đổi học thuật, đăng câu hỏi và bình luận tương tác trực tiếp với thầy cô và các bạn cùng lớp học phần.

### 2. Phân Hệ Giảng Viên (Teacher Module)
*   **Quản Lý Lớp Học Thông Minh**: Tạo mới, chỉnh sửa thông tin lớp, thêm sinh viên thông qua công cụ tìm kiếm Autocomplete thông minh theo Tên hoặc MSSV.
*   **Điểm Danh Công Nghệ Cao**:
    *   **Điểm danh qua Ảnh chụp (FaceID)**: Chụp ảnh tập thể lớp bằng webcam hoặc tải ảnh lên để hệ thống tự động quét, nhận dạng và tích hợp chuyên cần cho tất cả sinh viên có mặt trong tích tắc.
    *   **Điểm danh mã Code & GPS**: Sinh mã điểm danh tự động kết hợp định vị địa lý (GPS-verified Location). Sinh viên chỉ điểm danh được khi nhập đúng mã trong thời gian hiệu lực và ở trong phạm vi bán kính cho phép xung quanh lớp học.
*   **Quản Lý & Chấm Thi Trực Tuyến**:
    *   Soạn thảo ngân hàng câu hỏi, thiết lập kỳ thi với thời lượng và hạn nộp linh hoạt.
    *   Giao diện chấm điểm thủ công cho các câu hỏi tự luận, ghi chú ý kiến nhận xét và công bố điểm thi đồng loạt.

### 3. Phân Hệ Giám Thị AI Thời Gian Thực (Real-time AI Proctoring)
Hệ thống sử dụng các thuật toán Học máy và Thị giác máy tính tiên tiến chạy trực tiếp trên luồng Webcam của thí sinh để phát hiện mọi hành vi bất thường:
*   **Theo Dõi Ánh Mắt (Gaze Tracking)**: Phân tích khoảng cách dịch chuyển của tròng mắt (Iris Landmarks) để cảnh báo tức thì khi thí sinh nhìn lệch, quay sang trái/phải rời khỏi màn hình.
*   **Ước Lượng Tư Thế Đầu (3D Head Pose Estimation)**: Sử dụng mô hình mốc khuôn mặt 3D kết hợp thuật toán PnP (Perspective-n-Point) đo lường chính xác các góc quay đầu (Pitch/Yaw/Roll) để phát hiện cúi đầu, quay đầu quay cóp.
*   **Phát Hiện Thiết Bị & Người Lạ**: Nhận dạng sự hiện diện của điện thoại di động trong khung hình hoặc trường hợp có từ hai khuôn mặt trở lên xuất hiện trước camera.
*   **Tự Động Ghi Hình Vi Phạm**: Hệ thống duy trì một luồng ghi video thông minh dạng vòng tròn trong bộ nhớ tạm. Khi phát hiện vi phạm liên tục vượt quá ngưỡng thời gian cấu hình, hệ thống sẽ tự động trích xuất và xuất tệp video bằng chứng dài **10 giây** (bao gồm 5 giây trước và 5 giây sau vi phạm) định dạng `.mp4` lưu trữ trên máy chủ để làm minh chứng khách quan cho Hội đồng kỷ luật.

### 4. Ứng Dụng Di Động Tiện Ích (Companion Mobile Apps)
Bên cạnh nền tảng Web chính, hệ thống cung cấp 2 ứng dụng di động native chạy mượt mà trên iOS và Android:
*   **App Sinh Viên**: Xem nhanh nhật ký điểm danh cá nhân, nhận thông báo bài thi mới, xem chi tiết bảng điểm và nhận xét của thầy cô ở bất kỳ đâu.
*   **App Giảng Viên**: Điểm danh nhanh trên lớp, xem danh sách sinh viên, giám sát danh sách bài thi đã giao và tham gia diễn đàn trao đổi bài giảng từ xa.

---

## 🛠️ Công Nghệ Phát Triển (Technology Stack)

Hệ thống được phát triển và vận hành dựa trên các tiêu chuẩn công nghệ hàng đầu thế giới:
*   **Java Spring Boot 3.2.3**: Xây dựng Main REST API Gateway bảo mật cao, kết hợp Hibernate JPA và PostgreSQL.
*   **Keycloak Identity Provider**: Cung cấp giải pháp đăng nhập một lần (SSO) chuẩn OAuth2/OpenID Connect bảo mật tối đa cho toàn hệ thống.
*   **ReactJS & Vite SPA**: Trải nghiệm giao diện Web Frontend siêu mượt mà, tối ưu hóa CSS bằng Tailwind.
*   **FastAPI & MediaPipe**: Động cơ AI hiệu năng cao xử lý phân tích hình ảnh camera thời gian thực với độ trễ cực thấp.
*   **Docker & Nginx Reverse Proxy**: Đóng gói cô lập các dịch vụ, hỗ trợ chứng chỉ bảo mật SSL HTTPS Let's Encrypt giúp bảo vệ tuyệt đối dữ liệu người dùng trên môi trường Internet.

---
🎉 **Chào mừng bạn đến với kỷ nguyên tổ chức thi và quản lý lớp học thông minh, minh bạch cùng Thư Viện Số AI!**
