const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "kngan#1";

const PUBLIC_DIR =
    path.join(__dirname, "public");

const PRIVATE_DIR =
    path.join(__dirname, "private-files");

const DATA_DIR =
    path.join(__dirname, "data");


// ========================================
// TẠO THƯ MỤC
// ========================================

fs.mkdirSync(
    PUBLIC_DIR,
    { recursive: true }
);

fs.mkdirSync(
    PRIVATE_DIR,
    { recursive: true }
);

fs.mkdirSync(
    DATA_DIR,
    { recursive: true }
);


// ========================================
// DATABASE
// ========================================

const db = new Database(
    path.join(
        DATA_DIR,
        "shop.db"
    )
);

console.log(
    "✅ Database đã kết nối"
);


// ========================================
// TẠO BẢNG SẢN PHẨM
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (

        id
        INTEGER
        PRIMARY KEY
        AUTOINCREMENT,

        name
        TEXT
        NOT NULL,

        description
        TEXT
        DEFAULT '',

        price
        INTEGER
        NOT NULL,

        category
        TEXT
        DEFAULT 'Khác',

        file_name
        TEXT
        NOT NULL,

        created_at
        DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`);


// ========================================
// TẠO BẢNG ĐƠN HÀNG
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (

        id
        INTEGER
        PRIMARY KEY
        AUTOINCREMENT,

        order_code
        TEXT
        UNIQUE
        NOT NULL,

        customer_name
        TEXT
        NOT NULL,

        customer_email
        TEXT
        DEFAULT '',

        product_id
        INTEGER
        NOT NULL,

        amount
        INTEGER
        NOT NULL,

        status
        TEXT
        DEFAULT 'pending',

        created_at
        DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`);

console.log(
    "✅ Database OK"
);


// ========================================
// MIDDLEWARE
// ========================================

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ========================================
// UPLOAD FILE
// ========================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    PRIVATE_DIR
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const safeName =

                    Date.now() +

                    "-" +

                    file.originalname
                        .replace(
                            /[^a-zA-Z0-9._-]/g,
                            "_"
                        );


                cb(
                    null,
                    safeName
                );

            }

    });


const upload =
    multer({

        storage:

            storage,

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
    function (
        req,
        res
    ) {

        try {

            const password =
                req.body.password;


            if (
                password !==
                ADMIN_PASSWORD
            ) {

                return res
                    .status(401)
                    .json({

                        success:
                            false,

                        error:
                            "Mật khẩu Admin không đúng"

                    });

            }


            return res.json({

                success:
                    true

            });


        } catch (error) {

            console.error(
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Lỗi server"

                });

        }

    }
);


// ========================================
// LẤY DANH SÁCH SẢN PHẨM
// ========================================

app.get(
    "/api/products",
    function (
        req,
        res
    ) {

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


            return res.json(
                products
            );


        } catch (error) {

            console.error(
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Không thể tải sản phẩm"

                });

        }

    }
);


// ========================================
// ADMIN THÊM SẢN PHẨM
// ========================================

app.post(
    "/api/admin/products",
    upload.single("file"),
    function (
        req,
        res
    ) {

        try {

            const password =
                req.body.password;


            if (
                password !==
                ADMIN_PASSWORD
            ) {

                if (
                    req.file
                ) {

                    fs.unlinkSync(
                        req.file.path
                    );

                }


                return res
                    .status(401)
                    .json({

                        success:
                            false,

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

                        success:
                            false,

                        error:
                            "Thiếu tên sản phẩm"

                    });

            }


            if (
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Giá sản phẩm không hợp lệ"

                    });

            }


            if (
                !req.file
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Chưa chọn file sản phẩm"

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


            return res.json({

                success:
                    true,

                productId:
                    result.lastInsertRowid,

                message:
                    "Thêm sản phẩm thành công"

            });


        } catch (error) {

            console.error(
                error
            );


            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );

            }


            return res
                .status(500)
                .json({

                    success:
                        false,

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
    function (
        req,
        res
    ) {

        try {

            const productId =
                Number(
                    req.body.productId
                );


            const customerName =
                String(
                    req.body.customerName ||
                    ""
                ).trim();


            const customerEmail =
                String(
                    req.body.customerEmail ||
                    ""
                ).trim();


            if (
                !productId ||
                !customerName
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Thiếu thông tin đơn hàng"

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


            if (
                !product
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

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

                    customerName,

                    customerEmail,

                    product.id,

                    product.price

                );


            console.log(
                "🧾 Tạo đơn:",
                orderCode
            );


            return res.json({

                success:
                    true,

                orderCode:
                    orderCode,

                amount:
                    product.price,

                productName:
                    product.name

            });


        } catch (error) {

            console.error(
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Không thể tạo đơn"

                });

        }

    }
);


// ========================================
// KIỂM TRA TRẠNG THÁI ĐƠN
// ========================================

app.get(
    "/api/orders/:code/status",
    function (
        req,
        res
    ) {

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


            if (
                !order
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        error:
                            "Không tìm thấy đơn hàng"

                    });

            }


            return res.json({

                success:
                    true,

                orderCode:
                    order.order_code,

                amount:
                    order.amount,

                status:
                    order.status

            });


        } catch (error) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Lỗi server"

                });

        }

    }
);


// ========================================
// ADMIN - XEM ĐƠN
// ========================================

app.get(
    "/api/admin/orders",
    function (
        req,
        res
    ) {

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

                        success:
                            false,

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
                            orders.amount,
                            orders.status,
                            orders.created_at,
                            products.name
                            AS product_name
                        FROM orders
                        JOIN products
                        ON products.id =
                            orders.product_id
                        ORDER BY
                            orders.id DESC
                    `)
                    .all();


            return res.json({

                success:
                    true,

                orders:
                    orders

            });


        } catch (error) {

            console.error(
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Không thể tải đơn hàng"

                });

        }

    }
);


// ========================================
// ADMIN - XÁC NHẬN ĐÃ NHẬN TIỀN
// ========================================

app.post(
    "/api/admin/orders/:code/paid",
    function (
        req,
        res
    ) {

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

                        success:
                            false,

                        error:
                            "Không có quyền Admin"

                    });

            }


            const code =
                req.params.code;


            const order =

                db
                    .prepare(`
                        SELECT *
                        FROM orders
                        WHERE order_code = ?
                    `)
                    .get(
                        code
                    );


            if (
                !order
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        error:
                            "Không tìm thấy đơn hàng"

                    });

            }


            db
                .prepare(`
                    UPDATE orders
                    SET status = 'paid'
                    WHERE order_code = ?
                `)
                .run(
                    code
                );


            console.log(
                "💰 Đã xác nhận:",
                code
            );


            return res.json({

                success:
                    true,

                message:
                    "Đã xác nhận thanh toán"

            });


        } catch (error) {

            console.error(
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Không thể xác nhận thanh toán"

                });

        }

    }
);


// ========================================
// DOWNLOAD FILE
// ========================================

app.get(
    "/api/orders/:code/download",
    function (
        req,
        res
    ) {

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


            if (
                !order
            ) {

                return res
                    .status(404)
                    .send(
                        "Không tìm thấy đơn hàng"
                    );

            }


            if (
                order.status !==
                "paid"
            ) {

                return res
                    .status(403)
                    .send(
                        "Đơn hàng chưa được xác nhận thanh toán"
                    );

            }


            const filePath =

                path.join(
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


            return res.download(
                filePath
            );


        } catch (error) {

            console.error(
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


// ========================================
// STATIC WEBSITE
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
    function (
        req,
        res
    ) {

        return res
            .status(404)
            .json({

                success:
                    false,

                error:
                    "API không tồn tại"

            });

    }
);


// ========================================
// ERROR
// ========================================

app.use(
    function (
        err,
        req,
        res,
        next
    ) {

        console.error(
            "SERVER ERROR:",
            err
        );


        if (
            err.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    error:
                        "File tối đa 500MB"

                });

        }


        if (
            req.path.startsWith(
                "/api"
            )
        ) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
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
            "🌐 Shop:"
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log("");

        console.log(
            "🔧 Admin:"
        );

        console.log(
            "http://localhost:" +
            PORT +
            "/admin.html"
        );

        console.log("");

        console.log(
            "💳 Thanh toán:"
        );

        console.log(
            "QR ZaloPay thủ công"
        );

        console.log(
            "================================"
        );

    }
);
