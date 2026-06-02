# 🎓 Hệ Thống Thi Trực Tuyến Tích Hợp Giám Thị & Điểm Danh AI (Online Exam Proctoring & Attendance System)

Hệ thống thi trực tuyến hoàn chỉnh được thiết kế theo kiến trúc **Microservices** phân tán hiện đại, tích hợp Trí tuệ nhân tạo (AI/Computer Vision) để tự động điểm danh nhận diện khuôn mặt và giám sát chống gian lận thi cử thời gian thực. 

Nền tảng mang lại giải pháp chuyển đổi số toàn diện cho trường học, tối ưu hóa công tác tổ chức kiểm tra, quản lý lớp học và nâng cao tính minh bạch, khách quan trong kiểm tra trực tuyến.

🌐 **Trải nghiệm trực tuyến tại địa chỉ chính thức**: [https://lophocso.io.vn](https://lophocso.io.vn)

---

## 🌟 Các Phân Hệ & Tính Năng Nổi Bật (Key Features)

Hệ thống được thiết kế đồng bộ trên cả nền tảng Web và Ứng dụng di động native, đáp ứng nhu cầu thực tế của cả Giảng viên, Sinh viên và Giám thị:

### 1. Phân Hệ Web Quản Trị & Đào Tạo (`FE_WEB`)
Nền tảng vận hành chính trên trình duyệt dành cho Quản trị viên (Admin), Giảng viên và Học viên với giao diện Premium tối giản, tối ưu hóa trải nghiệm người dùng:
*   **Quản trị viên (Admin)**: Quản lý phê duyệt tài khoản giảng viên, theo dõi biểu đồ thống kê lưu lượng người dùng thời gian thực và quản lý chu kỳ học kỳ của trường học.
*   **Giảng viên**: Tổ chức lớp học phần, soạn thảo đề thi trắc nghiệm/tự luận, nhập danh sách học viên hàng loạt bằng Excel, điểm danh thông minh bằng FaceID nhóm hoặc mã tọa độ GPS, và thực hiện chấm thi trực tuyến kèm nhận xét chi tiết.
*   **Học viên**: Xem thời khóa biểu cá nhân, tham gia diễn đàn thảo luận lớp học, làm bài kiểm tra trực tuyến và tra cứu bảng điểm học tập chi tiết kèm theo phản hồi từng câu từ giảng viên.
*   **Bảo mật tài khoản**: Tích hợp tính năng **Đổi mật khẩu an toàn**, xác thực mật khẩu cũ thông qua hệ thống Single Sign-On (SSO) Keycloak trước khi thay đổi.

### 2. Ứng Dụng Di Động Học Viên (`frontend_student`)
Ứng dụng di động native chạy mượt mà trên iOS và Android dành riêng cho học viên, mang lại sự tiện lợi tối đa:
*   **Đăng Nhập Sinh Trắc Học SSO**: Sau lần đăng nhập Keycloak đầu tiên, học viên có thể mở khóa nhanh bằng Vân tay (Fingerprint) hoặc FaceID của thiết bị. Sử dụng cơ chế lưu trữ an toàn cấp phần cứng (`react-native-keychain`) kết hợp tự động quay vòng Token (Token Rotation) để duy trì phiên làm việc bảo mật tuyệt đối.
*   **Thông Báo Đẩy Thông Minh (FCM)**: Tích hợp Firebase Cloud Messaging nhận thông báo thời gian thực về lịch thi mới, lịch học thay đổi đột xuất, hoặc tin nhắn thảo luận lớp học phần.
*   **Chuyển Hướng Sâu (Deep Linking)**: Nhấp vào thông báo đẩy để mở trực tiếp màn hình chi tiết lớp học hoặc diễn đàn thảo luận ngay cả khi ứng dụng đang chạy ngầm hoặc đã tắt hoàn toàn.
*   **Điểm Danh Vân Thế GPS**: Thực hiện điểm danh lớp học bằng cách đối khớp mã điểm danh kết hợp xác thực tọa độ vị trí thực tế của thiết bị trong bán kính cho phép xung quanh lớp học phần.
*   **Tính Năng Tiện Ích**: Đăng ký hồ sơ nhận dạng FaceID, xem thời khóa biểu thích ứng chế độ Sáng/Tối (Light/Dark mode) và theo dõi kết quả chuyên cần trực quan.

### 3. Ứng Dụng Di Động Giảng Viên (`Graduation_thesis_ver2_FE_2`)
Cánh tay nối dài của giảng viên trong công tác quản lý lớp học và giảng dạy từ xa:
*   **Đăng Nhập 1 Chạm**: Bảo mật sinh trắc học vân tay/khuôn mặt cao cấp tích hợp SSO Keycloak, giúp giảng viên đăng nhập nhanh chóng mà không cần nhập mật khẩu phức tạp trên thiết bị di động.
*   **Quản Lý Lớp Học & Chuyên Cần**: Điểm danh nhanh chóng tại giảng đường, phê duyệt sinh viên vào lớp, theo dõi lịch dạy theo tuần và tương tác diễn đàn thảo luận với lớp học phần ở bất kỳ đâu.
*   **Đẩy Tin FCM & Định Tuyến Sâu**: Nhận tin nhắn thông báo tức thì khi có yêu cầu phê duyệt mới, bài thảo luận mới từ sinh viên, và tự động điều hướng sâu đến màn hình phê duyệt hay phòng thảo luận.
*   **Đổi Mật Khẩu Tiện Lợi**: Giao diện đổi mật khẩu tài khoản trực quan tích hợp ngay trong trang hồ sơ cá nhân giúp giảng viên chủ động quản lý bảo mật.

### 4. Phân Hệ Giám Thị AI Thời Gian Thực (Real-time AI Proctoring)
Thuật toán Học máy và Thị giác máy tính tiên tiến chạy trực tiếp trên luồng camera của thí sinh để đảm bảo tính minh bạch tối đa:
*   **Theo Dõi Ánh Mắt (Gaze Tracking)**: Phân tích khoảng cách dịch chuyển tròng mắt (Iris Landmarks) cảnh báo tức thì khi thí sinh liếc nhìn hướng khác rời khỏi màn hình quá 3 giây.
*   **Ước Lượng Tư Thế Đầu (3D Head Pose Estimation)**: Đo lường chính xác các góc quay đầu (Pitch/Yaw/Roll) thông qua thuật toán giải PnP để phát hiện hành vi cúi đầu quay cóp hoặc quay đầu sang hai bên.
*   **Phát Hiện Vắng Mặt (No Face Detected)**: Tự động ghi nhận vi phạm quy chế thi khi camera hoàn toàn không phát hiện khuôn mặt của thí sinh trước màn hình làm bài.
*   **Tự Động Ghi Hình Bằng Chứng**: Tự động trích xuất và lưu trữ tệp video bằng chứng dài **10 giây** (bao gồm 5 giây trước và 5 giây sau vi phạm) định dạng `.mp4` lên máy chủ khi phát hiện vi phạm liên tục vượt quá 3 giây.


---

## 🛠️ Kiến Trúc Công Nghệ & Vận Hành (Technology Stack)

Hệ thống được phát triển và vận hành dựa trên các tiêu chuẩn công nghệ hàng đầu:
*   **Java Spring Boot 3.2.3**: Xây dựng Main REST API Gateway bảo mật cao, kết hợp Hibernate JPA và PostgreSQL.
*   **Keycloak Identity Provider**: Cung cấp giải pháp đăng nhập một lần (SSO) chuẩn OAuth2/OpenID Connect bảo mật tối đa cho toàn bộ hệ thống Web và App di động.
*   **ReactJS, Vite & Tailwind CSS**: Trải nghiệm giao diện Web siêu nhanh, mượt mà và tương thích tốt trên nhiều loại thiết bị.
*   **React Native**: Xây dựng hai ứng dụng di động native dành cho Giảng viên và Học viên, hỗ trợ đầy đủ các cảm biến sinh trắc học, định vị GPS, và thông báo đẩy.
*   **FastAPI & MediaPipe**: Động cơ AI hiệu năng cao xử lý phân tích hình ảnh camera thời gian thực với độ trễ cực thấp.
*   **Docker & Nginx Reverse Proxy**: Đóng gói cô lập các dịch vụ, hỗ trợ chứng chỉ bảo mật SSL HTTPS Let's Encrypt giúp bảo vệ tuyệt đối dữ liệu người dùng trên môi trường Internet.

---
🎉 **Chào mừng bạn đến với kỷ nguyên tổ chức thi và quản lý lớp học thông minh, minh bạch cùng Thư Viện Số AI!**

