const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();
app.use((req, res, next) => {
    console.log("📡 REQUEST:", req.method, req.url);
    next();
});
const PORT = process.env.PORT || 3000;

// ========================================
// ĐƯỜNG DẪN
// ========================================

const PUBLIC_DIR = path.join(__dirname, "public");
const PRIVATE_DIR = path.join(__dirname, "private-files");
const DATA_DIR = path.join(__dirname, "data");

// ========================================
// TẠO THƯ MỤC
// ========================================

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

console.log("📁 PUBLIC:", PUBLIC_DIR);
console.log("📁 PRIVATE:", PRIVATE_DIR);
console.log("📁 DATA:", DATA_DIR);

// ========================================
// DATABASE
// ========================================

const db = new Database(
    path.join(DATA_DIR, "shop.db")
);

console.log("✅ Database đã kết nối");

// ========================================
// TẠO BẢNG SẢN PHẨM
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        description TEXT DEFAULT '',

        price INTEGER NOT NULL,

        category TEXT DEFAULT 'Khác',

        file_name TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`);

console.log("✅ Bảng products OK");

// ========================================
// TẠO BẢNG ĐƠN HÀNG
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        order_code TEXT UNIQUE NOT NULL,

        customer_name TEXT NOT NULL,

        customer_email TEXT DEFAULT '',

        product_id INTEGER NOT NULL,

        amount INTEGER NOT NULL,

        status TEXT DEFAULT 'pending',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`);

console.log("✅ Bảng orders OK");

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ========================================
// UPLOAD FILE
// ========================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            PRIVATE_DIR
        );

    },

    filename: (req, file, cb) => {

        const safeName =

            Date.now() +

            "-" +

            file.originalname.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

        cb(
            null,
            safeName
        );

    }

});

const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            500 * 1024 * 1024

    }

});

// ========================================
// API: LẤY DANH SÁCH SẢN PHẨM
// ========================================

app.get(
    "/api/products",

    (req, res) => {

        try {

            const products = db
                .prepare(`
                    SELECT
                        id,
                        name,
                        description,
                        price,
                        category
                    FROM products
                    ORDER BY id DESC
                `)
                .all();

            res.status(200).json(
                products
            );

        } catch (error) {

            console.error(
                "❌ LỖI LẤY SẢN PHẨM:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ========================================
// API: ADMIN THÊM SẢN PHẨM
// ========================================

app.post(

    "/api/admin/products",

    upload.single("file"),

    (req, res) => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "🔥 API THÊM SẢN PHẨM ĐƯỢC GỌI"
        );

        console.log(
            "BODY:",
            req.body
        );

        console.log(
            "FILE:",
            req.file
        );

        console.log(
            "================================"
        );


        try {

            const {

                name,

                description,

                price,

                category

            } = req.body;


            // KIỂM TRA TÊN

            if (!name) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Thiếu tên sản phẩm"

                });

            }


            // KIỂM TRA GIÁ

            if (
                price === undefined ||
                price === null ||
                price === ""
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Thiếu giá sản phẩm"

                });

            }


            // KIỂM TRA FILE

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Chưa chọn file sản phẩm"

                });

            }


            // CHUYỂN GIÁ SANG NUMBER

            const productPrice =
                Number(price);


            if (
                !Number.isFinite(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Giá sản phẩm không hợp lệ"

                });

            }


            // THÊM VÀO DATABASE

            const result = db
                .prepare(`
                    INSERT INTO products
                    (
                        name,
                        description,
                        price,
                        category,
                        file_name
                    )
                    VALUES
                    (?, ?, ?, ?, ?)
                `)
                .run(

                    name.trim(),

                    description || "",

                    productPrice,

                    category || "Khác",

                    req.file.filename

                );


            console.log(
                "✅ THÊM SẢN PHẨM THÀNH CÔNG"
            );

            console.log(
                "ID:",
                result.lastInsertRowid
            );

            console.log(
                "FILE:",
                req.file.filename
            );


            return res.status(200).json({

                success: true,

                productId:
                    result.lastInsertRowid,

                message:
                    "Thêm sản phẩm thành công"

            });


        } catch (error) {

            console.error("");

            console.error(
                "❌❌❌ LỖI THÊM SẢN PHẨM ❌❌❌"
            );

            console.error(
                error
            );

            console.error(
                "MESSAGE:",
                error.message
            );

            console.error(
                "STACK:",
                error.stack
            );


            return res.status(500).json({

                success: false,

                error:
                    error.message ||

                    "Không thể thêm sản phẩm"

            });

        }

    }

);

// ========================================
// API: TẠO ĐƠN HÀNG
// ========================================

app.post(

    "/api/orders",

    (req, res) => {

        try {

            console.log(
                "📦 Nhận yêu cầu tạo đơn:",
                req.body
            );


            const {

                productId,

                customerName,

                customerEmail

            } = req.body;


            if (
                !productId ||
                !customerName
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Thiếu mã sản phẩm hoặc tên khách hàng"

                });

            }


            const product = db
                .prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                `)
                .get(
                    Number(productId)
                );


            if (!product) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Không tìm thấy sản phẩm"

                });

            }


            // TẠO MÃ ĐƠN

            const orderCode =

                "HAIN" +

                Date.now();


            // LƯU ĐƠN

            db
                .prepare(`
                    INSERT INTO orders
                    (
                        order_code,
                        customer_name,
                        customer_email,
                        product_id,
                        amount,
                        status
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?)
                `)
                .run(

                    orderCode,

                    customerName,

                    customerEmail || "",

                    product.id,

                    product.price,

                    "pending"

                );


            console.log(
                "✅ TẠO ĐƠN THÀNH CÔNG:",
                orderCode
            );


            res.status(200).json({

                success: true,

                orderCode:

                    orderCode,

                amount:

                    product.price,

                productName:

                    product.name

            });


        } catch (error) {

            console.error(

                "❌ LỖI TẠO ĐƠN:",

                error

            );


            res.status(500).json({

                success: false,

                error:

                    error.message ||

                    "Lỗi server khi tạo đơn hàng"

            });

        }

    }

);

// ========================================
// API: KIỂM TRA ĐƠN HÀNG
// ========================================

app.get(

    "/api/orders/:code/status",

    (req, res) => {

        try {

            const order = db
                .prepare(`
                    SELECT
                        order_code,
                        amount,
                        status
                    FROM orders
                    WHERE order_code = ?
                `)
                .get(
                    req.params.code
                );


            if (!order) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Không tìm thấy đơn hàng"

                });

            }


            res.status(200).json({

                orderCode:

                    order.order_code,

                amount:

                    order.amount,

                status:

                    order.status

            });


        } catch (error) {

            console.error(

                "❌ LỖI KIỂM TRA ĐƠN:",

                error

            );


            res.status(500).json({

                success: false,

                error:

                    error.message ||

                    "Lỗi server"

            });

        }

    }

);

// ========================================
// API: DOWNLOAD FILE
// ========================================

app.get(

    "/api/orders/:code/download",

    (req, res) => {

        try {

            const order = db
                .prepare(`
                    SELECT
                        orders.status,
                        products.file_name
                    FROM orders
                    JOIN products
                    ON products.id =
                       orders.product_id
                    WHERE orders.order_code = ?
                `)
                .get(
                    req.params.code
                );


            if (!order) {

                return res
                    .status(404)
                    .send(
                        "Không tìm thấy đơn hàng"
                    );

            }


            if (
                order.status !== "paid"
            ) {

                return res
                    .status(403)
                    .send(
                        "Đơn hàng chưa thanh toán"
                    );

            }


            const filePath = path.join(

                PRIVATE_DIR,

                order.file_name

            );


            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res
                    .status(404)
                    .send(
                        "File không tồn tại"
                    );

            }


            res.download(

                filePath

            );


        } catch (error) {

            console.error(

                "❌ LỖI DOWNLOAD:",

                error

            );


            res
                .status(500)
                .send(
                    "Lỗi server"
                );

        }

    }

);

// ========================================
// API: WEBHOOK THANH TOÁN
// ========================================

app.post(

    "/api/payment/webhook",

    (req, res) => {

        try {

            const {

                orderCode,

                status

            } = req.body;


            if (
                !orderCode ||
                status !== "paid"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Webhook không hợp lệ"

                });

            }


            const result = db
                .prepare(`
                    UPDATE orders
                    SET status = 'paid'
                    WHERE order_code = ?
                `)
                .run(

                    orderCode

                );


            if (
                result.changes === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Không tìm thấy đơn hàng"

                });

            }


            console.log(

                "💰 ĐƠN ĐÃ THANH TOÁN:",

                orderCode

            );


            res.status(200).json({

                success: true

            });


        } catch (error) {

            console.error(

                "❌ LỖI WEBHOOK:",

                error

            );


            res.status(500).json({

                success: false,

                error:

                    error.message ||

                    "Lỗi server"

            });

        }

    }

);

// ========================================
// STATIC FILE
// ========================================

app.use(

    express.static(

        PUBLIC_DIR

    )

);

// ========================================
// API KHÔNG TỒN TẠI
// ========================================

app.use(

    "/api",

    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "API không tồn tại"

        });

    }

);

// ========================================
// XỬ LÝ LỖI MULTER + SERVER
// ========================================

app.use(

    (err, req, res, next) => {

        console.error("");

        console.error(
            "❌ SERVER ERROR:"
        );

        console.error(
            err
        );


        if (
            err.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "File quá lớn! Tối đa 500MB"

            });

        }


        if (
            req.path.startsWith(
                "/api"
            )
        ) {

            return res.status(500).json({

                success: false,

                error:

                    err.message ||

                    "Lỗi server"

            });

        }


        res
            .status(500)
            .send(
                "Lỗi server"
            );

    }

);

// ========================================
// START SERVER
// ========================================

app.listen(

    PORT,

    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "       HAIN FILE SHOP"
        );

        console.log(
            "================================"
        );

        console.log(
            "🌐 Shop: http://localhost:" +
            PORT
        );

        console.log(
            "🔧 Admin: http://localhost:" +
            PORT +
            "/admin.html"
        );

        console.log(
            "📦 Upload tối đa: 500MB"
        );

        console.log(
            "================================"
        );

    }

);