
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// Firebase : setting
const firebaseConfig = {
  apiKey: "AIzaSyBOqETnt1C8qhZ1YRYSotDxYjJeZEioTIM",
  authDomain: "petfeeder-promax-749f9.firebaseapp.com",
  databaseURL: "https://petfeeder-promax-749f9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "petfeeder-promax-749f9",
  storageBucket: "petfeeder-promax-749f9.firebasestorage.app",
  messagingSenderId: "47994252501",
  appId: "1:47994252501:web:80c545a11a7abe0d4d065c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

//-------MQTT--------

const FEED_TIMEOUT = 10000;

const host = "0b6280fa49a549c58dab95e2bb422274.s1.eu.hivemq.cloud";
const broker = `wss://${host}:8884/mqtt`;
const options = {
    username: "petfeederpromax",
    password: "Password12345",
    clientId: "web-" + Math.random().toString(16).substr(2, 8)
};

const PUBLISH_TOPIC = "petfeeder/cmd";
const SUBSCRIBE_TOPIC = "petfeeder/status";

const client = mqtt.connect(broker, options);

const feedBtn = document.getElementById("feedBtn");
const statusEl = document.getElementById("status");

let feed_timer = null;

// ถ้ามีตัวจับเวลาตั้งไว้ก่อนหน้า ให้ clear ก่อน
function clearFeedTimer() {
    if (feed_timer) {
        clearTimeout(feed_timer);
        feed_timer = null;
    }
}

client.on("connect", () => {
    console.log("Connected to HiveMQ");
    statusEl.textContent = "🟢 Connected";
    client.subscribe(SUBSCRIBE_TOPIC);
    feedBtn.disabled = false;
});

client.on("error", (err) => {
    console.error("MQTT Error:", err);
    statusEl.textContent = "🔴 Connection Error";
    feedBtn.disabled = true;
    clearFeedTimer();
});

client.on("message", (topic, message) => {
    if (topic !== SUBSCRIBE_TOPIC) return;

    const msg = message.toString();
    statusEl.textContent = msg;

    feedBtn.disabled = false;
    clearFeedTimer();

    // Firebase : ส่งไป Firebase db -------
     push(ref(db, "logs/petfeeder/status"), {
    message: msg,
    ts: serverTimestamp()
    //----------------------------
  });
});


feedBtn.addEventListener("click", () => {
    feedBtn.disabled = true;
    
    clearFeedTimer();

    // ถ้าบอร์ดไม่ตอบกลับภายในเวลา จะปลดล็อกปุ่ม
    feed_timer = setTimeout(() => {
        console.warn("Feeding timeout");
        feedBtn.disabled = false;
        feed_timer = null;
        statusEl.textContent = "No status from board";
    }, FEED_TIMEOUT);

    // ส่งคำสั่งไปบอร์ด
    client.publish(PUBLISH_TOPIC, "feed");
    statusEl.textContent = "Feeding...";

    // Firebase : ส่งไป db Firebase--------
    push(ref(db, "logs/petfeeder/feed"), {
    event: "feed",
    ts: serverTimestamp()
    //----------------------------

  });
});