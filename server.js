const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000; // ✅ استخدام المنفذ الصحيح من Railway

// ✅ تصحيح عنوان Syriatel (إزالة http:// المكرر)
const PHONES = {
    "MTN": "http://192.168.178.21:3000/send-ussd",
    "Syriatel": "http://192.168.178.21:3000/send-ussd"
};

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("✅ API يعمل على Railway!");
});

// ✅ التأكد من تشغيل `app.listen()` مرة واحدة فقط
if (!module.parent) {
    app.listen(PORT, () => {
        console.log(`✅ API يعمل على المنفذ: ${PORT}`);
    });
}

// ✅ استبدال `sendUSSD()` بإعادة توجيه الطلب للهاتف
app.post("/send-ussd", async (req, res) => {
    try {
        console.log("📡 البيانات المستلمة من العميل:", req.body);
        const { phone_number, amount, network } = req.body;

        if (!phone_number || !amount || !network) {
            return res.status(400).json({ success: false, message: "❌ جميع البيانات مطلوبة!" });
        }

        if (!PHONES[network]) {
            return res.status(400).json({ success: false, message: "❌ الشبكة غير مدعومة!" });
        }

        const phoneApiUrl = PHONES[network];

        console.log(`📡 إعادة توجيه الطلب إلى الهاتف: ${phoneApiUrl}`);

        const response = await axios.post(phoneApiUrl, { phone_number, amount, network });

        res.json(response.data);
    } catch (error) {
        console.error("🚨 خطأ داخلي في الخادم:", error.message);
        res.status(500).json({ success: false, message: "❌ خطأ داخلي في الخادم!" });
    }
});

// ✅ API لاسترجاع السجلات
app.get("/logs", (req, res) => {
    try {
        if (fs.existsSync("logs.json")) {
            const logs = fs.readFileSync("logs.json", "utf8");
            return res.json(JSON.parse(logs));
        }
        res.json([]);
    } catch (error) {
        console.error("🚨 خطأ في جلب السجلات:", error);
        res.status(500).json({ success: false, message: "❌ خطأ في جلب السجلات!" });
    }
});
