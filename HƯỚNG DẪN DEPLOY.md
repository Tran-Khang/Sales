🚀 HƯỚNG DẪN DEPLOY SALES MANAGEMENT APP
📋 YÊU CẦU
Tài khoản GitHub
Tài khoản Vercel (miễn phí)
Tài khoản Neon PostgreSQL (miễn phí)
🗄️ BƯỚC 1: SETUP DATABASE (Neon PostgreSQL)
1.1. Tạo Database trên Neon
Truy cập: https://neon.tech
Đăng ký/Đăng nhập
Click "Create a project"
Chọn:
Project name: sales-management
Region: Gần với vị trí của bạn nhất
PostgreSQL version: 15 hoặc cao hơn
Click "Create project"
1.2. Lấy Connection String
Sau khi tạo xong, bạn sẽ thấy màn hình có Connection String dạng:

postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
LƯU LẠI CONNECTION STRING NÀY - bạn sẽ cần nó ở bước sau.

1.3. Chạy SQL Schema
Trong dashboard Neon, click "SQL Editor"
Copy toàn bộ nội dung file schema.sql
Paste vào SQL Editor
Click "Run"
Kiểm tra: Bạn sẽ thấy các bảng users, products, sales được tạo
📁 BƯỚC 2: CHUẨN BỊ CODE
2.1. Tạo Repository trên GitHub
Truy cập: https://github.com
Click "New repository"
Repository name: sales-management-app
Chọn Public hoặc Private
Click "Create repository"
2.2. Upload Code lên GitHub
bash
# Khởi tạo git trong thư mục dự án
cd sales-app
git init

# Add tất cả files
git add .

# Commit
git commit -m "Initial commit"

# Kết nối với GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/sales-management-app.git

# Push code lên GitHub
git branch -M main
git push -u origin main
☁️ BƯỚC 3: DEPLOY LÊN VERCEL
3.1. Kết nối GitHub với Vercel
Truy cập: https://vercel.com
Đăng nhập bằng GitHub
Click "Add New..." → "Project"
Chọn repository sales-management-app
Click "Import"
3.2. Cấu hình Environment Variables
Trong màn hình "Configure Project":

Mở mục "Environment Variables"
Thêm các biến sau:
Biến 1:

Name: DATABASE_URL
Value: Paste connection string từ Neon (bước 1.2)
Biến 2:

Name: JWT_SECRET
Value: Tạo một chuỗi bí mật bất kỳ (ví dụ: my-super-secret-key-2024)
Đảm bảo chọn "Production", "Preview", và "Development" cho cả 2 biến
3.3. Deploy
Click "Deploy"
Đợi 2-3 phút để Vercel build và deploy
Khi thấy 🎉 "Congratulations!" là hoàn tất
3.4. Lấy URL
Vercel sẽ cung cấp URL dạng:

https://sales-management-app-xxx.vercel.app
Đây là URL ứng dụng của bạn!

✅ BƯỚC 4: KIỂM TRA
4.1. Truy cập ứng dụng
Mở URL từ Vercel
Click "Đăng nhập ngay"
Đăng nhập với:
Username: admin
Password: admin123
4.2. Test các tính năng
✔ Dashboard hiển thị thống kê
✔ Trang Sản phẩm: Tìm kiếm, thêm, sửa, xóa
✔ Trang Bán hàng: Tạo đơn, tự động trừ tồn kho
✔ Trang Báo cáo: Biểu đồ, lọc theo ngày
✔ Responsive: Test trên mobile

🔧 CẬP NHẬT CODE
Khi bạn thay đổi code:

bash
# Add changes
git add .

# Commit
git commit -m "Update features"

# Push
git push origin main
Vercel sẽ tự động deploy lại sau vài giây!

🎯 TÍNH NĂNG CHÍNH ĐÃ HOÀN THÀNH
✅ Backend (Vercel Serverless)
Kết nối Neon PostgreSQL
API Authentication với JWT
CRUD Products với tìm kiếm realtime
API Product Detail (thống kê, cảnh báo tồn kho)
API Sales (tự động trừ tồn kho)
Filter theo date, product
✅ Frontend
Login page
Dashboard với biểu đồ Chart.js
Products page với search realtime
Product Detail page (thống kê, lịch sử bán)
Sales page (tạo đơn, reload ngay lập tức)
Reports page (biểu đồ, filter, search)
✅ Responsive Design
Hoạt động mượt trên laptop và mobile
Navigation bar professional
TailwindCSS styling
✅ Realtime Behavior
Sau mỗi API call, frontend tự động reload data mới nhất
Search không reload trang
Cập nhật tồn kho ngay sau bán hàng
🆘 TROUBLESHOOTING
Lỗi: "Unable to connect to database"
→ Kiểm tra lại DATABASE_URL trong Vercel Environment Variables

Lỗi: "Token không hợp lệ"
→ Xóa localStorage trong browser (F12 → Application → Local Storage → Clear)

API không hoạt động
→ Kiểm tra Console trong Vercel Dashboard → View Function Logs

Database connection timeout
→ Neon có thể sleep sau 5 phút không dùng. Đợi vài giây để nó wake up.

📱 SỬ DỤNG TRÊN NHIỀU THIẾT BỊ
Ứng dụng này hỗ trợ multi-device:

Mở URL trên laptop: https://your-app.vercel.app
Mở URL trên mobile: cùng URL
Đăng nhập trên cả 2 thiết bị
Tạo đơn hàng trên mobile → Reload trang trên laptop → Thấy đơn mới!
Lưu ý: Database được lưu trên cloud (Neon), nên tất cả thiết bị đều thấy dữ liệu realtime.

🎉 HOÀN TẤT!
Bạn đã có một hệ thống quản lý bán hàng hoàn chỉnh, chuyên nghiệp với:

✅ Realtime search
✅ Automatic stock management
✅ Product detail với thống kê
✅ Charts & Reports
✅ Mobile responsive
✅ Multi-device support
Chúc bạn sử dụng hiệu quả! 🚀

