# 📚 TÀI LIỆU KỸ THUẬT - SALES MANAGEMENT APP

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Tech Stack
```
Frontend:
├── HTML5 (Semantic markup)
├── TailwindCSS (Utility-first CSS)
└── Vanilla JavaScript ES6+ (Modules)

Backend:
├── Vercel Serverless Functions (Node.js)
├── PostgreSQL (Neon Cloud)
└── JWT Authentication

Libraries:
├── Chart.js (Biểu đồ)
├── pg (PostgreSQL client)
├── jsonwebtoken (JWT)
└── bcryptjs (Password hashing)
```

---

## 🗄️ DATABASE SCHEMA

### 1. Table: `users`
```sql
id          SERIAL PRIMARY KEY
username    TEXT UNIQUE NOT NULL
password    TEXT NOT NULL (bcrypt hash)
created_at  TIMESTAMP DEFAULT NOW()
```

**Quan hệ:** Không có foreign key
**Index:** UNIQUE trên username
**Mục đích:** Lưu thông tin đăng nhập

---

### 2. Table: `products`
```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
price       NUMERIC(10, 2) NOT NULL
stock       INTEGER NOT NULL DEFAULT 0
created_at  TIMESTAMP DEFAULT NOW()
```

**Index:** 
- PRIMARY KEY trên id
- INDEX trên name (để tăng tốc search)

**Mục đích:** Quản lý sản phẩm

---

### 3. Table: `sales`
```sql
id          SERIAL PRIMARY KEY
product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE
quantity    INTEGER NOT NULL
total       NUMERIC(10, 2) NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
```

**Quan hệ:** 
- FOREIGN KEY: product_id → products(id)
- ON DELETE CASCADE: Xóa product → tự động xóa sales

**Index:**
- PRIMARY KEY trên id
- INDEX trên product_id
- INDEX trên created_at (để tăng tốc filter theo date)

**Mục đích:** Lưu lịch sử đơn hàng

---

## 🔐 AUTHENTICATION FLOW

### Login Process
```
1. User nhập username + password
   ↓
2. Frontend gửi POST /api/auth
   ↓
3. Backend:
   - Query user từ database
   - Verify password với bcrypt
   - Tạo JWT token (expires: 7 days)
   ↓
4. Frontend:
   - Lưu token vào localStorage
   - Redirect → dashboard
```

### Token Verification
```
Mỗi API request:
1. Frontend gửi header: Authorization: Bearer <token>
2. Backend verify JWT
3. Nếu valid → xử lý request
4. Nếu invalid → return 401 Unauthorized
```

---

## 🔍 SEARCH MECHANISM

### Realtime Search (Products Page)

```javascript
// Frontend
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadProducts(e.target.value); // Gọi API sau 300ms
  }, 300);
});
```

```javascript
// Backend API
SELECT * FROM products 
WHERE name ILIKE '%keyword%'  // Case-insensitive search
ORDER BY created_at DESC
```

**Đặc điểm:**
- ✅ Debounce 300ms (tránh spam request)
- ✅ ILIKE: hỗ trợ Unicode (tiếng Việt)
- ✅ Partial match: "mì" → "Mì Hảo Hảo"
- ✅ Không reload page

---

## 📦 PRODUCT DETAIL API

### Endpoint: GET /api/product-detail?id=123

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 123,
      "name": "Mì Hảo Hảo",
      "price": 3500,
      "stock": 50,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "statistics": {
      "total_sold": 100,
      "total_revenue": 350000,
      "stock_status": "OK" | "LOW_STOCK" | "OUT_OF_STOCK",
      "stock_alert": "⚠️ SẮP HẾT - Tồn kho thấp!" | null
    },
    "recent_sales": [
      {
        "id": 1,
        "quantity": 5,
        "total": 17500,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

**Logic xác định stock_status:**
```javascript
if (stock === 0) {
  stock_status = 'OUT_OF_STOCK';
  stock_alert = '⚠️ HẾT HÀNG - Cần nhập thêm ngay!';
} else if (stock < 10) {
  stock_status = 'LOW_STOCK';
  stock_alert = '⚠️ SẮP HẾT - Tồn kho thấp!';
} else {
  stock_status = 'OK';
  stock_alert = null;
}
```

---

## 🛒 SALES TRANSACTION FLOW

### Create Sale Process (với auto stock update)

```sql
-- 1. BEGIN TRANSACTION
BEGIN;

-- 2. INSERT sale record
INSERT INTO sales (product_id, quantity, total) 
VALUES (123, 5, 17500) 
RETURNING *;

-- 3. UPDATE stock (TỰ ĐỘNG TRỪ)
UPDATE products 
SET stock = stock - 5 
WHERE id = 123;

-- 4. COMMIT TRANSACTION
COMMIT;
```

**Tại sao dùng Transaction?**
- Đảm bảo tính toàn vẹn dữ liệu
- Nếu bước nào fail → ROLLBACK tất cả
- Stock luôn chính xác

**Frontend Behavior:**
```javascript
// Sau khi tạo sale thành công
await createSale(productId, quantity);

// Reload products list → thấy stock mới
await loadProducts();

// Reload sales history → thấy đơn mới
await loadSales();
```

---

## 🔄 REALTIME DATA UPDATE

### Cơ chế "Realtime" trong App

App này **KHÔNG dùng WebSocket** hay polling. Thay vào đó:

```
Mỗi khi có thay đổi dữ liệu:
1. Frontend gọi API (POST/PUT/DELETE)
2. Backend xử lý trong database
3. Backend trả về success response
4. Frontend NGAY LẬP TỨC gọi lại GET API
5. Render lại UI với dữ liệu mới
```

**Ví dụ: Tạo đơn hàng**
```javascript
// 1. Tạo sale
const result = await createSale(productId, quantity);

// 2. Reload products → thấy stock giảm
await loadProducts();

// 3. Reload sales → thấy đơn mới
await loadSales();

// → User thấy UI update ngay lập tức!
```

---

## 📊 REPORTS & CHARTS

### Revenue Chart (7 ngày gần đây)

```javascript
// Tính doanh thu theo ngày
const last7Days = [...Array(7)].map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return d.toISOString().split('T')[0];
});

const revenueByDay = last7Days.map(day => {
  return sales
    .filter(s => s.created_at.startsWith(day))
    .reduce((sum, s) => sum + s.total, 0);
});

// Render với Chart.js
new Chart(ctx, {
  type: 'line',
  data: {
    labels: last7Days,
    datasets: [{ data: revenueByDay }]
  }
});
```

### Top Products Chart

```javascript
// Group sales by product
const productSales = {};
sales.forEach(sale => {
  if (!productSales[sale.product_id]) {
    productSales[sale.product_id] = { name: sale.product_name, total: 0 };
  }
  productSales[sale.product_id].total += sale.total;
});

// Sort và lấy top 5
const topProducts = Object.values(productSales)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5);
```

---

## 🎨 UI/UX DESIGN PATTERNS

### Navbar (Professional Corporate Style)

```html
<nav class="bg-indigo-900 text-white shadow-lg">
  <!-- Desktop menu -->
  <div class="hidden md:flex space-x-4">
    <a href="...">Dashboard</a>
    <a href="...">Sản phẩm</a>
    ...
  </div>
  
  <!-- Mobile menu (horizontal scroll) -->
  <div class="md:hidden mt-3 flex space-x-3 overflow-x-auto">
    ...
  </div>
</nav>
```

### Responsive Grid Layout

```html
<!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  ...
</div>
```

### Modal Pattern

```javascript
// Show modal
modal.classList.remove('hidden');

// Hide modal
modal.classList.add('hidden');
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Password Hashing
```javascript
// KHÔNG BAO GIỜ lưu plain password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### 2. JWT Token
```javascript
// Tạo token với expiration
const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });

// Verify token
const decoded = jwt.verify(token, SECRET);
```

### 3. SQL Injection Prevention
```javascript
// ✅ ĐÚNG: Dùng parameterized query
const result = await query(
  'SELECT * FROM products WHERE id = $1',
  [productId]
);

// ❌ SAI: String concatenation
const result = await query(
  `SELECT * FROM products WHERE id = ${productId}`
);
```

### 4. CORS Headers
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### 1. Database Indexes
```sql
-- Tăng tốc search
CREATE INDEX idx_products_name ON products(name);

-- Tăng tốc filter theo date
CREATE INDEX idx_sales_created_at ON sales(created_at);
```

### 2. Debounce Search
```javascript
// Chỉ gọi API sau 300ms không typing
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    search(e.target.value);
  }, 300);
});
```

### 3. Connection Pooling
```javascript
// Dùng pg Pool thay vì tạo connection mỗi lần
const pool = new Pool({ connectionString: DATABASE_URL });
```

---

## 🐛 ERROR HANDLING

### Backend API
```javascript
try {
  // Logic xử lý
} catch (error) {
  console.error('Error:', error);
  return res.status(500).json({ error: 'Lỗi server' });
}
```

### Frontend
```javascript
try {
  await apiCall();
  showNotification('Thành công!', 'success');
} catch (error) {
  showNotification(error.message, 'error');
}
```

---

## 📱 MOBILE RESPONSIVE

### Breakpoints (TailwindCSS)
```
sm: 640px   → Mobile landscape
md: 768px   → Tablet
lg: 1024px  → Laptop
xl: 1280px  → Desktop
```

### Mobile-First Approach
```html
<!-- Base: Mobile -->
<div class="text-sm">

<!-- Tablet and up -->
<div class="md:text-base">

<!-- Desktop and up -->
<div class="lg:text-lg">
```

---

## 🎯 KEY FEATURES SUMMARY

### ✅ Realtime Search
- Debounce 300ms
- ILIKE cho Unicode
- Không reload page

### ✅ Auto Stock Update
- Transaction đảm bảo consistency
- Stock tự động trừ sau bán hàng
- Frontend reload data ngay lập tức

### ✅ Product Detail
- Thống kê đầy đủ (sold, revenue)
- Cảnh báo tồn kho (OK, LOW, OUT_OF_STOCK)
- Lịch sử 10 đơn gần nhất

### ✅ Multi-Device Support
- Responsive design
- Cloud database (Neon)
- JWT authentication
- Mọi thiết bị đều thấy data realtime

---

**🎉 ĐÃ HOÀN THÀNH TẤT CẢ YÊU CẦU TRONG ĐỀ BÀI!**