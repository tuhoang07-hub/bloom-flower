
// ==============================
// 1. KHỞI TẠO GIỎ HÀNG
// ==============================

let cart = [];


// ==============================
// 2. ĐỊNH DẠNG TIỀN VIỆT NAM
// ==============================

function formatMoney(number) {
    return number.toLocaleString("vi-VN") + "đ";
}


// ==============================
// 3. THÊM SẢN PHẨM VÀO GIỎ
// ==============================



// XỬ LÝ NÚT THÊM VÀO GIỎ HÀNG
document.addEventListener("click", function(event) {
    const button = event.target.closest(".buy-btn");

    if (!button) return;

    const productCard = button.closest(".product-card");

    if (!productCard) return;

    const productId = Number(productCard.dataset.productId);
    const name = productCard.querySelector("h3").innerText;
    const priceText = productCard.querySelector(".price").innerText;
    const price = Number(priceText.replace(/\D/g, ""));

    if (!productId || !Number.isSafeInteger(price)) {
        alert("Thông tin sản phẩm không hợp lệ!");
        return;
    }

    const existingProduct = cart.find(
        item => item.productId === productId
    );

    if (existingProduct) {
        existingProduct.quantity++;
    } else {
        cart.push({
            productId: productId,
            name: name,
            price: price,
            quantity: 1
        });
    }

    renderCart();

    alert("Đã thêm " + name + " vào giỏ hàng!");
});

// ==============================

function renderCart() {

    const cartItems = document.getElementById("cart-items");

    const cartCount = document.getElementById("cart-count");

    const cartTotal = document.getElementById("cart-total");

    // Tính tổng số lượng sản phẩm
    let totalQuantity = 0;

    // Tính tổng tiền
    let totalMoney = 0;

    // Xóa nội dung cũ
    cartItems.innerHTML = "";

    // Nếu giỏ hàng trống
    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p class="empty-cart">
                Giỏ hàng của bạn đang trống!
            </p>
        `;

    }

    // Duyệt qua từng sản phẩm
    cart.forEach((item, index) => {

        totalQuantity += item.quantity;

        totalMoney += item.price * item.quantity;

        cartItems.innerHTML += `
            <div class="cart-item">

                <div>
                    <h3>${item.name}</h3>

                    <p>
                        ${formatMoney(item.price)}
                        x ${item.quantity}
                    </p>
                </div>

                <button
                    class="remove-btn"
                    onclick="removeItem(${index})">
                    Xóa
                </button>

            </div>
        `;

    });

    // Cập nhật số lượng
    cartCount.innerText = totalQuantity;

    // Cập nhật tổng tiền
    cartTotal.innerText = formatMoney(totalMoney);

}


// ==============================
// 5. XÓA MỘT SẢN PHẨM
// ==============================

function removeItem(index) {

    cart.splice(index, 1);

    renderCart();

}


// ==============================
// 6. XÓA TOÀN BỘ GIỎ HÀNG
// ==============================

function clearCart() {

    cart = [];

    renderCart();

}


// ==============================
// 7. ĐÓNG / MỞ GIỎ HÀNG
// ==============================

function toggleCart() {

    const cartSection = document.getElementById("shopping-cart");

    cartSection.classList.toggle("show");

}

// ==============================
// 8. XÁC NHẬN ĐƠN HÀNG
// ==============================

const orderForm = document.getElementById("order-form");


orderForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    if (cart.length === 0) {
        alert("Bạn chưa chọn sản phẩm!");
        return;
    }

    const orderData = {
        name: document.getElementById("customer-name").value,
        phone: document.getElementById("customer-phone").value,
        address: document.getElementById("customer-address").value,
        note: document.getElementById("customer-note").value,

        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }))
    };

    try {

        const response = await fetch("/api/orders", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(orderData)
        });

        const responseText = await response.text();

let result = {};

try {
    result = responseText ? JSON.parse(responseText) : {};
} catch (error) {
    throw new Error(
        `Máy chủ trả dữ liệu không hợp lệ. HTTP ${response.status}: ${responseText}`
    );
}

if (!response.ok) {
    throw new Error(result.message || `Lỗi máy chủ HTTP ${response.status}`);
}

if (!responseText) {
    throw new Error(`Máy chủ trả về dữ liệu rỗng. HTTP ${response.status}`);
}

        document.getElementById("order-result").innerHTML = `
            <h3>🌸 Đặt hàng thành công!</h3>
            <p>Mã đơn hàng: ${result.orderId}</p>
            <p>Tổng tiền: ${formatMoney(result.total)}</p>
            <p>Cảm ơn bạn đã mua hoa tại Bloom Flower!</p>
        `;

        cart = [];
        renderCart();
        orderForm.reset();

    } catch (error) {

        alert("Không thể đặt hàng: " + error.message);

    }

});


    

