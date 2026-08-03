const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = "kngan#1";

const PUBLIC_DIR = path.join(__dirname, "public");
const PRIVATE_DIR = path.join(__dirname, "private-files");
const DATA_DIR = path.join(__dirname, "data");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

console.log("📁 PUBLIC:", PUBLIC_DIR);
console.log("📁 PRIVATE:", PRIVATE_DIR);
console.log("📁 DATA:", DATA_DIR);

const db = new Database(
    path.join(DATA_DIR, "shop.db")
);

console.log("✅ Database đã kết nối");

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

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, PRIVATE_DIR);
    },

    filename: function (req, file, cb) {
        const safeName =
            Date.now() +
            "-" +
            file.originalname.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

        cb(null, safeName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

app.post(
    "/api/admin/login",
    function (req, res) {
        try {
            const password = req.body.password;

            if (password !== ADMIN_PASSWORD) {
                return res.status(401).json({
                    success: false,
                    error: "Mật khẩu Admin không đúng"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Đăng nhập Admin thành công"
            });

        } catch (error) {
            console.error(
                "❌ LỖI ADMIN LOGIN:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Lỗi server"
            });
        }
    }
);

app.get(
    "/api/products",
    function (req, res) {
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

            return res.status(200).json(products);

        } catch (error) {
            console.error(
                "❌ LỖI LẤY SẢN PHẨM:",
                error
            );

            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

app.post(
    "/api/admin/products",
    upload.single("file"),
    function (req, res) {
        try {
            const name = req.body.name;
            const description = req.body.description || "";
            const price = req.body.price;
            const category = req.body.category || "Khác";
            const password = req.body.password;

            console.log("📦 Thêm sản phẩm:");
            console.log("Tên:", name);
            console.log("Giá:", price);
            console.log("Danh mục:", category);
            console.log("File:", req.file);

            if (password !== ADMIN_PASSWORD) {
                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(401).json({
                    success: false,
                    error: "Mật khẩu Admin không đúng"
                });
            }

            if (!name || !name.trim()) {
                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    success: false,
                    error: "Thiếu tên sản phẩm"
                });
            }

            if (
                price === undefined ||
                price === null ||
                price === ""
            ) {
                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    success: false,
                    error: "Thiếu giá sản phẩm"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "Chưa chọn file sản phẩm"
                });
            }

            const productPrice = Number(price);

            if (
                !Number.isFinite(productPrice) ||
                productPrice < 0
            ) {
                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    success: false,
                    error: "Giá sản phẩm không hợp lệ"
                });
            }

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
                    description,
                    productPrice,
                    category,
                    req.file.filename
                );

            console.log(
                "✅ THÊM SẢN PHẨM THÀNH CÔNG"
            );

            console.log(
                "ID:",
                result.lastInsertRowid
            );

            return res.status(200).json({
                success: true,
                productId: result.lastInsertRowid,
                message: "Thêm sản phẩm thành công"
            });

        } catch (error) {
            console.error(
                "❌ LỖI THÊM SẢN PHẨM:",
                error
            );

            if (
                req.file &&
                fs.existsSync(req.file.path)
            ) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (deleteError) {
                    console.error(
                        "❌ Không thể xóa file:",
                        deleteError
                    );
                }
            }

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Không thể thêm sản phẩm"
            });
        }
    }
);

app.post(
    "/api/orders",
    function (req, res) {
        try {
            const productId = req.body.productId;
            const customerName = req.body.customerName;
            const customerEmail =
                req.body.customerEmail || "";

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
                .get(Number(productId));

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Không tìm thấy sản phẩm"
                });
            }

            const orderCode =
                "HAIN" + Date.now();

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
                    customerEmail,
                    product.id,
                    product.price,
                    "pending"
                );

            console.log(
                "✅ TẠO ĐƠN THÀNH CÔNG:",
                orderCode
            );

            return res.status(200).json({
                success: true,
                orderCode: orderCode,
                amount: product.price,
                productName: product.name
            });

        } catch (error) {
            console.error(
                "❌ LỖI TẠO ĐƠN:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Lỗi server khi tạo đơn hàng"
            });
        }
    }
);

app.get(
    "/api/orders/:code/status",
    function (req, res) {
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
                .get(req.params.code);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Không tìm thấy đơn hàng"
                });
            }

            return res.status(200).json({
                orderCode: order.order_code,
                amount: order.amount,
                status: order.status
            });

        } catch (error) {
            console.error(
                "❌ LỖI KIỂM TRA ĐƠN:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Lỗi server"
            });
        }
    }
);

app.get(
    "/api/orders/:code/download",
    function (req, res) {
        try {
            const order = db
                .prepare(`
                    SELECT
                        orders.status,
                        products.file_name
                    FROM orders
                    JOIN products
                    ON products.id = orders.product_id
                    WHERE orders.order_code = ?
                `)
                .get(req.params.code);

            if (!order) {
                return res
                    .status(404)
                    .send(
                        "Không tìm thấy đơn hàng"
                    );
            }

            if (order.status !== "paid") {
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

            if (!fs.existsSync(filePath)) {
                return res
                    .status(404)
                    .send(
                        "File không tồn tại"
                    );
            }

            return res.download(filePath);

        } catch (error) {
            console.error(
                "❌ LỖI DOWNLOAD:",
                error
            );

            return res
                .status(500)
                .send(
                    "Lỗi server"
                );
        }
    }
);

app.post(
    "/api/payment/webhook",
    function (req, res) {
        try {
            const orderCode =
                req.body.orderCode;

            const status =
                req.body.status;

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
                .run(orderCode);

            if (result.changes === 0) {
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

            return res.status(200).json({
                success: true
            });

        } catch (error) {
            console.error(
                "❌ LỖI WEBHOOK:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Lỗi server"
            });
        }
    }
);

app.use(
    express.static(PUBLIC_DIR)
);

app.use(
    "/api",
    function (req, res) {
        return res.status(404).json({
            success: false,
            error: "API không tồn tại"
        });
    }
);

app.use(
    function (err, req, res, next) {
        console.error(
            "❌ SERVER ERROR:",
            err
        );

        if (
            err.code === "LIMIT_FILE_SIZE"
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "File quá lớn! Tối đa 500MB"
            });
        }

        if (
            req.path.startsWith("/api")
        ) {
            return res.status(500).json({
                success: false,
                error:
                    err.message ||
                    "Lỗi server"
            });
        }

        return res
            .status(500)
            .send("Lỗi server");
    }
);

app.listen(
    PORT,
    function () {
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
            "🔐 Admin Password: Đã bật"
        );
        console.log(
            "📦 Upload tối đa: 500MB"
        );
        console.log(
            "================================"
        );
    }
);
