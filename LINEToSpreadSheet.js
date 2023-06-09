/** 設定値 */
const CATEGORY = {
  WORK: "仕事",
  RELATIONSHIP: "人間関係",
  MENTAL: "メンタル",
  MONEY: "金銭",
  YOUTUBE: "YouTube",
  OTHER: "その他"
};

/** スクリプトプロパティ */
const LINE_USER_ID = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
const LINE_API_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_API_ACCESS_TOKEN");
const SPREAD_SHEET_URL = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_URL");
const SPREAD_SHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
const SHEET_NAME = PropertiesService.getScriptProperties().getProperty("SHEET_NAME");

/**
 * LINEメッセージをGoogleSpreadSheetに送信
 * @param e LINEからの受信データ
 */
function doPost(e) {
  const eventData = JSON.parse(e.postData.contents).events[0];
  const userId = eventData.source.userId;
  const messageType = eventData.message.type;
  const userMessage = eventData.message.text;
  const replyToken = eventData.replyToken;
  var replyMessage = "";

  // 本人以外のユーザーは拒否
  if (userId != LINE_USER_ID) {
    replyMessage = "開発者本人以外は使用できません。";
    reply(replyToken, replyMessage);
    return;
  }

  // テキスト以外は拒否
  if (messageType != "text") {
    replyMessage = "テキストで入力してください。";
    reply(replyToken, replyMessage);
    return;
  }
  
  // 入力チェックOKの場合、スプレッドシートへ内容を記録
  if (isCorrectFormat(userMessage)) {
    writeMessageToSpreadSheet(userMessage);
    replyMessage = "記録に成功しました。\n" + SPREAD_SHEET_URL;
  } else {
    replyMessage = "記録に失敗しました。\n「仕事:目標:OOする」のような形式で入力してください。\nカテゴリは「仕事」「人間関係」「メンタル」「金銭」「YouTube」「その他」から記入してください。";
  }
  
  // LINEで処理結果を送信
  reply(replyToken, replyMessage);
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 入力書式チェック
 * @param message 入力メッセージ
 * @return 判定結果(true,false)
 */
function isCorrectFormat(message) {
  // コロンの出現回数が2回以外
  if (message.indexOf(":") == -1 || message.match((/:/g)||[]).length != 2) {
    return false;
  }

  // カテゴリの文字列が異なる
  const category = message.split(":")[0];
  if (!Object.values(CATEGORY).includes(category)) {
    return false;
  }

  return true;
}

/**
 * スプレッドシートにメッセージを記録
 * @param message 入力メッセージ
 */
function writeMessageToSpreadSheet(message) {
  // 記録先シートを取得
  const spreadSheet = SpreadsheetApp.openById(SPREAD_SHEET_ID);
  const sheet = spreadSheet.getSheetByName(SHEET_NAME);
  
  // 最新行を取得
  const lastRow = sheet.getLastRow();
  var newRow = lastRow + 1;

  // 日付を取得
  var date = new Date();
  var today = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');

  var category = message.split(":")[0];
  var goal = message.split(":")[1];
  var memo = message.split(":")[2];

  //記録  
  sheet.getRange(newRow, 1).setValue(today);
  sheet.getRange(newRow, 2).setValue(category);
  sheet.getRange(newRow, 3).setValue(goal);
  sheet.getRange(newRow, 4).setValue(memo);
}

/**
 * 処理結果をLINEメッセージで返す
 * @param token トークン
 * @param message メッセージ
 */
function reply(token, message) {
  const url = "https://api.line.me/v2/bot/message/reply";
  UrlFetchApp.fetch(url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + LINE_API_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': token,
      'messages': [{
        'type': 'text',
        'text': message,
      }],
    }),
  });
}


