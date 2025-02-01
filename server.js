const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000; // ✅ جعل `PORT` ديناميكيًا ليعمل على Railway

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("✅ API يعمل على Railway!");
});

// تشغيل API
app.listen(PORT, () => {
    console.log(`✅ API يعمل على المنفذ: ${PORT}`);
});

// أكواد USSD لكل شبكة
const USSD_CODES = {
    "MTN": "*123*{PHONE}*{AMOUNT}#",
    "Syriatel": "*456*{PHONE}*{AMOUNT}#"
};

const LOG_FILE = "logs.json";

// دالة لحفظ السجلات
function saveLog(logData) {
    let logs = [];

    try {
        if (fs.existsSync(LOG_FILE)) {
            const data = fs.readFileSync(LOG_FILE, "utf8");
            logs = JSON.parse(data);
        }

        logs.unshift(logData);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error("🚨 خطأ في حفظ السجلات:", error);
    }
}

// تنفيذ كود USSD عبر ADB
function sendUSSD(ussdCode) {
    return new Promise((resolve, reject) => {
        if (!ussdCode) {
            return reject("❌ كود USSD غير صالح!");
        }

        let command = `adb shell am start -a android.intent.action.CALL -d tel:${encodeURIComponent(ussdCode)}`;

        console.log(`📡 تنفيذ كود USSD: ${ussdCode}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("🚨 خطأ في تنفيذ ADB:", stderr);
                return reject(`❌ خطأ في ADB: ${stderr}`);
            }
            console.log("✅ تم تنفيذ كود USSD بنجاح:", stdout);
            resolve("✅ تم إرسال كود USSD بنجاح!");
        });
    });
}

// API لتنفيذ USSD وتسجيل العملية
app.post("/send-ussd", async (req, res) => {
    try {
        console.log("📡 البيانات المستلمة من العميل:", req.body);

        const { phone_number, amount, network } = req.body;
        const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        if (!phone_number || !amount || !network) {
            return res.status(400).json({ success: false, message: "❌ جميع البيانات مطلوبة!" });
        }

        if (!USSD_CODES[network]) {
            return res.status(400).json({ success: false, message: "❌ الشبكة غير مدعومة!" });
        }

        // إنشاء كود USSD تلقائيًا
        let ussdCode = USSD_CODES[network]
            .replace("{PHONE}", phone_number.trim())
            .replace("{AMOUNT}", amount.trim());

        console.log(`📡 إرسال USSD عبر ${network}: ${ussdCode} - من IP: ${ip}`);

        const response = await sendUSSD(ussdCode);

        // تسجيل العملية
        const logData = {
            phone_number,
            amount,
            network,
            ussd_code: ussdCode,  // ✅ الآن `ussd_code` معرف بشكل صحيح
            ip,
            date: new Date().toLocaleString()
        };

        saveLog(logData);

        console.log("✅ سجل العملية:", logData);

        res.json({ success: true, message: response });
    } catch (error) {
        console.error("🚨 خطأ داخلي في الخادم:", error);
        res.status(500).json({ success: false, message: `❌ خطأ داخلي في الخادم! ${error.message}` });
    }
});

// API لاسترجاع السجلات
app.get("/logs", (req, res) => {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const logs = fs.readFileSync(LOG_FILE, "utf8");
            return res.json(JSON.parse(logs));
        }
        res.json([]);
    } catch (error) {
        console.error("🚨 خطأ في جلب السجلات:", error);
        res.status(500).json({ success: false, message: "❌ خطأ في جلب السجلات!" });
    }
});

/* تشغيل API
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ API يعمل على: http://0.0.0.0:${PORT}`);
});*/

// ✅ تشغيل API مرة واحدة فقط باستخدام `process.env.PORT`
app.listen(PORT, () => {
    console.log(`✅ API يعمل على المنفذ: ${PORT}`);
});
