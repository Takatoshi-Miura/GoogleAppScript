/** 設定値 */
const SEND_MESSAGE = "休憩の時間です！";

/** スクリプトプロパティ */
const LINE_NOTIFY_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TOKEN");

const DAY = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

/** 平日9:30~18:30の2時間おきに通知を送信 */
function sendNotification() {
  var now = new Date();
  var nowDay = now.getDay();
  
  // 平日かつ指定した時間帯の場合にメッセージを送信
  if (nowDay >= DAY.MONDAY && nowDay <= DAY.FRIDAY) {
    var startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30);
    var endTime   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 30);
    
    // 2時間毎の通知（奇数時間）の場合にメッセージを送信
    if ((now >= startTime && now < endTime) && (now.getHours() % 2 === 1)) {
      sendReminder();
    }
  }
}

/** LINE Notifyに通知を送信 */
function sendReminder() {
  const options = {
    "method": "post",
    "payload": "message=" + SEND_MESSAGE,
    "headers": {
      "Authorization": "Bearer " + LINE_NOTIFY_TOKEN
    }
  };
  UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
}
