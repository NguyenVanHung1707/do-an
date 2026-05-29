# 📷 Phân Hệ Nhận Diện Khuôn Mặt & Đối Khớp Sinh Trắc Học - Face ID Recognition Service (Python + FastAPI)

Phân hệ Nhận Diện Khuôn Mặt là dịch vụ microservice hiệu năng cao chạy song song trong hệ thống, được thiết kế chuyên biệt để xử lý các thuật toán thị giác máy tính (Computer Vision) phức tạp liên quan đến nhận dạng khuôn mặt, phục vụ trực tiếp cho hoạt động điểm danh lớp học học thuật và đăng ký sinh trắc học của sinh viên.

---

## 🌟 Các Tính Năng Core (Core Service Features)

Dịch vụ cung cấp các điểm cuối API thông minh phục vụ các kịch bản thực tế sau:

### 1. Đăng Ký Sinh Trắc Học Sinh Viên (Face ID Registration)
*   **Trích xuất đặc trưng khuôn mặt (Facial Feature Extraction)**: Tiếp nhận dữ liệu hình ảnh chân dung sinh viên gửi từ ứng dụng di động/web, tự động phát hiện vị trí khuôn mặt và trích xuất vector đặc trưng (Face Embeddings) 128 chiều độc nhất.
*   **Đồng bộ cơ sở dữ liệu sinh trắc**: Lưu trữ an toàn liên kết tệp ảnh chân dung sinh viên vào cơ sở dữ liệu để phục vụ việc đối khớp và nhận dạng về sau.

### 2. Điểm Danh Nhận Diện Khuôn Mặt (Face ID Attendance Verification)
*   **Nhận dạng khuôn mặt đa đối tượng (Face Identification)**: Tiếp nhận luồng ảnh chụp tập thể lớp học phần từ giảng viên, tự động phát hiện tất cả các khuôn mặt xuất hiện trong khung hình.
*   **Đối khớp cơ sở dữ liệu (Database Matching)**: So sánh vector đặc trưng của từng khuôn mặt phát hiện được với cơ sở dữ liệu sinh trắc học của sinh viên đã đăng ký trong lớp học phần đó.
*   **Tự động hóa chuyên cần**: Trả về chính xác danh sách mã số sinh viên có mặt trong hình ảnh đối khớp để hệ thống tự động ghi nhận chuyên cần lên backend chính Spring Boot.

### 3. Tối Ưu Hóa Hiệu Năng & Độ Chính Xác (High Performance Vision)
*   **Xử lý bất đồng bộ (Asynchronous processing)**: Được phát triển trên nền tảng ASGI giúp phản hồi các yêu cầu nhận diện hình ảnh dung lượng lớn đồng thời với độ trễ tối thiểu.
*   **Độ chính xác vượt trội**: Sử dụng mô hình học sâu (Deep Learning Model) tối ưu hóa khả năng nhận diện ngay cả trong điều kiện ánh sáng thay đổi hoặc sinh viên đeo kính góc chụp nghiêng nhẹ.

---

## 🛠️ Kiến Trúc Công Nghệ & Động Cơ AI (Tech Stack & AI Engine)
*   **Python 3.11+ & FastAPI**: Nền tảng phát triển API bất đồng bộ siêu nhanh, tối ưu cho việc phân tích các luồng xử lý AI/Học máy.
*   **Face Recognition & OpenCV**: Thư viện thị giác máy tính và nhận diện khuôn mặt hàng đầu thế giới với độ chính xác cao.
*   **Uvicorn & Docker Deployment**: Hỗ trợ triển khai cô lập dưới dạng Container giúp dễ dàng tích hợp và mở rộng tài nguyên (Scaling) độc lập với hệ thống Spring Boot chính.
