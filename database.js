require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

async function initDb() {

    // Bảng sản phẩm
    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            image TEXT,
            description TEXT,
            stock INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bảng đơn hàng
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            note TEXT,
            total INTEGER NOT NULL,
            status TEXT DEFAULT 'Chờ xác nhận',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bảng chi tiết đơn hàng
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            product_id INTEGER REFERENCES products(id),
            product_name TEXT NOT NULL,
            price INTEGER NOT NULL,
            quantity INTEGER NOT NULL
        )
    `);

    // Thêm sản phẩm mẫu nếu chưa có
    const result = await pool.query(
        "SELECT COUNT(*) FROM products"
    );

    if (Number(result.rows[0].count) === 0) {

        await pool.query(`
            INSERT INTO products
            (name, price, image, description, stock)
            VALUES
            (
                'Bó hoa hồng tình yêu',
                350000,
                'https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=600',
                'Bó hoa hồng dành tặng người yêu',
                20
            ),
            (
                'Bó hoa tulip pastel',
                450000,
                'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600',
                'Bó hoa tulip màu pastel',
                15
            ),
            (
                'Bó hoa hướng dương',
                300000,
                'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600',
                'Bó hoa hướng dương tươi đẹp',
                10
            )
        `);
    }

    console.log("Đã kết nối PostgreSQL Bloom Flower!");
}

module.exports = {
    pool,
    initDb
};
