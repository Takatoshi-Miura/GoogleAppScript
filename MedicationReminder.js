/** 設定値 */
const MESSAGE = {
  ON: "今日はお薬のむのむの日！",
  OFF: "今日はお薬はのんじゃダメ！"
};

/** スクリプトプロパティ */
const LINE_NOTIFY_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TOKEN");
const NOTIFY_MESSAGE = PropertiesService.getScriptProperties().getProperty("NOTIFY_MESSAGE");

/**
 * LINE Notifyに通知を送信
 */
function sendMedicationReminder() {
  const message = createRemindMessage();
  const options = {
    "method": "post",
    "payload": "message=" + message,
    "headers": {
      "Authorization": "Bearer " + LINE_NOTIFY_TOKEN
    }
  };
  UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
}

/**
 * メッセージを作成
 * @return message
 */
function createRemindMessage() {
  var message = MESSAGE.ON;
  if (message == NOTIFY_MESSAGE) {
    message = MESSAGE.OFF;
  }
  PropertiesService.getScriptProperties().setProperty("NOTIFY_MESSAGE", message);
  return message;
}