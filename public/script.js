let cart = [];
let products = [];

// ================================
// LOAD SẢN PHẨM
// ================================

async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Không thể tải sản phẩm");
        }

        products = await response.json();

        renderProducts(products);

    } catch (error) {
        console.error(error);

        document.getElementById("productGrid").innerHTML =
            "<p>❌ Không thể tải sản phẩm</p>";
    }
}


// ================================
// HIỂN THỊ SẢN PHẨM
// ================================

function renderProducts(list) {

    const grid =
        document.getElementById("productGrid");

    if (!grid) {
        return;
    }

    if (list.length === 0) {

        grid.innerHTML =
            "<p>Chưa có sản phẩm.</p>";

        return;
    }

    grid.innerHTML = list.map(product => {

        return `
            <div class="product">

                <div class="product-image">
                    🎮
                </div>

                <h3>
                    ${product.name}
                </h3>

                <p>
                    ${product.description || ""}
                </p>

                <div class="price">

                    ${Number(product.price)
                        .toLocaleString("vi-VN")}

                    VNĐ

                </div>

                <button
                    onclick="addToCart(${product.id})"
                >
                    🛒 MUA NGAY
                </button>

            </div>
        `;

    }).join("");
}


// ================================
// THÊM VÀO GIỎ
// ================================

function addToCart(id) {

    const product =
        products.find(
            p => Number(p.id) === Number(id)
        );

    if (!product) {

        alert(
            "❌ Không tìm thấy sản phẩm"
        );

        return;
    }

    cart = [product];

    const cartCount =
        document.getElementById("cartCount");

    if (cartCount) {

        cartCount.innerText =
            cart.length;

    }

    openCart();
}


// ================================
// TẠO ĐƠN HÀNG
// ================================

async function openCart() {

    if (cart.length === 0) {

        alert(
            "🛒 Giỏ hàng đang trống!"
        );

        return;
    }

    const product = cart[0];

    const customerName =
        prompt(
            "Nhập tên của bạn:"
        );

    if (!customerName) {

        return;
    }

    const customerEmail =
        prompt(
            "Nhập Email của bạn:"
        ) || "";


    try {

        console.log(
            "📦 Đang gửi đơn hàng..."
        );


        const requestData = {

            productId:
                Number(product.id),

            customerName:
                customerName,

            customerEmail:
                customerEmail

        };


        console.log(
            "📤 Dữ liệu gửi:",
            requestData
        );


        const response =

            await fetch(
                "/api/orders",
                {

                    method:
                        "POST",

                    headers:
                    {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            requestData
                        )

                }
            );


        console.log(
            "📡 HTTP Status:",
            response.status
        );


        // Đọc dạng TEXT trước
        const responseText =
            await response.text();


        console.log(
            "📥 Server trả về:",
            responseText
        );


        // Thử chuyển TEXT thành JSON
        let data;

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "❌ Server không trả về JSON!"
            );

            console.error(
                "Nội dung server trả về:",
                responseText
            );

            throw new Error(
                "Server trả về HTML thay vì JSON"
            );

        }


        if (!response.ok) {

            throw new Error(

                data.error ||

                "Không thể tạo đơn hàng"

            );

        }


        console.log(
            "✅ Tạo đơn thành công:",
            data
        );


        // Hiện giao diện thanh toán
        showPayment(
            data
        );


    } catch (error) {

        console.error(
            "❌ LỖI MUA HÀNG:",
            error
        );


        alert(

            "❌ " +

            error.message

        );

    }

}


// ================================
// HIỆN GIAO DIỆN THANH TOÁN
// ================================

function showPayment(data) {

    const modal =
        document.getElementById(
            "paymentModal"
        );

    const orderCode =
        document.getElementById(
            "orderCode"
        );

    const orderAmount =
        document.getElementById(
            "orderAmount"
        );

    const transferContent =
        document.getElementById(
            "transferContent"
        );

    const checkOrderCode =
        document.getElementById(
            "checkOrderCode"
        );

    const paymentStatus =
        document.getElementById(
            "paymentStatus"
        );

    const downloadButton =
        document.getElementById(
            "downloadButton"
        );


    if (orderCode) {

        orderCode.innerText =
            data.orderCode;

    }


    if (orderAmount) {

        orderAmount.innerText =

            Number(
                data.amount
            ).toLocaleString(
                "vi-VN"
            ) +

            " VNĐ";

    }


    if (transferContent) {

        transferContent.innerText =
            data.orderCode;

    }


    if (checkOrderCode) {

        checkOrderCode.value =
            data.orderCode;

    }


    if (paymentStatus) {

        paymentStatus.innerText =
            "⏳ Đang chờ thanh toán...";

    }


    if (downloadButton) {

        downloadButton.style.display =
            "none";

    }


    if (modal) {

        modal.style.display =
            "flex";

    }

}


// ================================
// ĐÓNG THANH TOÁN
// ================================

function closePayment() {

    const modal =
        document.getElementById(
            "paymentModal"
        );

    if (modal) {

        modal.style.display =
            "none";

    }

}


// ================================
// KIỂM TRA THANH TOÁN
// ================================

async function checkPayment() {

    const codeInput =
        document.getElementById(
            "checkOrderCode"
        );

    const paymentStatus =
        document.getElementById(
            "paymentStatus"
        );

    const downloadButton =
        document.getElementById(
            "downloadButton"
        );


    const code =
        codeInput.value.trim();


    if (!code) {

        paymentStatus.innerText =
            "❌ Vui lòng nhập mã đơn hàng";

        return;
    }


    paymentStatus.innerText =
        "⏳ Đang kiểm tra thanh toán...";


    downloadButton.style.display =
        "none";


    try {

        const response =

            await fetch(

                "/api/orders/" +

                encodeURIComponent(
                    code
                ) +

                "/status"

            );


        const data =

            await response.json();


        if (!response.ok) {

            throw new Error(

                data.error ||

                "Không tìm thấy đơn hàng"

            );

        }


        if (
            data.status === "paid"
        ) {

            paymentStatus.innerText =
                "✅ Thanh toán thành công!";


            downloadButton.href =

                "/api/orders/" +

                encodeURIComponent(
                    code
                ) +

                "/download";


            downloadButton.style.display =
                "block";


        } else {

            paymentStatus.innerText =

                "⏳ Chưa nhận được thanh toán. Vui lòng thử lại sau.";

        }


    } catch (error) {

        console.error(
            error
        );


        paymentStatus.innerText =

            "❌ " +

            error.message;

    }

}


// ================================
// TÌM KIẾM
// ================================

function searchProduct() {

    const input =
        document.getElementById(
            "searchInput"
        );


    const keyword =

        input.value
            .toLowerCase()
            .trim();


    const result =

        products.filter(
            product =>

                product.name
                    .toLowerCase()
                    .includes(
                        keyword
                    )
        );


    renderProducts(
        result
    );

}


// ================================
// LỌC DANH MỤC
// ================================

function filterProducts(category) {

    if (
        category === "all"
    ) {

        renderProducts(
            products
        );

        return;

    }


    const result =

        products.filter(

            product =>

                product.category ===
                category

        );


    renderProducts(
        result
    );

}


// ================================
// KHỞI ĐỘNG
// ================================

document.addEventListener(

    "DOMContentLoaded",

    function() {

        loadProducts();

    }

);