/** 設定値 */
const LINE_API_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_API_ACCESS_TOKEN');
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const RESPONSE_MESSAGE = ["レスポンス", "れすぽんす", "Response"];
const LAST_RESPONSE_MESSAGE = PropertiesService.getScriptProperties().getProperty('LAST_RESPONSE_MESSAGE');

/**
 * レスポンスを返す
 * @param e LINEからの受信データ
 */
function doPost(e) {
    const eventData = JSON.parse(e.postData.contents).events[0];
    const replyToken = eventData.replyToken;

    // メッセージを設定
    var replyMessage = LAST_RESPONSE_MESSAGE;
    while (replyMessage === LAST_RESPONSE_MESSAGE) {
      replyMessage = getRandomValueFromArray(RESPONSE_MESSAGE);
    }
    PropertiesService.getScriptProperties().setProperty('LAST_RESPONSE_MESSAGE', replyMessage);

    // LINEにリプライ
    reply(replyToken, replyMessage);
}

/**
 * 配列からランダムな値を取得
 * @param array 配列
 * @return 要素
 */
function getRandomValueFromArray(array) {
    var randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

/** 
 * LINEへのリプライ
 * @param token トークン
 * @param message メッセージ
 * */
function reply(token, message) {
    const payload = {
        'replyToken': token,
        'messages': [{
            'type': 'text',
            'text': message
        }]
    };
    const options = {
        'payload' : JSON.stringify(payload),
        'method'  : 'POST',
        'headers' : {"Authorization" : "Bearer " + LINE_API_ACCESS_TOKEN},
        'contentType' : 'application/json'
    };
    UrlFetchApp.fetch(LINE_REPLY_URL, options);
}
