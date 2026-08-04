let products = [];

let cart = [];


// ========================================
// LOAD SẢN PHẨM
// ========================================

async function loadProducts() {

    const grid =
        document.getElementById(
            "productGrid"
        );


    try {

        const response =
            await fetch(
                "/api/products"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải sản phẩm"
            );

        }


        products =
            await response.json();


        renderProducts(
            products
        );


    } catch (error) {

        console.error(
            error
        );


        grid.innerHTML =

            "<p>❌ Không thể tải sản phẩm</p>";

    }

}


// ========================================
// HIỂN THỊ SẢN PHẨM
// ========================================

function renderProducts(
    list
) {

    const grid =
        document.getElementById(
            "productGrid"
        );


    if (
        !list.length
    ) {

        grid.innerHTML =

            "<p>📭 Chưa có sản phẩm.</p>";

        return;

    }


    grid.innerHTML =

        list.map(
            product => `

            <div class="product">

                <div class="product-image">
                    🎮
                </div>

                <h3>
                    ${escapeHTML(
                        product.name
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        product.description ||
                        ""
                    )}
                </p>

                <div class="price">

                    ${Number(
                        product.price
                    ).toLocaleString(
                        "vi-VN"
                    )}

                    VNĐ

                </div>

                <button
                    onclick="
                        buyProduct(
                            ${product.id}
                        )
                    "
                >

                    🛒 MUA NGAY

                </button>

            </div>

        `
        ).join("");

}


// ========================================
// MUA SẢN PHẨM
// ========================================

function buyProduct(
    id
) {

    const product =

        products.find(

            item =>

                Number(
                    item.id
                ) ===

                Number(
                    id
                )

        );


    if (
        !product
    ) {

        alert(
            "❌ Không tìm thấy sản phẩm"
        );

        return;

    }


    cart = [
        product
    ];


    document.getElementById(
        "cartCount"
    ).innerText =
        "1";


    createOrder();

}


// ========================================
// GIỎ HÀNG
// ========================================

function openCart() {

    if (
        cart.length === 0
    ) {

        alert(
            "🛒 Giỏ hàng đang trống!"
        );

        return;

    }


    createOrder();

}


// ========================================
// TẠO ĐƠN
// ========================================

async function createOrder() {

    const product =
        cart[0];


    if (
        !product
    ) {

        return;

    }


    const customerName =

        prompt(
            "Nhập tên của bạn:"
        );


    if (
        !customerName ||
        !customerName.trim()
    ) {

        return;

    }


    const customerEmail =

        prompt(
            "Nhập Email của bạn:"
        ) || "";


    try {

        const response =

            await fetch(
                "/api/orders",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            productId:
                                product.id,

                            customerName:
                                customerName.trim(),

                            customerEmail:
                                customerEmail.trim()

                        })

                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error
            );

        }


        showPayment(
            data
        );


    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }

}


// ========================================
// HIỆN QR
// ========================================

function showPayment(
    data
) {

    document.getElementById(
        "orderCode"
    ).innerText =
        data.orderCode;


    document.getElementById(
        "orderAmount"
    ).innerText =

        Number(
            data.amount
        ).toLocaleString(
            "vi-VN"
        ) +

        " VNĐ";


    document.getElementById(
        "transferContent"
    ).innerText =
        data.orderCode;


    document.getElementById(
        "checkOrderCode"
    ).value =
        data.orderCode;


    document.getElementById(
        "paymentStatus"
    ).innerText =

        "⏳ Đang chờ shop xác nhận thanh toán...";


    document.getElementById(
        "downloadButton"
    ).style.display =
        "none";


    document.getElementById(
        "paymentModal"
    ).style.display =
        "flex";

}


// ========================================
// ĐÓNG QR
// ========================================

function closePayment() {

    document.getElementById(
        "paymentModal"
    ).style.display =
        "none";

}


// ========================================
// KIỂM TRA THANH TOÁN
// ========================================

async function checkPayment() {

    const code =

        document.getElementById(
            "checkOrderCode"
        ).value.trim();


    const status =

        document.getElementById(
            "paymentStatus"
        );


    const download =

        document.getElementById(
            "downloadButton"
        );


    if (
        !code
    ) {

        status.innerText =
            "❌ Vui lòng nhập mã đơn hàng";

        return;

    }


    status.innerText =
        "⏳ Đang kiểm tra...";


    download.style.display =
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


        if (
            !response.ok
        ) {

            throw new Error(
                data.error
            );

        }


        if (
            data.status ===
            "paid"
        ) {

            status.innerText =

                "✅ Thanh toán thành công!";


            download.href =

                "/api/orders/" +

                encodeURIComponent(
                    code
                ) +

                "/download";


            download.style.display =
                "block";


        } else {

            status.innerText =

                "⏳ Shop chưa xác nhận thanh toán.";

        }


    } catch (error) {

        status.innerText =

            "❌ " +
            error.message;

    }

}


// ========================================
// TÌM KIẾM
// ========================================

function searchProduct() {

    const keyword =

        document.getElementById(
            "searchInput"
        ).value

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


// ========================================
// LỌC
// ========================================

function filterProducts(
    category
) {

    if (
        category ===
        "all"
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


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(
    text
) {

    return String(
        text
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================
// START
// ========================================

document.addEventListener(

    "DOMContentLoaded",

    function() {

        loadProducts();

    }

);
