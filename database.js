
const Database = require("better-sqlite3");
const path = require("path");

// Tạo hoặc mở cơ sở dữ liệu
const db = new Database(
    path.join(__dirname, "flower.db")
);

// Tối ưu SQLite
db.pragma("journal_mode = WAL");

// ===========================
// BẢNG SẢN PHẨM
// ===========================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        image TEXT,
        description TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ===========================
// BẢNG ĐƠN HÀNG
// ===========================

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        note TEXT,
        total INTEGER NOT NULL,
        status TEXT DEFAULT 'Chờ xác nhận',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ===========================
// BẢNG CHI TIẾT ĐƠN HÀNG
// ===========================

db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
`);

// ===========================
// THÊM SẢN PHẨM MẪU
// ===========================

const count = db.prepare(
    "SELECT COUNT(*) AS total FROM products"
).get().total;

if (count === 0) {

    const insert = db.prepare(`
        INSERT INTO products
        (name, price, image, description, stock)
        VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(
        "Bó hoa hồng tình yêu",
        350000,
        "https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=600",
        "Bó hoa hồng dành tặng người yêu",
        20
    );

    insert.run(
        "Bó hoa tulip pastel",
        450000,
        "https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600",
        "Bó hoa tulip màu pastel",
        15
    );

    insert.run(
        "Bó hoa hướng dương",
        300000,
        "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600",
        "Bó hoa hướng dương tươi đẹp",
        10
    );

}

console.log("Đã khởi tạo cơ sở dữ liệu Bloom Flower!");

module.exports = db;
