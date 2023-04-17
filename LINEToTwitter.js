/** 設定値 */
const LINE_API_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_API_ACCESS_TOKEN');
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const LINE_USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

const TWITTER_API_KEY = PropertiesService.getScriptProperties().getProperty('TWITTER_API_KEY');
const TWITTER_API_SECRET = PropertiesService.getScriptProperties().getProperty('TWITTER_API_SECRET');
const TWITTER_POST_URL = 'https://api.twitter.com/2/tweets';
const TWITTER_MEDIA_POST_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWITTER_ACCOUNT_NAME = 'IT6210';
const TWITTER_TWEET_MESSAGE = 'インスタ映え';

const IMAGE_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('IMAGE_FOLDER_ID');
const twitter = TwitterWebService.getInstance(TWITTER_API_KEY, TWITTER_API_SECRET);
const imageFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
var replyMessage = "";

/**
 * LINEからTwitterにインスタ映えツイート
 * @param e LINEからの受信データ 
 */
function doPost(e) {
    const eventData = JSON.parse(e.postData.contents).events[0];
    const replyToken = eventData.replyToken;
    const messageId = eventData.message.id;

    // IT6210以外のユーザーは拒否
    if (eventData.source.userId !== LINE_USER_ID) {
        replyMessage = "何が目的だ！";
        reply(replyToken, replyMessage);
        return;
    }

    // 画像以外は拒否
    if (eventData.message.type != 'image') {
        replyMessage = "画像以外は華麗にスルーさ！";
        reply(replyToken, replyMessage);
        return;
    }

    // ツイート処理
    instabaeTweet(messageId);

    // LINEに実行結果をリプライ
    reply(replyToken, replyMessage);
}

/**
 * インスタ映えツイートを実行
 * @param messageId メッセージID
 */
function instabaeTweet(messageId) {
    saveImage(messageId);
    const imageId = PropertiesService.getScriptProperties().getProperty('IMAGE_ID');
    if (imageId != "") {
        const tweetId = tweetWithMedia(imageId);
        if (tweetId > 0) {
            replyMessage = `インスタ映えツイート爆誕！華麗すぎる！\nhttps://twitter.com/${TWITTER_ACCOUNT_NAME}/status/${tweetId}`;
        } else {
            replyMessage = "ツイート失敗。";
        }
        deleteMedia(imageId);
    } else {
        replyMessage = "メディアが見つかりません。"
    }
    resetProperty("IMAGE_ID");
}

/**
 * 所定のフォルダに画像を保存
 * @param messageId メッセージID
 *  */
function saveImage(messageId) {
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`
    const options = {
        "method" : "get",
        "headers": {"Authorization":"Bearer " + LINE_API_ACCESS_TOKEN}
    }
    const response = UrlFetchApp.fetch(url, options);
    const blob = response.getBlob();
    let newFile = imageFolder.createFile(blob);
    newFile.setName(messageId);
    PropertiesService.getScriptProperties().setProperty("IMAGE_ID", newFile.getId());
}

/** 
 * メディア付きツイート
 * @param mediaId メディアID
 * */
function tweetWithMedia(mediaId) {
    const twitterMediaId = uploadMedia(mediaId);
    const payload = {
        "text": TWITTER_TWEET_MESSAGE + "\nby 最強インスタ映えツイートbot",
        "media": {
            "media_ids": [
                twitterMediaId
            ]
        }
    };
    const service = twitter.getService();
    const response = service.fetch(TWITTER_POST_URL, {
        'method': 'POST',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload)
    });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return JSON.parse(response.getContentText()).data.id;
    } else {
        return -1;
    }
}

/**
 * Twitterにメディアをアップロード
 * @param mediaId メディアID
 *  */
function uploadMedia(mediaId) {
    const media = DriveApp.getFileById(mediaId);
    const m = media.getBlob().getBytes();
    const service = twitter.getService();
    const payload = {
        'media_data': Utilities.base64Encode(m)
    };
    console.log(JSON.stringify(payload))
    const response = service.fetch(TWITTER_MEDIA_POST_URL, {
        'method': 'POST',
        'payload': payload
    });
    const twitterMediaId =  JSON.parse(response.getContentText()).media_id_string
    console.log(twitterMediaId)
    return twitterMediaId;
}

/**
 * メディアの削除
 * @param mediaId メディアID
 *  */
function deleteMedia(mediaId) {
    DriveApp.getFileById(mediaId).setTrashed(true);
}

/**
 * 指定のスクリプトプロパティをリセット
 * @param name プロパティ名
 *  */
function resetProperty(name) {
    PropertiesService.getScriptProperties().setProperty(name, "");
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

// Twitter認証
function authorize() {
    twitter.authorize();
}

// Twitter認証解除
function reset() {
    twitter.reset();
}

// Twitter認証時のコールバック
function authCallback(request) {
    return twitter.authCallback(request);
}
