import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
    import { getDatabase, ref, push, serverTimestamp, set } 
      from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

    const firebaseConfig = {
      apiKey: "AIzaSyBOqETnt1C8qhZ1YRYSotDxYjJeZEioTIM",
      authDomain: "petfeeder-promax-749f9.firebaseapp.com",
      databaseURL: "https://petfeeder-promax-749f9-default-rtdb.asia-southeast1.firebasedatabase.app/",
      projectId: "petfeeder-promax-749f9",
      storageBucket: "petfeeder-promax-749f9.firebasestorage.app",
      messagingSenderId: "47994252501",
      appId: "1:47994252501:web:80c545a11a7abe0d4d065c"
    };

    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // ------------------- MQTT -------------------
    import * as mqtt from "https://unpkg.com/mqtt/dist/mqtt.min.js";

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

    function clearFeedTimer() {
      if (feed_timer) {
        clearTimeout(feed_timer);
        feed_timer = null;
      }
    }

    client.on("connect", () => {
      console.log("✅ Connected to HiveMQ Cloud");
      statusEl.textContent = "🟢 Connected to Pet Feeder";
      client.subscribe(SUBSCRIBE_TOPIC);
      feedBtn.disabled = false;
    });

    client.on("error", (err) => {
      console.error("MQTT Error:", err);
      statusEl.textContent = "🔴 Connection Error";
      feedBtn.disabled = true;
      clearFeedTimer();
    });

    // ------------------- เมื่อได้รับข้อความจากบอร์ด -------------------
    client.on("message", (topic, message) => {
      if (topic !== SUBSCRIBE_TOPIC) return;

      const msg = message.toString();
      console.log("📩 Message:", msg);
      statusEl.textContent = msg;

      // บันทึก log ลง Firebase
      const logRef = ref(db, "logs/petfeeder/status");
      push(logRef, {
        message: msg,
        ts: serverTimestamp()
      });

      feedBtn.disabled = false;
      clearFeedTimer();
    });

    // ------------------- เมื่อกดปุ่ม Feed -------------------
    feedBtn.addEventListener("click", () => {
      feedBtn.disabled = true;
      clearFeedTimer();

      // ส่งคำสั่ง MQTT ไปบอร์ด
      client.publish(PUBLISH_TOPIC, "feed");
      statusEl.textContent = "⏳ Feeding...";

      // บันทึกการ Feed ลง Firebase
      const feedRef = ref(db, "logs/petfeeder/feed");
      push(feedRef, {
        event: "feed",
        ts: serverTimestamp()
      });

      // ตั้งเวลา Timeout ถ้าไม่ตอบกลับ
      feed_timer = setTimeout(() => {
        console.warn("⚠️ Feeding timeout");
        feedBtn.disabled = false;
        feed_timer = null;
        statusEl.textContent = "No response from device";
      }, FEED_TIMEOUT);
    });