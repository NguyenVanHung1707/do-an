# Detect Face

![License](https://img.shields.io/github/license/hung2004/detect-face) ![Issues](https://img.shields.io/github/issues/hung2004/detect-face) ![Stars](https://img.shields.io/github/stars/hung2004/detect-face) ![Forks](https://img.shields.io/github/forks/hung2004/detect-face)

Detect Face là một dự án mã nguồn mở tập trung vào việc nhận diện và định danh khuôn mặt sử dụng các mô hình học sâu. Dự án này cung cấp một công cụ mạnh mẽ để phát hiện khuôn mặt trong hình ảnh và video, hỗ trợ nhiều ứng dụng trong lĩnh vực an ninh, y tế, và nhiều lĩnh vực khác.

## Tính Năng

- **Nhận diện khuôn mặt**: Phát hiện khuôn mặt trong hình ảnh và video một cách chính xác và hiệu quả.
- **Định danh khuôn mặt**: Xác định danh tính của khuôn mặt dựa trên một cơ sở dữ liệu có sẵn.
- **Hỗ trợ đa nền tảng**: Chạy được trên cả Windows, macOS và Linux.
- **API thân thiện**: Cung cấp API dễ sử dụng để tích hợp vào các ứng dụng khác.
- **Mở rộng dễ dàng**: Dễ dàng mở rộng và tùy chỉnh cho các nhu cầu cụ thể của bạn.

## Yêu Cầu Hệ Thống

- Python 3.7 hoặc mới hơn
- Các thư viện cần thiết (xem [requirements.txt](requirements.txt) để biết thêm chi tiết)

## Cài Đặt

1. **Clone repo**:
    ```bash
    git clone https://github.com/hung2004/detect-face.git
    cd detect-face
    ```

2. **Cài đặt các thư viện cần thiết**:
    ```bash
    pip install -r requirements.txt
    ```

3. **Chạy chương trình**:
    ```bash
    uvicorn newAPI1:app --host 0.0.0.0 --port 8888
    ```

## Hướng Dẫn Sử Dụng

### Nhận Diện Khuôn Mặt Từ Hình Ảnh

Bạn có thể nhận diện khuôn mặt từ một hình ảnh bằng cách gọi API (sử dụng swagger để thử) từ URI sau:

```bash
http://localhost:8888/docs#
```
## Chú Ý
Dữ liệu ảnh của mỗi cá nhân của được truy xuất trong DB bằng path lưu trong bảng student. Nếu bạn muốn tùy chỉnh, hãy thiết lập lại đường dẫn DB.
