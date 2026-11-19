
let editingId = null;

// Hàm gọi API
async function api(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra");
    }

    return data;
}


// ==========================
// ĐĂNG NHẬP
// ==========================

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const password = document.getElementById(
        "admin-password"
    ).value;

    try {

        await api("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({ password })
        });

        document.getElementById("login-box").hidden = true;
        document.getElementById("dashboard").hidden = false;

        loadProducts();
loadOrders();
loadStats();

    } catch (error) {

        document.getElementById("login-message").textContent =
            error.message;

    }

});


// ==========================
// ĐĂNG XUẤT
// ==========================

document.getElementById("logout-btn").onclick =
async function() {

    try {
        await api("/api/admin/logout", {
            method: "POST"
        });

        location.reload();

    } catch (error) {
        alert(error.message);
    }

};


// ==========================
// CHUYỂN TAB
// ==========================

document.querySelectorAll("[data-tab]").forEach(button => {

    button.addEventListener("click", function() {

        const tab = this.dataset.tab;

        document.getElementById("products-tab").hidden =
            tab !== "products";

        document.getElementById("orders-tab").hidden =
            tab !== "orders";

    });

});


// ==========================
// HIỂN THỊ SẢN PHẨM
// ==========================

async function loadProducts() {

    try {

        const products = await api("/api/products");

        const list = document.getElementById("product-list");

        list.innerHTML = "";

        products.forEach(product => {

            const card = document.createElement("div");

            card.className = "admin-card";

            const title = document.createElement("h3");
            title.textContent = product.name;

            const price = document.createElement("p");
            price.textContent =
                "Giá: " + Number(product.price).toLocaleString("vi-VN") + "đ";

            const stock = document.createElement("p");
            stock.textContent = "Tồn kho: " + product.stock;

            const edit = document.createElement("button");
            edit.textContent = "Sửa";
            edit.addEventListener("click", () => editProduct(product));

            const remove = document.createElement("button");
            remove.textContent = "Xóa";
            remove.addEventListener("click", () => deleteProduct(product.id));

            card.append(title, price, stock, edit, remove);
            list.appendChild(card);

        });

    } catch (error) {
        alert(error.message);
    }

}


// ==========================
// THÊM / SỬA SẢN PHẨM
// ==========================

const productForm = document.getElementById("product-form");

productForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const product = {

        name: document.getElementById("product-name").value.trim(),

        price: Number(document.getElementById("product-price").value),

        image: document.getElementById("product-image").value.trim(),

        stock: Number(document.getElementById("product-stock").value),

        description: document.getElementById(
            "product-description"
        ).value.trim()

    };

    if (
        !product.name ||
        !Number.isSafeInteger(product.price) ||
        product.price < 0 ||
        !Number.isSafeInteger(product.stock) ||
        product.stock < 0
    ) {
        alert("Vui lòng kiểm tra tên, giá và tồn kho!");
        return;
    }

    try {

        const url = editingId
            ? "/api/admin/products/" + editingId
            : "/api/admin/products";

        const method = editingId ? "PUT" : "POST";

        await api(url, {
            method: method,
            body: JSON.stringify(product)
        });

        alert("Đã lưu sản phẩm!");

        resetProductForm();
        loadProducts();

    } catch (error) {

        alert(error.message);

    }

});


// ==========================
// SỬA SẢN PHẨM
// ==========================

function editProduct(product) {

    editingId = product.id;

    document.getElementById("product-name").value = product.name;

    document.getElementById("product-price").value = product.price;

    document.getElementById("product-image").value =
        product.image || "";

    document.getElementById("product-stock").value = product.stock;

    document.getElementById("product-description").value =
        product.description || "";

    document.getElementById("save-product").textContent =
        "Cập nhật sản phẩm";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ==========================
// LÀM MỚI FORM
// ==========================

function resetProductForm() {

    editingId = null;

    productForm.reset();

    document.getElementById("save-product").textContent =
        "Thêm sản phẩm";

    document.getElementById("product-id").value = "";

}

document.getElementById("cancel-edit").onclick =
resetProductForm;


// ==========================
// XÓA SẢN PHẨM
// ==========================

async function deleteProduct(id) {

    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
        return;
    }

    try {

        await api("/api/admin/products/" + id, {
            method: "DELETE"
        });

        alert("Đã xóa sản phẩm!");

        loadProducts();

    } catch (error) {
        alert(error.message);
    }

}


// ==========================
// THỐNG KÊ DOANH THU
// ==========================

async function loadStats() {

    try {

        const stats = await api("/api/admin/stats");

        document.getElementById("total-orders").textContent =
            stats.totalOrders || 0;

        document.getElementById("total-revenue").textContent =
            Number(stats.revenue || 0).toLocaleString("vi-VN") + "đ";

        document.getElementById("pending-orders").textContent =
            stats.pendingOrders || 0;

        document.getElementById("completed-orders").textContent =
            stats.completedOrders || 0;

    } catch (error) {
        console.error("Lỗi thống kê:", error);
    }

}

// ==========================
// QUẢN LÝ ĐƠN HÀNG
// ==========================

async function loadOrders() {

    try {

       const orders = await api("/api/admin/orders");

        const list = document.getElementById("order-list");

        list.innerHTML = "";

        orders.forEach(order => {

            const card = document.createElement("div");

            card.className = "admin-card";

            const title = document.createElement("h3");
            title.textContent = "Đơn hàng #" + order.id;

            const customer = document.createElement("p");
            customer.textContent =
                "Khách hàng: " + order.customer_name;

            const phone = document.createElement("p");
            phone.textContent = "SĐT: " + order.phone;

            const address = document.createElement("p");
address.textContent = "Địa chỉ: " + order.address;

            const items = document.createElement("p");
            items.textContent = "Sản phẩm: " +
                order.items.map(item =>
                    item.product_name + " x " + item.quantity
                ).join(", ");

            const total = document.createElement("p");
            total.textContent = "Tổng tiền: " +
                Number(order.total).toLocaleString("vi-VN") + "đ";

            const select = document.createElement("select");

            [
                "Chờ xác nhận",
                "Đang giao",
                "Hoàn thành",
                "Đã hủy"
            ].forEach(status => {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                if (status === order.status) {
                    option.selected = true;
                }

                select.appendChild(option);

            });

            const save = document.createElement("button");
            save.textContent = "Cập nhật trạng thái";

            save.addEventListener("click", async () => {

                try {

                    await api("/api/admin/orders/" + order.id, {
                        method: "PATCH",
                        body: JSON.stringify({
                            status: select.value
                        })
                    });

                    alert("Đã cập nhật đơn hàng!");

loadOrders();
loadStats();

                } catch (error) {
                    alert(error.message);
                }

            });

            card.append(
                title,
                customer,
                phone,
                address,
                items,
                total,
                select,
                save
            );

            list.appendChild(card);

        });

    } catch (error) {
        alert(error.message);
    }

}

