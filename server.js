const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CẤU HÌNH
// ========================================

const ADMIN_PASSWORD = "kngan#1";

const PUBLIC_DIR = path.join(__dirname, "public");
const PRIVATE_DIR = path.join(__dirname, "private-files");
const DATA_DIR = path.join(__dirname, "data");

// ========================================
// TẠO THƯ MỤC
// ========================================

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ========================================
// DATABASE
// ========================================

const db = new Database(
    path.join(DATA_DIR, "shop.db")
);

console.log("✅ Database đã kết nối");

// ========================================
// BẢNG PRODUCTS
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

// ========================================
// BẢNG ORDERS
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

console.log("✅ Database sẵn sàng");

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

    destination: function(req, file, cb) {

        cb(
            null,
            PRIVATE_DIR
        );

    },

    filename: function(req, file, cb) {

        const safeName =
            file.originalname
                .replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );

        const filename =
            Date.now() +
            "-" +
            safeName;

        cb(
            null,
            filename
        );

    }

});

const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            500 *
            1024 *
            1024

    }

});

// ========================================
// ADMIN LOGIN
// ========================================

app.post(
    "/api/admin/login",
    function(req, res) {

        const password =
            req.body.password;

        if (
            password !==
            ADMIN_PASSWORD
        ) {

            return res
                .status(401)
                .json({

                    success: false,

                    error:
                        "Mật khẩu Admin không đúng"

                });

        }

        return res.json({

            success: true,

            message:
                "Đăng nhập thành công"

        });

    }
);

// ========================================
// LẤY SẢN PHẨM
// ========================================

app.get(
    "/api/products",
    function(req, res) {

        try {

            const products =
                db
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

            res.json(
                products
            );

        } catch(error) {

            console.error(
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Không thể lấy sản phẩm"

                });

        }

    }
);

// ========================================
// THÊM SẢN PHẨM
// ========================================

app.post(
    "/api/admin/products",
    upload.single("file"),
    function(req, res) {

        try {

            const password =
                req.body.password;

            if (
                password !==
                ADMIN_PASSWORD
            ) {

                if(req.file) {

                    fs.unlinkSync(
                        req.file.path
                    );

                }

                return res
                    .status(401)
                    .json({

                        success: false,

                        error:
                            "Mật khẩu Admin không đúng"

                    });

            }

            const name =
                req.body.name;

            const description =
                req.body.description ||
                "";

            const price =
                Number(
                    req.body.price
                );

            const category =
                req.body.category ||
                "Khác";

            if (
                !name ||
                !name.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Thiếu tên sản phẩm"

                    });

            }

            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Giá không hợp lệ"

                    });

            }

            if(!req.file) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Chưa chọn file"

                    });

            }

            const result =
                db
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

                        price,

                        category,

                        req.file.filename

                    );

            res.json({

                success: true,

                productId:
                    result.lastInsertRowid,

                message:
                    "Thêm sản phẩm thành công"

            });

        } catch(error) {

            console.error(
                error
            );

            if(
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );

            }

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// XÓA SẢN PHẨM + FILE
// ========================================

app.delete(
    "/api/admin/products/:id",
    function(req, res) {

        try {

            const password =
                req.headers[
                    "x-admin-password"
                ];

            if (
                password !==
                ADMIN_PASSWORD
            ) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        error:
                            "Mật khẩu Admin không đúng"

                    });

            }

            const id =
                Number(
                    req.params.id
                );

            const product =
                db
                    .prepare(`
                        SELECT *
                        FROM products
                        WHERE id = ?
                    `)
                    .get(id);

            if(!product) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Không tìm thấy sản phẩm"

                    });

            }

            const filePath =
                path.join(
                    PRIVATE_DIR,
                    path.basename(
                        product.file_name
                    )
                );

            if(
                fs.existsSync(
                    filePath
                )
            ) {

                fs.unlinkSync(
                    filePath
                );

            }

            db
                .prepare(`
                    DELETE FROM products
                    WHERE id = ?
                `)
                .run(id);

            res.json({

                success: true,

                message:
                    "Đã xóa sản phẩm và file"

            });

        } catch(error) {

            console.error(
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// TẠO ĐƠN HÀNG
// ========================================

app.post(
    "/api/orders",
    function(req, res) {

        try {

            const productId =
                Number(
                    req.body.productId
                );

            const customerName =
                req.body.customerName;

            const customerEmail =
                req.body.customerEmail ||
                "";

            if(
                !productId ||
                !customerName
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Thiếu thông tin"

                    });

            }

            const product =
                db
                    .prepare(`
                        SELECT *
                        FROM products
                        WHERE id = ?
                    `)
                    .get(
                        productId
                    );

            if(!product) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Không tìm thấy sản phẩm"

                    });

            }

            const orderCode =
                "HAIN" +
                Date.now();

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
                    (?, ?, ?, ?, ?, 'pending')
                `)
                .run(

                    orderCode,

                    customerName.trim(),

                    customerEmail.trim(),

                    product.id,

                    product.price

                );

            res.json({

                success: true,

                orderCode:

                    orderCode,

                amount:

                    product.price,

                productName:

                    product.name

            });

        } catch(error) {

            console.error(
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// ADMIN - LẤY TẤT CẢ ĐƠN
// ========================================

app.get(
    "/api/admin/orders",
    function(req, res) {

        try {

            const password =
                req.headers[
                    "x-admin-password"
                ];

            if (
                password !==
                ADMIN_PASSWORD
            ) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        error:
                            "Không có quyền Admin"

                    });

            }

            const orders =
                db
                    .prepare(`
                        SELECT
                            orders.id,
                            orders.order_code,
                            orders.customer_name,
                            orders.customer_email,
                            orders.product_id,
                            orders.amount,
                            orders.status,
                            orders.created_at,
                            products.name
                                AS product_name
                        FROM orders
                        LEFT JOIN products
                        ON products.id =
                           orders.product_id
                        ORDER BY
                            orders.id DESC
                    `)
                    .all();

            res.json(
                orders
            );

        } catch(error) {

            console.error(
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// ADMIN - DUYỆT ĐƠN
// ========================================

app.post(
    "/api/admin/orders/:code/approve",
    function(req, res) {

        try {

            const password =
                req.headers[
                    "x-admin-password"
                ];

            if (
                password !==
                ADMIN_PASSWORD
            ) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        error:
                            "Không có quyền Admin"

                    });

            }

            const orderCode =
                req.params.code;

            const order =
                db
                    .prepare(`
                        SELECT *
                        FROM orders
                        WHERE order_code = ?
                    `)
                    .get(
                        orderCode
                    );

            if(!order) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Không tìm thấy đơn"

                    });

            }

            db
                .prepare(`
                    UPDATE orders
                    SET status = 'paid'
                    WHERE order_code = ?
                `)
                .run(
                    orderCode
                );

            console.log(
                "✅ ĐÃ DUYỆT:",
                orderCode
            );

            res.json({

                success: true,

                message:
                    "Đã duyệt thanh toán"

            });

        } catch(error) {

            console.error(
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// ADMIN - HỦY ĐƠN
// ========================================

app.post(
    "/api/admin/orders/:code/cancel",
    function(req, res) {

        try {

            const password =
                req.headers[
                    "x-admin-password"
                ];

            if (
                password !==
                ADMIN_PASSWORD
            ) {

                return res
                    .status(401)
                    .json({

                        success: false,

                        error:
                            "Không có quyền Admin"

                    });

            }

            const orderCode =
                req.params.code;

            db
                .prepare(`
                    UPDATE orders
                    SET status = 'cancelled'
                    WHERE order_code = ?
                `)
                .run(
                    orderCode
                );

            res.json({

                success: true,

                message:
                    "Đã hủy đơn"

            });

        } catch(error) {

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// KIỂM TRA ĐƠN
// ========================================

app.get(
    "/api/orders/:code/status",
    function(req, res) {

        try {

            const order =
                db
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

            if(!order) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Không tìm thấy đơn hàng"

                    });

            }

            res.json({

                success: true,

                orderCode:
                    order.order_code,

                amount:
                    order.amount,

                status:
                    order.status

            });

        } catch(error) {

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message

                });

        }

    }
);

// ========================================
// DOWNLOAD FILE
// ========================================

app.get(
    "/api/orders/:code/download",
    function(req, res) {

        try {

            const order =
                db
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

            if(!order) {

                return res
                    .status(404)
                    .send(
                        "Không tìm thấy đơn hàng"
                    );

            }

            if(
                order.status !==
                "paid"
            ) {

                return res
                    .status(403)
                    .send(
                        "Đơn hàng chưa được duyệt"
                    );

            }

            const filePath =
                path.join(
                    PRIVATE_DIR,
                    path.basename(
                        order.file_name
                    )
                );

            if(
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

        } catch(error) {

            console.error(
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
// STATIC PUBLIC
// ========================================

app.use(
    express.static(
        PUBLIC_DIR
    )
);

// ========================================
// API 404
// ========================================

app.use(
    "/api",
    function(req, res) {

        res
            .status(404)
            .json({

                success: false,

                error:
                    "API không tồn tại"

            });

    }
);

// ========================================
// START SERVER
// ========================================

app.listen(
    PORT,
    function() {

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
            "🔐 Password: kngan#1"
        );

        console.log(
            "📦 Upload tối đa: 500MB"
        );

        console.log(
            "================================"
        );

    }
);
