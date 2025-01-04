/**
 * タグごとの合計時間を集計し、スプシにプロット
 */
function aggregateCalendarTags() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Googleカレンダー集計');
  var calendar = CalendarApp.getDefaultCalendar();
  
  // 前日の日時を設定
  var now = new Date();
  var yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  var startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)); // 前日の00:00
  var endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)); // 前日の23:59
  
  // 前日のイベントを取得
  var events = calendar.getEvents(startOfDay, endOfDay);
  
  // タグごとの合計時間を保持
  var tagTimes = {
    '#work': 0,
    '#life': 0,
    '#undo': 0,
    '#idea': 0,
    '#ref': 0,
    '#douga': 0,
    '#skill': 0,
    '#book': 0,
    '#code': 0
  };
  
  // イベントごとにタグをチェックし、タグごとの時間を加算
  events.forEach(function(event) {
    var summary = event.getTitle().toLowerCase();
    var duration = (event.getEndTime() - event.getStartTime()) / (1000 * 60 * 60);
    
    for (var tag in tagTimes) {
      if (summary.indexOf(tag) !== -1) {
        tagTimes[tag] += duration;
      }
    }
  });
  
  // 空いている行を探す
  var lastRow = sheet.getLastRow();
  var nextRow = lastRow + 1; // 次にプロットする行
  
  // A列に前日の日付をプロット
  var date = Utilities.formatDate(new Date(startOfDay), Session.getScriptTimeZone(), 'yyyy/MM/dd');
  sheet.getRange('A' + nextRow).setValue(date);
  
  // B列〜I列にタグごとの合計時間をプロット
  for (var tag in tagTimes) {
    var column = getColumnForTag(tag);
    if (column) {
      sheet.getRange(nextRow, column).setValue(tagTimes[tag]);
    }
  }
}

/**
 * タグに対応する列番号を取得
 */
function getColumnForTag(tag) {
  switch(tag) {
    case '#work': return 2; // B列
    case '#life': return 3;
    case '#undo': return 4;
    case '#idea': return 5;
    case '#ref': return 6;
    case '#douga': return 7;
    case '#skill': return 8;
    case '#book': return 9;
    case '#code': return 10;
    default: return null;
  }
}

/**
 * Googleカレンダーに登録されている予定の合計時間を取得
 */
function calculateTotalDuration() {
  var calendar = CalendarApp.getDefaultCalendar();
  
  // 指定時刻以降のイベントを取得
  const startDate = new Date('2020-01-01');
  const now = new Date();
  var startDate_YYYYMMDD = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  var events = calendar.getEvents(startDate, now);

  var totalWorkDuration = 0;

  // エンジニア関連
  var totalSportsNoteDuration = 0;
  var totalProcessNoteDuration = 0;
  var totalTaskRankerDuration = 0;
  var totalIOSDuration = 0;
  var totalAndroidDuration = 0;
  var totalJavaDuration = 0;
  var totalGASDuration = 0;

  // 思考整理関連
  var totalThinkDuration = 0;
  var totalReadingDuration = 0;

  // 運動関連
  var totalWalkingDuration = 0;
  var totalCyclingDuration = 0;
  var totalUndoDuration = 0;

  // YouTube活動
  var totalMakeMovieDuration = 0;
  var totalYouTubeLiveDuration = 0;

  // 余暇関連
  var totalWatchYouTubeDuration = 0;
  var totalGEDuration = 0;
  var totalDQDuration = 0;
  var totalGenshinDuration = 0;
  var totalDoubitsuNoMoriDuration = 0;
  var totalMagirekoDuration = 0;
  var totalPokemonDuration = 0;
  
  events.forEach(function(event) {
    var summary = event.getTitle().toLowerCase(); // 大文字小文字を区別しないため小文字に変換
    if (summary.indexOf("仕事") !== -1) {
      totalWorkDuration += getDurationByHour(event);
    } else if (summary.indexOf("sportsnote") !== -1 || summary.indexOf("oa") !== -1) {
      totalSportsNoteDuration += getDurationByHour(event);
    } else if (summary.indexOf("processnote") !== -1) {
      totalProcessNoteDuration += getDurationByHour(event);
    } else if (summary.indexOf("taskranker") !== -1) {
      totalTaskRankerDuration += getDurationByHour(event);
    } else if (summary.indexOf("ios") !== -1 || summary.indexOf("swift") !== -1 || summary.indexOf("objective") !== -1) {
      totalIOSDuration += getDurationByHour(event);
    } else if (summary.indexOf("android") !== -1 || summary.indexOf("kotlin") !== -1) {
      totalAndroidDuration += getDurationByHour(event);
    } else if (summary.indexOf("java") !== -1 || summary.indexOf("spring") !== -1) {
      totalJavaDuration += getDurationByHour(event);
    } else if (summary.indexOf("gas") !== -1 || summary.indexOf("script") !== -1 || summary.indexOf("api") !== -1) {
      totalGASDuration += getDurationByHour(event);
    } else if (summary.indexOf("思考整理") !== -1 || summary.indexOf("考える") !== -1 || summary.indexOf("メントレ") !== -1 || summary.indexOf("振り返り") !== -1) {
      totalThinkDuration += getDurationByHour(event);
    } else if (summary.indexOf("読書") !== -1 || summary.indexOf("オーディオブック") !== -1) {
      totalReadingDuration += getDurationByHour(event);
    } else if (summary.indexOf("ウォーキング") !== -1 || summary.indexOf("ウォーク") !== -1 || summary.indexOf("散歩") !== -1) {
      totalWalkingDuration += getDurationByHour(event);
    } else if (summary.indexOf("サイクリング") !== -1) {
      totalCyclingDuration += getDurationByHour(event);
    } else if (summary.indexOf("リングフィット") !== -1) {
      totalUndoDuration += getDurationByHour(event);
    } else if (summary.indexOf("動画") !== -1 || summary.indexOf("編集") !== -1 || summary.indexOf("サムネ") !== -1 || summary.indexOf("撮影") !== -1) {
      totalMakeMovieDuration += getDurationByHour(event);
    } else if (summary.indexOf("ライブ") !== -1 || summary.indexOf("配信") !== -1) {
      totalYouTubeLiveDuration += getDurationByHour(event);
    } else if (summary.indexOf("youtube") !== -1) {
      totalWatchYouTubeDuration += getDurationByHour(event);
    } else if (summary.indexOf("ゴッドイーター") !== -1 || summary.indexOf("ge") !== -1) {
      totalGEDuration += getDurationByHour(event);
    } else if (summary.indexOf("ドラクエ") !== -1 || summary.indexOf("テリワン") !== -1 || summary.indexOf("イルルカ") !== -1) {
      totalDQDuration += getDurationByHour(event);
    } else if (summary.indexOf("原神") !== -1) {
      totalGenshinDuration += getDurationByHour(event);
    } else if (summary.indexOf("あつ森") !== -1 || summary.indexOf("ポケ森") !== -1 || summary.indexOf("どうぶつの森") !== -1) {
      totalDoubitsuNoMoriDuration += getDurationByHour(event);
    } else if (summary.indexOf("マギレコ") !== -1) {
      totalMagirekoDuration += getDurationByHour(event);
    } else if (summary.indexOf("ポケモン") !== -1 || summary.indexOf("SV") !== -1) {
      totalPokemonDuration += getDurationByHour(event);
    }
  });
  var sumEngeneer = totalSportsNoteDuration + totalProcessNoteDuration + totalTaskRankerDuration + totalIOSDuration + totalAndroidDuration + totalJavaDuration + totalGASDuration;
  var sumThinking = totalThinkDuration + totalReadingDuration;
  var sumSports = totalWalkingDuration + totalCyclingDuration;
  var sumCreator = totalMakeMovieDuration + totalYouTubeLiveDuration;
  var sumGame = totalGEDuration + totalDQDuration + totalGenshinDuration + totalDoubitsuNoMoriDuration + totalMagirekoDuration + totalPokemonDuration;
  
  Logger.log('集計開始日：' + startDate_YYYYMMDD + '--------------------------------');
  Logger.log('労働時間: ' + totalWorkDuration + ' 時間');
  Logger.log('エンジニア関連--------------------------------');
  Logger.log('SportsNote開発: ' + totalSportsNoteDuration + ' 時間');
  Logger.log('ProcessNote開発: ' + totalProcessNoteDuration + ' 時間');
  Logger.log('TaskRanker開発: ' + totalTaskRankerDuration + ' 時間');
  Logger.log('iOS学習: ' + totalIOSDuration + ' 時間');
  Logger.log('Android学習: ' + totalAndroidDuration + ' 時間');
  Logger.log('Java学習: ' + totalJavaDuration + ' 時間');
  Logger.log('GAS学習: ' + totalGASDuration + ' 時間');
  Logger.log('合計: ' + sumEngeneer + ' 時間');
  Logger.log('思考整理-------------------------------------');
  Logger.log('思考整理: ' + totalThinkDuration + ' 時間');
  Logger.log('読書: ' + totalReadingDuration + ' 時間');
  Logger.log('合計: ' + sumThinking + ' 時間');
  Logger.log('運動関連-------------------------------------');
  Logger.log('ウォーキング: ' + totalWalkingDuration + ' 時間');
  Logger.log('サイクリング: ' + totalCyclingDuration + ' 時間');
  Logger.log('リングフィット: ' + totalUndoDuration + ' 時間');
  Logger.log('合計: ' + sumSports + ' 時間');
  Logger.log('YouTube活動関連------------------------------');
  Logger.log('動画編集: ' + totalMakeMovieDuration + ' 時間');
  Logger.log('ライブ配信: ' + totalYouTubeLiveDuration + ' 時間');
  Logger.log('合計: ' + sumCreator + ' 時間');
  Logger.log('余暇関連-------------------------------------');
  Logger.log('YouTube視聴: ' + totalWatchYouTubeDuration + ' 時間');
  Logger.log('ゴッドイーター: ' + totalGEDuration + ' 時間');
  Logger.log('ドラクエ: ' + totalDQDuration + ' 時間');
  Logger.log('原神: ' + totalGenshinDuration + ' 時間');
  Logger.log('どうぶつの森: ' + totalDoubitsuNoMoriDuration + ' 時間');
  Logger.log('マギレコ: ' + totalMagirekoDuration + ' 時間');
  Logger.log('ポケモン: ' + totalPokemonDuration + ' 時間');
  Logger.log('ゲーム合計: ' + sumGame + ' 時間');
}

/**
 * イベントの合計時間をhour単位で取得
 * 
 * @param event イベントデータ
 * @return イベントの合計時間[hour]
 */
function getDurationByHour(event) {
  var startTime = event.getStartTime();
  var endTime = event.getEndTime();
  return (endTime - startTime) / (1000 * 60 * 60);
}
