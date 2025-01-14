/** 設定値 */
const SEND_MESSAGE = "お薬のむのむの時間！";
const RESPONSE_MESSAGES = [
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

/**
 * 定期実行時にLINE Botからメッセージを送信
 */
function sendBotMessage() {
  const url = "https://api.line.me/v2/bot/message/push"; // Messaging APIのエンドポイント

  const payload = {
    to: LINE_GROUP_ID,
    messages: [
      {
        type: "text",
        text: SEND_MESSAGE
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

      // 受信したメッセージ
      const receivedMessage = event.message && event.message.text;

      // 応答メッセージを初期化
      let replyMessage = "";

      // 特定のキーワード「のむのむ」を含む場合に応答
      if (receivedMessage && receivedMessage.includes("のむのむ")) {
        // ランダムにメッセージを選択
        const randomIndex = Math.floor(Math.random() * RESPONSE_MESSAGES.length);
        replyMessage = RESPONSE_MESSAGES[randomIndex];
      } else if (receivedMessage && receivedMessage.includes("のんでない")) {
        replyMessage = "わるいぽよだね";
      }

      // メッセージを送信
      sendLINEMessage(replyMessage, replyToken);
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("エラー: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LINEにメッセージを送信
 * 
 * @param replyMessage メッセージ
 * @param replyToken トークン
 */
function sendLINEMessage(replyMessage, replyToken) {
  // replyMessageがnull、undefined、空文字、または空白のみの場合はreturn
  if (!replyMessage || replyMessage.trim() === "") return;

  // メッセージを作成
  const message = {
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
    payload: JSON.stringify(message),
    headers: {
      Authorization: "Bearer " + PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN")
    }
  };

  // 応答を送信
  UrlFetchApp.fetch(url, options);
  Logger.log(`返信成功: ${replyMessage}`);
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