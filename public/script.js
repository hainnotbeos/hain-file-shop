let cart = [];
let products = [];


// ========================================
// LOAD SẢN PHẨM
// ========================================

async function loadProducts() {

    try {

        const response =
            await fetch("/api/products");

        if (!response.ok) {

            throw new Error(
                "Không thể tải sản phẩm"
            );

        }

        products =
            await response.json();

        renderProducts(products);

    } catch (error) {

        console.error(
            "❌ Lỗi tải sản phẩm:",
            error
        );

        const grid =
            document.getElementById(
                "productGrid"
            );

        if (grid) {

            grid.innerHTML = `
                <p>
                    ❌ Không thể tải sản phẩm.
                    Vui lòng thử tải lại trang.
                </p>
            `;

        }

    }

}


// ========================================
// HIỂN THỊ SẢN PHẨM
// ========================================

function renderProducts(list) {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!grid) {
        return;
    }

    if (!list || list.length === 0) {

        grid.innerHTML = `
            <p>
                📭 Chưa có sản phẩm.
            </p>
        `;

        return;

    }

    grid.innerHTML =

        list.map(product => {

            return `

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
                            product.description || ""
                        )}
                    </p>

                    <div class="price">

                        ${Number(
                            product.price
                        ).toLocaleString("vi-VN")}

                        VNĐ

                    </div>

                    <button
                        onclick="addToCart(${Number(product.id)})"
                    >

                        🛒 MUA NGAY

                    </button>

                </div>

            `;

        }).join("");

}


// ========================================
// THÊM VÀO GIỎ
// ========================================

function addToCart(id) {

    const product =
        products.find(

            p =>
                Number(p.id) ===
                Number(id)

        );

    if (!product) {

        alert(
            "❌ Không tìm thấy sản phẩm"
        );

        return;

    }

    // Shop hiện tại mua từng sản phẩm
    cart = [product];

    updateCartCount();

    openCart();

}


// ========================================
// CẬP NHẬT SỐ LƯỢNG GIỎ
// ========================================

function updateCartCount() {

    const cartCount =
        document.getElementById(
            "cartCount"
        );

    if (cartCount) {

        cartCount.innerText =
            cart.length;

    }

}


// ========================================
// TẠO ĐƠN HÀNG
// ========================================

async function openCart() {

    if (cart.length === 0) {

        alert(
            "🛒 Giỏ hàng đang trống!"
        );

        return;

    }

    const product =
        cart[0];


    const customerName =
        prompt(
            "Nhập tên của bạn:"
        );


    if (!customerName) {

        return;

    }


    const customerEmail =
        prompt(
            "Nhập Email của bạn (có thể bỏ qua):"
        ) || "";


    try {

        const requestData = {

            productId:
                Number(product.id),

            customerName:
                customerName.trim(),

            customerEmail:
                customerEmail.trim()

        };


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


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            console.error(
                "Server trả về:",
                responseText
            );

            throw new Error(
                "Server không trả về JSON. Hãy kiểm tra server.js."
            );

        }


        if (!response.ok) {

            throw new Error(

                data.error ||
                "Không thể tạo đơn hàng"

            );

        }


        // ====================================
        // LƯU ĐƠN VÀO LỊCH SỬ
        // ====================================

        saveOrderToHistory(data);


        // Hiện thanh toán

        showPayment(data);


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


// ========================================
// HIỆN GIAO DIỆN THANH TOÁN
// ========================================

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


// ========================================
// ĐÓNG PAYMENT
// ========================================

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


// ========================================
// KIỂM TRA THANH TOÁN
// ========================================

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


    if (!codeInput) {
        return;
    }


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
            data.status ===
            "paid"
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


// ========================================
// TÌM KIẾM
// ========================================

function searchProduct() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {
        return;
    }


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


// ========================================
// LỌC DANH MỤC
// ========================================

function filterProducts(category) {

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
// LẤY LỊCH SỬ ĐƠN HÀNG
// ========================================

function getOrderHistory() {

    try {

        return JSON.parse(

            localStorage.getItem(
                "hainOrderHistory"
            )

        ) || [];

    } catch (error) {

        console.error(
            "❌ Lỗi đọc lịch sử:",
            error
        );

        return [];

    }

}


// ========================================
// LƯU ĐƠN HÀNG
// ========================================

function saveOrderToHistory(order) {

    if (
        !order ||
        !order.orderCode
    ) {

        return;

    }


    let history =
        getOrderHistory();


    const exists =

        history.some(

            item =>

                item.orderCode ===
                order.orderCode

        );


    if (!exists) {

        history.unshift({

            orderCode:
                order.orderCode,

            amount:
                Number(
                    order.amount
                ),

            productName:
                order.productName ||
                "Sản phẩm",

            createdAt:
                new Date().toISOString()

        });

    }


    // Giữ tối đa 20 đơn

    history =
        history.slice(
            0,
            20
        );


    localStorage.setItem(

        "hainOrderHistory",

        JSON.stringify(
            history
        )

    );

}


// ========================================
// MỞ LỊCH SỬ
// ========================================

function openOrderHistory() {

    const modal =
        document.getElementById(
            "historyModal"
        );


    if (!modal) {
        return;
    }


    renderOrderHistory();


    modal.style.display =
        "flex";

}


// ========================================
// ĐÓNG LỊCH SỬ
// ========================================

function closeOrderHistory() {

    const modal =
        document.getElementById(
            "historyModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ========================================
// HIỂN THỊ LỊCH SỬ
// ========================================

function renderOrderHistory() {

    const container =
        document.getElementById(
            "orderHistoryList"
        );


    if (!container) {
        return;
    }


    const history =
        getOrderHistory();


    if (
        history.length === 0
    ) {

        container.innerHTML = `

            <div
                style="
                    padding:20px;
                    text-align:center;
                "
            >

                📭 Chưa có đơn hàng nào.

            </div>

        `;

        return;

    }


    container.innerHTML =

        history.map(

            order => {

                const date =

                    new Date(
                        order.createdAt
                    ).toLocaleString(
                        "vi-VN"
                    );


                return `

                    <div
                        class="history-item"
                        style="
                            background:#222;
                            padding:15px;
                            margin-top:12px;
                            border-radius:10px;
                            border:1px solid #333;
                        "
                    >

                        <h3>

                            🎮

                            ${escapeHTML(
                                order.productName
                            )}

                        </h3>

                        <p>

                            💰

                            ${Number(
                                order.amount
                            ).toLocaleString(
                                "vi-VN"
                            )}

                            VNĐ

                        </p>

                        <p>

                            🧾 Mã đơn:

                            <strong>

                                ${escapeHTML(
                                    order.orderCode
                                )}

                            </strong>

                        </p>

                        <p>

                            🕒 ${date}

                        </p>

                        <button

                            onclick="
                                checkHistoryOrder(
                                    '${escapeHTML(
                                        order.orderCode
                                    )}'
                                )
                            "

                        >

                            🔍 KIỂM TRA ĐƠN

                        </button>

                        <button

                            style="
                                margin-top:8px;
                                background:#444;
                            "

                            onclick="
                                removeOrderHistory(
                                    '${escapeHTML(
                                        order.orderCode
                                    )}'
                                )
                            "

                        >

                            🗑️ XÓA KHỎI LỊCH SỬ

                        </button>

                    </div>

                `;

            }

        ).join("");

}


// ========================================
// KIỂM TRA ĐƠN TỪ LỊCH SỬ
// ========================================

async function checkHistoryOrder(
    orderCode
) {

    try {

        const response =
            await fetch(

                "/api/orders/" +

                encodeURIComponent(
                    orderCode
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
            data.status ===
            "paid"
        ) {

            const downloadUrl =

                "/api/orders/" +

                encodeURIComponent(
                    orderCode
                ) +

                "/download";


            const shouldDownload =

                confirm(

                    "✅ Đơn hàng đã thanh toán thành công!\n\n" +

                    "Nhấn OK để tải file."

                );


            if (
                shouldDownload
            ) {

                window.location.href =
                    downloadUrl;

            }


        } else {

            alert(

                "⏳ Đơn hàng chưa được xác nhận thanh toán.\n\n" +

                "Nếu bạn đã chuyển khoản, hãy thử kiểm tra lại sau."

            );

        }


    } catch (error) {

        console.error(
            error
        );


        alert(

            "❌ " +
            error.message

        );

    }

}


// ========================================
// XÓA 1 ĐƠN
// ========================================

function removeOrderHistory(
    orderCode
) {

    let history =
        getOrderHistory();


    history =

        history.filter(

            order =>

                order.orderCode !==
                orderCode

        );


    localStorage.setItem(

        "hainOrderHistory",

        JSON.stringify(
            history
        )

    );


    renderOrderHistory();

}


// ========================================
// XÓA TOÀN BỘ LỊCH SỬ
// ========================================

function clearOrderHistory() {

    const confirmDelete =

        confirm(

            "⚠️ Bạn có chắc muốn xóa toàn bộ lịch sử đơn hàng trên thiết bị này?"

        );


    if (!confirmDelete) {
        return;
    }


    localStorage.removeItem(

        "hainOrderHistory"

    );


    renderOrderHistory();

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(value)

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
// CLICK RA NGOÀI MODAL ĐỂ ĐÓNG
// ========================================

window.addEventListener(

    "click",

    function(event) {

        const paymentModal =
            document.getElementById(
                "paymentModal"
            );


        const historyModal =
            document.getElementById(
                "historyModal"
            );


        if (
            event.target ===
            paymentModal
        ) {

            closePayment();

        }


        if (
            event.target ===
            historyModal
        ) {

            closeOrderHistory();

        }

    }

);


// ========================================
// KHỞI ĐỘNG
// ========================================

document.addEventListener(

    "DOMContentLoaded",

    function() {

        loadProducts();

        updateCartCount();

    }

);
