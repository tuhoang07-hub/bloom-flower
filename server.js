require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const { pool, initDb } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Tin cậy proxy của Render
app.set("trust proxy", 1);

// Đọc JSON
app.use(express.json());

// Quản lý phiên đăng nhập
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 2 * 60 * 60 * 1000
    }
}));

// Phục vụ website
app.use(express.static(path.join(__dirname, "public")));

// Kiểm tra đăng nhập admin
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
// SẢN PHẨM
// ============================

// Lấy danh sách sản phẩm
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM products
            ORDER BY id DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Lỗi lấy sản phẩm:", error);
        res.status(500).json({
            message: "Không thể tải sản phẩm"
        });
    }
});

// Thêm sản phẩm
app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
        const { name, price, image, description, stock } = req.body;

        if (!name || !Number.isInteger(price) || price < 0) {
            return res.status(400).json({
                message: "Tên hoặc giá sản phẩm không hợp lệ"
            });
        }

        const result = await pool.query(`
            INSERT INTO products
            (name, price, image, description, stock)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            name,
            price,
            image || "",
            description || "",
            Number.isInteger(stock) && stock >= 0 ? stock : 0
        ]);

        res.json({
            success: true,
            id: result.rows[0].id,
            message: "Đã thêm sản phẩm"
        });
    } catch (error) {
        console.error("Lỗi thêm sản phẩm:", error);
        res.status(500).json({
            message: "Không thể thêm sản phẩm"
        });
    }
});

// Sửa sản phẩm
app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
        const { name, price, image, description, stock } = req.body;

        if (
            !name ||
            !Number.isInteger(price) ||
            price < 0 ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return res.status(400).json({
                message: "Thông tin sản phẩm không hợp lệ"
            });
        }

        const result = await pool.query(`
            UPDATE products
            SET name = $1,
                price = $2,
                image = $3,
                description = $4,
                stock = $5
            WHERE id = $6
        `, [
            name,
            price,
            image || "",
            description || "",
            stock,
            req.params.id
        ]);

        res.json({
            success: result.rowCount > 0,
            message: "Đã cập nhật sản phẩm"
        });
    } catch (error) {
        console.error("Lỗi sửa sản phẩm:", error);
        res.status(500).json({
            message: "Không thể cập nhật sản phẩm"
        });
    }
});

// Xóa sản phẩm
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            DELETE FROM products
            WHERE id = $1
        `, [req.params.id]);

        res.json({
            success: result.rowCount > 0,
            message: "Đã xóa sản phẩm"
        });
    } catch (error) {
        console.error("Lỗi xóa sản phẩm:", error);
        res.status(500).json({
            message: "Không thể xóa sản phẩm"
        });
    }
});

// ============================
// THỐNG KÊ ADMIN
// ============================

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS "totalOrders",
                COALESCE(
                    SUM(CASE
                        WHEN status = 'Hoàn thành'
                        THEN total ELSE 0
                    END), 0
                ) AS revenue,
                COUNT(CASE
                    WHEN status = 'Chờ xác nhận'
                    THEN 1
                END) AS "pendingOrders",
                COUNT(CASE
                    WHEN status = 'Hoàn thành'
                    THEN 1
                END) AS "completedOrders"
            FROM orders
        `);

        const stats = result.rows[0];

        res.json({
            totalOrders: Number(stats.totalOrders),
            revenue: Number(stats.revenue),
            pendingOrders: Number(stats.pendingOrders),
            completedOrders: Number(stats.completedOrders)
        });
    } catch (error) {
        console.error("Lỗi thống kê:", error);
        res.status(500).json({
            message: "Không thể tải thống kê"
        });
    }
});

// ============================
// DANH SÁCH ĐƠN HÀNG
// ============================

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
        const ordersResult = await pool.query(`
            SELECT * FROM orders
            ORDER BY id DESC
        `);

        const orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]);
        }

        const orderIds = orders.map(order => order.id);

        const itemsResult = await pool.query(`
            SELECT * FROM order_items
            WHERE order_id = ANY($1::int[])
        `, [orderIds]);

        const itemsByOrder = {};

        for (const item of itemsResult.rows) {
            if (!itemsByOrder[item.order_id]) {
                itemsByOrder[item.order_id] = [];
            }

            itemsByOrder[item.order_id].push(item);
        }

        const result = orders.map(order => ({
            ...order,
            items: itemsByOrder[order.id] || []
        }));

        res.json(result);
    } catch (error) {
        console.error("Lỗi lấy đơn hàng:", error);
        res.status(500).json({
            message: "Không thể tải danh sách đơn hàng"
        });
    }
});

// ============================
// CẬP NHẬT TRẠNG THÁI ĐƠN
// ============================

app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
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

        const result = await pool.query(`
            UPDATE orders
            SET status = $1
            WHERE id = $2
        `, [status, req.params.id]);

        res.json({
            success: result.rowCount > 0
        });
    } catch (error) {
        console.error("Lỗi cập nhật đơn:", error);
        res.status(500).json({
            message: "Không thể cập nhật đơn hàng"
        });
    }
});

// ============================
// KHÁCH HÀNG ĐẶT HÀNG
// ============================

app.post("/api/orders", async (req, res) => {
    const {
        name,
        phone,
        address,
        note,
        items
    } = req.body;

    if (
        !name ||
        !phone ||
        !address ||
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > 50
    ) {
        return res.status(400).json({
            message: "Thông tin đặt hàng không hợp lệ"
        });
    }

    if (!/^[0-9]{10,11}$/.test(phone)) {
        return res.status(400).json({
            message: "Số điện thoại không hợp lệ"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let total = 0;
        const orderProducts = [];

        // Gộp sản phẩm trùng nhau
        const quantities = {};

        for (const item of items) {
            if (
                !Number.isSafeInteger(item.productId) ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 99
            ) {
                throw new Error("Sản phẩm không hợp lệ");
            }

            quantities[item.productId] =
                (quantities[item.productId] || 0) + item.quantity;
        }

        // Kiểm tra tồn kho và khóa sản phẩm
        for (const [productId, quantity] of Object.entries(quantities)) {
            const productResult = await client.query(`
                SELECT * FROM products
                WHERE id = $1
                FOR UPDATE
            `, [productId]);

            const product = productResult.rows[0];

            if (!product || product.stock < quantity) {
                throw new Error(
                    "Sản phẩm không tồn tại hoặc không đủ hàng"
                );
            }

            total += product.price * quantity;

            orderProducts.push({
                ...product,
                quantity
            });
        }

        // Tạo đơn hàng
        const orderResult = await client.query(`
            INSERT INTO orders
            (customer_name, phone, address, note, total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [name, phone, address, note || "", total]);

        const orderId = orderResult.rows[0].id;

        // Lưu chi tiết và trừ kho
        for (const item of orderProducts) {
            await client.query(`
                INSERT INTO order_items
                (order_id, product_id, product_name, price, quantity)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                orderId,
                item.id,
                item.name,
                item.price,
                item.quantity
            ]);

            await client.query(`
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2
            `, [item.quantity, item.id]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Đặt hàng thành công!",
            orderId,
            total
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Lỗi rollback:", rollbackError);
        }

        console.error("Lỗi đặt hàng:", error);

        res.status(400).json({
            message: error.message || "Không thể đặt hàng"
        });

    } finally {
        client.release();
    }
});

// ============================
// KHỞI ĐỘNG SERVER
// ============================

async function startServer() {
    try {
        await initDb();

        app.listen(PORT, () => {
            console.log(
                `Bloom Flower đang chạy tại http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Không thể khởi động:", error);
        process.exit(1);
    }
}

startServer();
