
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Đọc dữ liệu JSON
app.use(express.json());

// Quản lý phiên đăng nhập
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

// Phục vụ website
app.use(express.static("public"));

// ============================
// KIỂM TRA ĐĂNG NHẬP ADMIN
// ============================

function requireAdmin(req, res, next) {
    if (!req.session.isAdmin) {
        return res.status(401).json({
            message: "Bạn cần đăng nhập quản trị!"
        });
    }

    next();
}

// ============================
// ĐĂNG NHẬP ADMIN
// ============================

app.post("/api/admin/login", (req, res) => {

    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({
            message: "Chưa cấu hình mật khẩu quản trị"
        });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            message: "Mật khẩu không chính xác"
        });
    }

    req.session.isAdmin = true;

    res.json({
        success: true,
        message: "Đăng nhập thành công"
    });
});

// Đăng xuất
app.post("/api/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// ============================
// HIỂN THỊ SẢN PHẨM
// ============================

app.get("/api/products", (req, res) => {

    const products = db.prepare(`
        SELECT * FROM products
        ORDER BY id DESC
    `).all();

    res.json(products);
});

// ============================
// THÊM SẢN PHẨM
// ============================

app.post("/api/admin/products", requireAdmin, (req, res) => {

    const { name, price, image, description, stock } = req.body;

    if (!name || !Number.isInteger(price) || price < 0) {
        return res.status(400).json({
            message: "Tên hoặc giá sản phẩm không hợp lệ"
        });
    }

    const result = db.prepare(`
        INSERT INTO products
        (name, price, image, description, stock)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        name,
        price,
        image || "",
        description || "",
        Number.isInteger(stock) && stock >= 0 ? stock : 0
    );

    res.json({
        success: true,
        id: result.lastInsertRowid,
        message: "Đã thêm sản phẩm"
    });
});

// ============================
// SỬA SẢN PHẨM
// ============================

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {

    const { name, price, image, description, stock } = req.body;

    if (!name || !Number.isInteger(price) || price < 0 ||
        !Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
            message: "Thông tin sản phẩm không hợp lệ"
        });
    }

    const result = db.prepare(`
        UPDATE products
        SET name = ?, price = ?, image = ?,
            description = ?, stock = ?
        WHERE id = ?
    `).run(
        name,
        price,
        image || "",
        description || "",
        stock,
        req.params.id
    );

    res.json({
        success: result.changes > 0,
        message: "Đã cập nhật sản phẩm"
    });
});

// ============================
// XÓA SẢN PHẨM
// ============================

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {

    const result = db.prepare(`
        DELETE FROM products WHERE id = ?
    `).run(req.params.id);

    res.json({
        success: result.changes > 0,
        message: "Đã xóa sản phẩm"
    });
});
// ============================
// THỐNG KÊ QUẢN TRỊ
// ============================

app.get("/api/admin/stats", requireAdmin, (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT
                COUNT(*) AS totalOrders,
                COALESCE(SUM(
                    CASE WHEN status = 'Hoàn thành'
                    THEN total ELSE 0 END
                ), 0) AS revenue,
                COUNT(CASE
                    WHEN status = 'Chờ xác nhận' THEN 1
                END) AS pendingOrders,
                COUNT(CASE
                    WHEN status = 'Hoàn thành' THEN 1
                END) AS completedOrders
            FROM orders
        `).get();

        res.json(stats);
    } catch (error) {
        console.error("Lỗi thống kê:", error);
        res.status(500).json({
            message: "Không thể tải thống kê"
        });
    }
});
// ============================
// THỐNG KÊ DOANH THU
// ============================

app.get("/api/admin/stats", requireAdmin, (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT
                COUNT(*) AS totalOrders,
                COALESCE(SUM(
                    CASE WHEN status = 'Hoàn thành'
                    THEN total ELSE 0 END
                ), 0) AS revenue,
                SUM(
                    CASE WHEN status = 'Chờ xác nhận'
                    THEN 1 ELSE 0 END
                ) AS pendingOrders,
                SUM(
                    CASE WHEN status = 'Hoàn thành'
                    THEN 1 ELSE 0 END
                ) AS completedOrders
            FROM orders
        `).get();

        res.json(stats);
    } catch (error) {
        console.error("Lỗi thống kê:", error);
        res.status(500).json({
            message: "Không thể tải thống kê"
        });
    }
});
// ============================
// XEM ĐƠN HÀNG
// ============================

app.get("/api/admin/orders", requireAdmin, (req, res) => {

    const orders = db.prepare(`
        SELECT * FROM orders
        ORDER BY id DESC
    `).all();

    const getItems = db.prepare(`
        SELECT * FROM order_items
        WHERE order_id = ?
    `);

    const result = orders.map(order => ({
        ...order,
        items: getItems.all(order.id)
    }));

    res.json(result);
});

// ============================
// CẬP NHẬT TRẠNG THÁI ĐƠN
// ============================

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {

    const allowed = [
        "Chờ xác nhận",
        "Đang giao",
        "Hoàn thành",
        "Đã hủy"
    ];

    const { status } = req.body;

    if (!allowed.includes(status)) {
        return res.status(400).json({
            message: "Trạng thái không hợp lệ"
        });
    }

    const result = db.prepare(`
        UPDATE orders SET status = ? WHERE id = ?
    `).run(status, req.params.id);

    res.json({
        success: result.changes > 0
    });
});

// ============================
// KHÁCH HÀNG TẠO ĐƠN HÀNG
// ============================

app.post("/api/orders", (req, res) => {

    const {
        name,
        phone,
        address,
        note,
        items
    } = req.body;

    if (!name || !phone || !address ||
        !Array.isArray(items) || items.length === 0 ||
        items.length > 50) {
        return res.status(400).json({
            message: "Thông tin đặt hàng không hợp lệ"
        });
    }

    if (!/^[0-9]{10,11}$/.test(phone)) {
        return res.status(400).json({
            message: "Số điện thoại không hợp lệ"
        });
    }

    try {
        const createOrder = db.transaction(() => {

            let total = 0;
            const orderProducts = [];

            for (const item of items) {

                if (!Number.isSafeInteger(item.productId) ||
                    !Number.isSafeInteger(item.quantity) ||
                    item.quantity < 1 || item.quantity > 99) {
                    throw new Error("Sản phẩm không hợp lệ");
                }

                const product = db.prepare(`
                    SELECT * FROM products WHERE id = ?
                `).get(item.productId);

                if (!product || product.stock < item.quantity) {
                    throw new Error(
                        "Sản phẩm không tồn tại hoặc không đủ hàng"
                    );
                }

                total += product.price * item.quantity;

                orderProducts.push({
                    ...product,
                    quantity: item.quantity
                });
            }

            const order = db.prepare(`
                INSERT INTO orders
                (customer_name, phone, address, note, total)
                VALUES (?, ?, ?, ?, ?)
            `).run(name, phone, address, note || "", total);

            const orderId = order.lastInsertRowid;

            const insertItem = db.prepare(`
                INSERT INTO order_items
                (order_id, product_id, product_name, price, quantity)
                VALUES (?, ?, ?, ?, ?)
            `);

            const updateStock = db.prepare(`
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
            `);

            for (const item of orderProducts) {
                insertItem.run(
                    orderId,
                    item.id,
                    item.name,
                    item.price,
                    item.quantity
                );

                updateStock.run(item.quantity, item.id);
            }

            return { orderId, total };
        });

        const result = createOrder();

        res.status(201).json({
            success: true,
            message: "Đặt hàng thành công!",
            orderId: result.orderId,
            total: result.total
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// ============================
// KHỞI ĐỘNG SERVER
// ============================

// LẤY DANH SÁCH ĐƠN HÀNG
app.get("/api/admin/orders", requireAdmin, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT * FROM orders
            ORDER BY id DESC
        `).all();

        const getItems = db.prepare(`
            SELECT * FROM order_items
            WHERE order_id = ?
        `);

        const result = orders.map(order => ({
            ...order,
            items: getItems.all(order.id)
        }));

        res.json(result);
    } catch (error) {
        console.error("Lỗi lấy đơn hàng:", error);
        res.status(500).json({
            message: "Không thể tải danh sách đơn hàng"
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Bloom Flower đang chạy tại http://localhost:${PORT}`
    );
});
