/** 設定値 */
const MEDICATION_RESPONSE_MESSAGES = [
  "よこからえらい！",
  "ななめよこからえらい！",
  "ひだりからえらい！",
  "みぎからえらい！",
  "したからえらい！",
  "うえからえらい！"
];

/** 定数設定 */
const LINE_CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_GROUP_ID = PropertiesService.getScriptProperties().getProperty("LINE_GROUP_ID"); // 送信先のグループID
const SHIFT_SPREADSHEET_ID = "1WF58VNM0lGfN-YKqR2ySXU_EKQQCpyrV4da8WiVtoBo"; // シフト予定を保存するスプレッドシートID
const SHIFT_SHEET_NAME = "シフト予定";

/**
 * GASトリガーで毎日実行するリマインダー
 * - お薬リマインダー
 * - シフトの前日リマインダー
 */
function runDailyReminders() {
  Logger.log("=== デイリーリマインダー実行開始 ===");

  // お薬リマインダーを送信
  sendLINEBotMessage("お薬のむのむの時間！");

  // シフトの前日リマインダーを送信
  checkAndSendShiftReminder();

  Logger.log("=== デイリーリマインダー実行完了 ===");
}

/**
 * LINE Messaging API Webhookの受信
 * 特定のキーワードを含むメッセージを受信した場合にBotが応答する。
 * 
 * @param {Object} e POSTリクエスト
 */
function doPost(e) {
  try {
    // リクエストボディをパース
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;

    // 各イベントを処理
    events.forEach(event => {
      const replyToken = event.replyToken;
      const receivedMessage = event.message && event.message.text;

      // 応答メッセージを初期化
      let replyMessage = "";

      // 特定のキーワード「のむのむ」を含む場合に応答
      if (receivedMessage && receivedMessage.includes("のむのむ")) {
        // ランダムにメッセージを選択
        const randomIndex = Math.floor(Math.random() * MEDICATION_RESPONSE_MESSAGES.length);
        replyMessage = MEDICATION_RESPONSE_MESSAGES[randomIndex];
      } else if (receivedMessage && receivedMessage.includes("のんでない")) {
        replyMessage = "わるいぽよだね";
      } else if (receivedMessage && receivedMessage.startsWith("シフト登録")) {
        // シフト登録処理
        const shifts = parseShiftMessage(receivedMessage);
        if (shifts.length > 0) {
          saveShiftsToSheet(shifts);
          replyMessage = `${shifts.length}このシフトを とうろくしたもんね！\nバイトのぜんじつに リマインドするもんね！`;
        } else {
          replyMessage = "シフトのけいしきが おかしいもんね。\n例:\nシフト登録\n2025/10/15 10:00-18:00";
        }
      }

      // メッセージを送信
      replyLINEMessage(replyMessage, replyToken);
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("エラー: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LINE Messaging API Webhookの受信
 *  送信先のグループIDを取得するために使用。
 *  botからのメッセージを受け取りたいグループにbotを招待後、任意のメッセージを送信すると呼ばれる。
 *  事前準備として、本GASをデプロイした時に表示されるURLを、LINE DeveloperでWebhookURLに設定しておく。
 *
 * @param {Object} e POSTリクエスト
 */
// function doPost(e) {
//   try {
//     const contents = JSON.parse(e.postData.contents);
//     const groupId = contents.events[0].source.groupId || "グループIDが見つかりません";
//     const replyToken = contents.events[0].replyToken;
//     const replyMessage = `グループID: ${groupId}`;

//     // 応答を送信
//     sendLINEMessage(replyMessage, replyToken);
//   } catch (error) {
//     Logger.log("エラー: " + error);
//   }
// }

/**
 * LINE Botからメッセージを送信
 *
 * @param {string} message 送信するメッセージ
 */
function sendLINEBotMessage(message) {
  // messageがnull、undefined、空文字、または空白のみの場合はreturn
  if (!message || message.trim() === "") return;

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: LINE_GROUP_ID,
    messages: [
      {
        type: "text",
        text: message
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: {
      Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log("送信成功: " + response.getContentText());
  } catch (e) {
    Logger.log("送信失敗: " + e.message);
  }
}

/**
 * LINEにメッセージを返信
 * 
 * @param replyMessage メッセージ
 * @param replyToken トークン
 */
function replyLINEMessage(replyMessage, replyToken) {
  // replyMessageがnull、undefined、空文字、または空白のみの場合はreturn
  if (!replyMessage || replyMessage.trim() === "") return;

  // メッセージを作成
  const payload = {
    replyToken: replyToken,
    messages: [
      {
        type: "text",
        text: replyMessage
      }
    ]
  };

  // LINE Messaging APIのエンドポイント
  const url = "https://api.line.me/v2/bot/message/reply";
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: {
      Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    }
  };

  // 応答を送信
  UrlFetchApp.fetch(url, options);
  Logger.log(`返信成功: ${replyMessage}`);
}

/**
 * 前日リマインダー送信
 * 翌日のシフトがあればLINEにリマインドメッセージを送信
 */
function checkAndSendShiftReminder() {
  // 翌日のシフトを取得
  const shifts = getTomorrowShifts();

  // メッセージを生成
  let message = "";
  if (shifts.length === 0) {
    message = "あしたはバイトないね！あそぶもんね！";
  } else {
    message = "あしたはバイトのひ！めんどくちゃいけど、がんばるもんね！\n";
    shifts.forEach(shift => {
      message += `${shift.date} ${shift.startTime} ~ ${shift.endTime}\n`;
    });
  }

  // メッセージを送信
  sendLINEBotMessage(message.trim());
}

/**
 * 翌日のシフト情報を取得
 *
 * @return {Array} 翌日のシフト情報の配列 [{date: "2025/10/15", startTime: "10:00", endTime: "18:00"}, ...]
 */
function getTomorrowShifts() {
  const spreadsheet = SpreadsheetApp.openById(SHIFT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHIFT_SHEET_NAME);

  // 翌日の日付を計算（時刻情報をクリア）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // シートからデータを取得（ヘッダー行を除く）
  const data = sheet.getDataRange().getValues();
  const shifts = [];

  // 1行目はヘッダーなのでスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = row[0];
    const startTime = row[1];
    const endTime = row[2];

    // 空行をスキップ
    if (!date) continue;

    // 日付をDateオブジェクトに変換
    let shiftDate;
    if (date instanceof Date) {
      shiftDate = new Date(date);
    } else {
      // 文字列の場合はパース（"2025/10/15"や"2025/10/5"などに対応）
      shiftDate = new Date(date);
    }
    shiftDate.setHours(0, 0, 0, 0);

    // 日付が一致するシフトを抽出
    if (shiftDate.getTime() === tomorrow.getTime()) {
      const dateStr = Utilities.formatDate(shiftDate, "Asia/Tokyo", "yyyy/MM/dd");

      // 時刻を"HH:mm"形式の文字列に変換
      const startTimeStr = typeof startTime === 'string'
        ? startTime
        : Utilities.formatDate(startTime, "Asia/Tokyo", "HH:mm");
      const endTimeStr = typeof endTime === 'string'
        ? endTime
        : Utilities.formatDate(endTime, "Asia/Tokyo", "HH:mm");

      shifts.push({
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr
      });
    }
  }

  const tomorrowStr = Utilities.formatDate(tomorrow, "Asia/Tokyo", "yyyy/MM/dd");
  Logger.log(`翌日(${tomorrowStr})のシフト: ${shifts.length}件`);
  return shifts;
}

/**
 * シフト登録メッセージから日付と時間を抽出
 *
 * @param {string} message 受信したメッセージ
 * @return {Array} シフト情報の配列 [{date: "2025/10/15", startTime: "10:00", endTime: "18:00"}, ...]
 */
function parseShiftMessage(message) {
  const shifts = [];
  // 正規表現: yyyy/MM/dd HH:mm-HH:mm 形式を検出
  const regex = /(\d{4}\/\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g;

  let match;
  while ((match = regex.exec(message)) !== null) {
    shifts.push({
      date: match[1],      // 日付
      startTime: match[2], // 開始時刻
      endTime: match[3]    // 終了時刻
    });
  }

  return shifts;
}

/**
 * シフト情報をスプレッドシートに保存
 *
 * @param {Array} shifts シフト情報の配列
 */
function saveShiftsToSheet(shifts) {
  const spreadsheet = SpreadsheetApp.openById(SHIFT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHIFT_SHEET_NAME);

  const now = new Date();
  const registeredAt = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");

  shifts.forEach(shift => {
    sheet.appendRow([shift.date, shift.startTime, shift.endTime, registeredAt]);
  });

  Logger.log(`${shifts.length}件のシフトを保存しました`);
}
