/** 設定値 */
const TWITTER_ACCOUNT_NAME = "IT6210";

/** スクリプトプロパティ */
const LINE_USER_ID = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
const LINE_API_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_API_ACCESS_TOKEN");
const TWITTER_API_KEY = PropertiesService.getScriptProperties().getProperty("TWITTER_API_KEY");
const TWITTER_API_SECRET = PropertiesService.getScriptProperties().getProperty("TWITTER_API_SECRET");
const TWITTER = TwitterWebService.getInstance(TWITTER_API_KEY, TWITTER_API_SECRET);

/**
 * LINEからTwitterにインスタ映えツイート
 * @param e LINEからの受信データ 
 */
function doPost(e) {
  const eventData = JSON.parse(e.postData.contents).events[0];
  const userId = eventData.source.userId;
  const messageType = eventData.message.type;
  const messageId = eventData.message.id;
  const replyToken = eventData.replyToken;
  var replyMessage = "";

  // 本人以外のユーザーは拒否
  if (userId != LINE_USER_ID) {
    replyMessage = "何が目的だ！\n所有者でもないアカウントに、インスタ映えツイートを投稿するなど...人間の所業ではない！";
    reply(replyToken, replyMessage);
    return;
  }

  // 画像以外は拒否
  if (messageType != "image") {
    replyMessage = "画像以外は華麗にスルーさ！";
    reply(replyToken, replyMessage);
    return;
  }

  // 画像を取得＆アップロード
  const imageContent = getImageContent(messageId);
  const mediaId = uploadImage(imageContent);

  // インスタ映えツイート
  const tweetId = instabaeTweet(mediaId);
  if (tweetId > 0) {
    replyMessage = "インスタ映えツイート爆誕！\n華麗すぎる！\nhttps://twitter.com/" + TWITTER_ACCOUNT_NAME + "/status/" + tweetId;
  } else {
    replyMessage = "ツイート失敗！\nもう一度試したまえ！";
  }

  // LINEに実行結果をリプライ
  reply(replyToken, replyMessage);
}

/**
 * LINEメッセージから画像を取得
 * @param messageId メッセージID
 * @return 画像データ
 */
function getImageContent(messageId) {
  var url = "https://api-data.line.me/v2/bot/message/" + messageId + "/content";
  var image = UrlFetchApp.fetch(url,{
    "headers": {
      "Authorization": "Bearer " + LINE_API_ACCESS_TOKEN,
    }
  });
  return image.getBlob();
}

/**
 * Twitterに画像をアップロード
 * @param imageContent 画像データ
 * @return メディアID
 *  */
function uploadImage(imageContent) {
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const media = imageContent.getBytes();
  const service = TWITTER.getService();
  const payload = {
    "media_data": Utilities.base64Encode(media)
  };
  const response = service.fetch(url, {
    "method": "POST",
    "payload": payload
  });
  return JSON.parse(response.getContentText()).media_id_string;
}

/**
 * インスタ映えツイートを実行
 * @param mediaId メディアID
 * @return TweetID(失敗時は-1)
 */
function instabaeTweet(mediaId) {
  const url = "https://api.twitter.com/2/tweets";
  const payload = {
    "text": "インスタ映え\nby 最強インスタ映えツイートbot",
    "media": {
      "media_ids": [mediaId]
    }
  };
  const service = TWITTER.getService();
  const response = service.fetch(url, {
    "method": "POST",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  });
  if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
    return JSON.parse(response.getContentText()).data.id;
  } else {
    return -1;
  }
}

/** 
 * LINEへのリプライ
 * @param token トークン
 * @param message メッセージ
 * */
function reply(token, message) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = {
    "replyToken": token,
    "messages": [{
      "type": "text",
      "text": message
    }]
  };
  const options = {
    "payload" : JSON.stringify(payload),
    "method"  : "POST",
    "headers" : {
      "Authorization": "Bearer " + LINE_API_ACCESS_TOKEN
    },
    "contentType": "application/json"
  };
  UrlFetchApp.fetch(url, options);
}

/** Twitter認証 */
function authorize() {
  TWITTER.authorize();
}

/** Twitter認証解除 */
function reset() {
  TWITTER.reset();
}

/** Twitter認証時のコールバック */
function authCallback(request) {
  return TWITTER.authCallback(request);
}
