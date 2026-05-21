# Hệ Thống Thi Trực Tuyến Tích Hợp Giám Thị & Điểm Danh AI (Online Exam Proctoring & Attendance System)

Hệ thống thi trực tuyến hoàn chỉnh được thiết kế theo kiến trúc **Microservices** phân tán hiện đại, tích hợp Trí tuệ nhân tạo (AI/Computer Vision) để tự động điểm danh nhận diện khuôn mặt và giám sát chống gian lận thi cử thời gian thực.

---

## 🚀 Kiến Trúc Hệ Thống (System Architecture)

Hệ thống bao gồm 4 dịch vụ cốt lõi hoạt động độc lập và được điều phối thông qua **Docker Compose**:

### 1. Main Backend Service (`Graduation_thesis_ver2_BE`)
*   **Công nghệ**: Java Spring Boot 3.2.3, Spring Security OAuth2, JPA Hibernate.
*   **Tính năng**: Quản lý kỳ thi, ngân hàng câu hỏi, bài làm của thí sinh, diễn đàn thảo luận môn học. Tích hợp phân quyền thông qua **Keycloak Identity Provider**.
*   **API Gateway/Proxy**: Định tuyến và đóng vai trò proxy điều hướng các yêu cầu giám thị AI trực tiếp từ Frontend đến module AI.

### 2. Main Frontend SPA (`FE_WEB`)
*   **Công nghệ**: ReactJS, Vite, TailwindCSS, Lucide Icons.
*   **Tính năng**: Giao diện làm bài thi trực quan của thí sinh, khu vực trao đổi/thảo luận, màn hình giám sát của giám thị.
*   **Khắc phục lỗi Webcam**: Tích hợp giải thuật state-aware callback ref (`ref={setVideoRef}`) giúp khắc phục triệt để hiện tượng đen màn hình webcam khi khởi động camera trên các trình duyệt hiện đại.

### 3. AI Proctoring Service (`ai-proctor`) - [NEW]
*   **Công nghệ**: Python FastAPI, MediaPipe FaceMesh, OpenCV, NumPy, WebSockets.
*   **Cơ chế hoạt động**:
    *   **Theo dõi ánh mắt (Gaze Tracking)**: Phân tích khoảng cách dịch chuyển của tròng đen mắt (Iris Landmarks) để xác định thí sinh có nhìn lệch ra ngoài màn hình hay không.
    *   **Tư thế đầu (Head Pose Estimation)**: Sử dụng thuật toán giải hệ phương trình PnP (Perspective-n-Point) trên các mốc khuôn mặt 3D để ước lượng góc quay đầu (Pitch/Yaw/Roll).
    *   **Tự động ghi hình gian lận**: Duy trì một hàng đợi vòng tròn (rolling queue) trong RAM. Khi thí sinh dời mắt khỏi màn hình liên tục quá 3 giây, hệ thống sẽ kích hoạt luồng phụ (asynchronous thread) tự động ghi và xuất tệp video dài **10 giây** (bao gồm 5 giây trước và 5 giây sau thời điểm vi phạm) dạng `.mp4` lưu trực tiếp vào thư mục máy chủ:
        ```bash
        E:\Data\future_ai_feature\[exam_id]\[student_id]\
        ```

### 4. Face Recognition Service (`detect-face`)
*   **Công nghệ**: Python FastAPI, OpenCV, Face Recognition.
*   **Tính năng**: Chụp ảnh nhận diện thí sinh khi bắt đầu vào phòng thi và đối khớp khuôn mặt với cơ sở dữ liệu đã đăng ký để điểm danh tự động.

---

## 🛠️ Danh Sách Cổng Hoạt Động (Port Mapping)

Khi chạy toàn bộ hệ thống bằng Docker Compose, các cổng dịch vụ được định tuyến như sau:

| Dịch vụ | Công nghệ | Cổng ngoài (Host Port) | Cổng trong Container |
| :--- | :--- | :--- | :--- |
| **`fe_web`** (Frontend) | React (Nginx Web Server) | **`5173`** | `80` |
| **`backend`** (Spring Boot) | Java 21 OpenJDK | **`8080`** | `8080` |
| **`ai_proctor`** (Giám thị AI) | Python FastAPI | **`8899`** | `8000` |
| **`detect_face`** (Điểm danh) | Python FastAPI | **`8888`** | `8888` |
| **`keycloak`** (Xác thực) | Keycloak Provider | **`9000`** | `8080` |
| **`postgres`** (Cơ sở dữ liệu) | PostgreSQL 15 | **`5433`** | `5432` |

---

## 📦 Hướng Dẫn Cài Đặt & Chạy Hệ Thống (Installation & Quick Start)

### Yêu cầu hệ thống:
*   Đã cài đặt **Docker Desktop** và **Docker Compose**.
*   (Tùy chọn) Thư mục lưu trữ dữ liệu video giám thị `E:\Data` trên Windows Host (đã được cấu hình Mount Volume tự động trong `docker-compose.yml`).

### Khởi chạy toàn bộ hệ thống:

Di chuyển vào thư mục chứa dự án Spring Boot và chạy lệnh xây dựng lại toàn bộ container:

```bash
cd Graduation_thesis_ver2_BE
docker compose up --build -d
```

Để kiểm tra trạng thái hoạt động của các container:
```bash
docker compose ps
```

Xem log thời gian thực của module giám thị AI:
```bash
docker compose logs -f ai_proctor
```

---

## 🔒 Bản Quyền & Bảo Mật
*   Tài khoản Keycloak và Database được cấu hình mặc định trong file `.env` và `docker-compose.yml`.
*   Các thông tin nhạy cảm và thư mục phát triển riêng của Mobile App (`Graduation_thesis_ver2_FE_2` và `frontend_student`) đã được loại bỏ hoàn toàn thông qua file cấu hình `.gitignore` để đảm bảo an toàn khi đưa lên kho chứa mã nguồn chung.
