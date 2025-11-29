/** 定数 */
const SHEET_NAME = 'Googleカレンダー集計';
const GRAPH_SHEET_NAME = 'Googleカレンダー集計(円グラフ用)';
const START_DATE = new Date('2024/12/17'); // タグ付け運用開始日

const TAG_COLUMN_MAP = {
  '#work': 2,  // B列
  '#life': 3,  // C列
  '#sleep': 4, // D列
  '#undo': 5,  // E列
  '#idea': 6,  // F列
  '#ref': 7,   // G列
  '#douga': 8, // H列
  '#skill': 9, // I列
  '#book': 10, // J列
  '#code': 11, // K列
  '#chi': 12,  // L列
  '#github': 13, // M列
  '#performance': 14 // N列
};

// 円グラフ用カテゴリ
const TAG_CATEGORY_MAP = {
  '#work': '仕事',
  '#life': '生活',
  '#sleep': '睡眠',
  '#undo': '運動',
  '#idea': '思考整理',
  '#ref': 'リフレッシュ',
  '#douga': 'YouTube活動',
  '#skill': '自己研鑽',
  '#book': '読書',
  '#code': 'プログラミング',
  '#chi': 'ちーちゃん'
};

/**
 * 昨日のタグごとの合計時間を集計し、スプシにプロット（定期実行用）
 */
function plotYesterdayTagTimesToSheet() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  plotTagTimesToSheet(yesterday);
  plotTagTimesToGraphSheet(yesterday);
  plotGitHubChangesToSheet(yesterday);
  plotPerformancePointToSheet(yesterday);
}

/**
 * 指定した日付のタグごとの合計時間を集計し、スプシにプロット
 * 
 * @param {Date} [targetDate] - 集計対象の日付
 */
function plotTagTimesToSheet(targetDate) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // 指定日のタグごとの時間を取得
  const tagTimes = calculateTagTimes(targetDate);
  
  // 空いている行を取得
  var nextRow = sheet.getLastRow() + 1;
  
  // A列に日付をプロット
  var date = Utilities.formatDate(new Date(targetDate), Session.getScriptTimeZone(), 'yyyy/MM/dd');
  sheet.getRange('A' + nextRow).setValue(date);
  
  // 以降の列にタグごとの合計時間をプロット
  for (var tag in tagTimes) {
    var column = getColumnForTag(tag);
    if (column) {
      sheet.getRange(nextRow, column).setValue(tagTimes[tag]);
    }
  }
}

/**
 * 指定した日付のGitHub変更行数をスプシにプロット
 *
 * @param {Date} [targetDate] - 集計対象の日付
 */
function plotGitHubChangesToSheet(targetDate) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // GitHub変更行数を取得
  const githubChanges = getYesterdayGitHubCodeChanges(targetDate);

  // 最終行のM列に書き込み
  var lastRow = sheet.getLastRow();
  var githubColumn = TAG_COLUMN_MAP['#github'];
  sheet.getRange(lastRow, githubColumn).setValue(githubChanges);
}

/**
 * 指定した日付のパフォーマンスポイントをスプシにプロット
 *
 * @param {Date} [targetDate] - 集計対象の日付
 */
function plotPerformancePointToSheet(targetDate) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // 最終行のN列にパフォーマンスポイント(固定値3)を書き込み
  var lastRow = sheet.getLastRow();
  var performanceColumn = TAG_COLUMN_MAP['#performance'];
  sheet.getRange(lastRow, performanceColumn).setValue(3);
}

/**
 * 指定した日付のタグごとの合計時間を集計し、円グラフ用シートにプロット
 *
 * @param {Date} [targetDate] - 集計対象の日付
 */
function plotTagTimesToGraphSheet(targetDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let graphSheet = ss.getSheetByName(GRAPH_SHEET_NAME);
  
  // 指定日のタグごとの時間を取得
  const tagTimes = calculateTagTimes(targetDate);
  
  // 日付をフォーマット
  const formattedDate = Utilities.formatDate(new Date(targetDate), Session.getScriptTimeZone(), 'yyyy/MM/dd');
  
  // 新しいデータを準備
  const newData = [];
  for (const tag in TAG_CATEGORY_MAP) {
    const categoryName = TAG_CATEGORY_MAP[tag];
    const hours = tagTimes[tag] || 0;
    
    newData.push([formattedDate, categoryName, hours]);
  }
  
  // データが存在する場合のみ追加
  if (newData.length > 0) {
    // 空いている行を取得
    var nextRow = graphSheet.getLastRow() + 1;
    graphSheet.getRange(nextRow, 1, newData.length, 3).setValues(newData);
  }
}

/**
 * 指定された日付のタグごとの合計時間を計算（イベントがない時間は睡眠時間として計算）
 * 
 * @param {Date} targetDate - 集計対象日
 * @returns {Object} タグごとの合計時間
 */
function calculateTagTimes(targetDate) {  
  // タグごとの合計時間を0セット
  const tagTimes = Object.keys(TAG_COLUMN_MAP).reduce((acc, tag) => {
    acc[tag] = 0;
    return acc;
  }, {});

  // 集計対象日のイベントを全取得
  const events = getEventsForDate(targetDate);
  let totalEventHours = 0;

  // イベントごとにタグをチェックし、タグごとの時間を加算
  events.forEach(function(event) {
    // 終日のイベントは無視
    if (event.isAllDayEvent()) return;

    const summary = event.getTitle().toLowerCase();
    const duration = (event.getEndTime() - event.getStartTime()) / (1000 * 60 * 60);
    totalEventHours += duration;

    for (const tag in tagTimes) {
      if (summary.indexOf(tag) !== -1) {
        tagTimes[tag] += duration;
      }
    }
  });

  // 1日の時間からイベントの合計時間を引き、#sleep に加算
  const totalDayHours = 24;
  const sleepHours = totalDayHours - totalEventHours;
  if ('#sleep' in tagTimes) {
    tagTimes['#sleep'] += sleepHours;
  }

  return tagTimes;
}

/**
 * 指定した日付のイベントを全取得
 *
 * @param {Date} targetDate - イベントを取得する対象の日付
 * @returns {CalendarEvent[]} - 指定日のイベントの配列
 */
function getEventsForDate(targetDate) {
  var calendar = CalendarApp.getDefaultCalendar();

  // 集計対象日の00:00〜23:59を設定
  var startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  var endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // イベントを取得
  return calendar.getEvents(startOfDay, endOfDay);
}

/**
 * 指定した日付のGitHubコード変更行数を取得
 *
 * @param {Date} targetDate - 集計対象日
 * @returns {number} 変更行数（additions + deletions）
 */
function getYesterdayGitHubCodeChanges(targetDate) {
  // Script PropertiesからGitHub Personal Access Tokenを取得
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_ACCESS_TOKEN');
  if (!token) {
    Logger.log('GitHub Access Token が設定されていません');
    return 0;
  }

  // API呼び出し用ヘッダー
  const headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json'
  };

  // 対象日の開始・終了時刻を設定
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // ISO 8601形式に変換
  const since = startOfDay.toISOString();
  const until = endOfDay.toISOString();

  let totalChanges = 0;

  try {
    // 自分の全リポジトリを取得
    const reposUrl = 'https://api.github.com/user/repos?per_page=100&affiliation=owner';
    const reposResponse = UrlFetchApp.fetch(reposUrl, {
      headers: headers,
      muteHttpExceptions: true
    });

    if (reposResponse.getResponseCode() !== 200) {
      Logger.log('リポジトリ取得エラー: ' + reposResponse.getContentText());
      return 0;
    }

    const repos = JSON.parse(reposResponse.getContentText());

    // 各リポジトリのコミットを確認
    repos.forEach(function(repo) {
      const commitsUrl = 'https://api.github.com/repos/' + repo.full_name + '/commits?since=' + since + '&until=' + until;

      try {
        const commitsResponse = UrlFetchApp.fetch(commitsUrl, {
          headers: headers,
          muteHttpExceptions: true
        });

        if (commitsResponse.getResponseCode() === 200) {
          const commits = JSON.parse(commitsResponse.getContentText());

          // 各コミットの統計情報を取得
          commits.forEach(function(commit) {
            const commitUrl = 'https://api.github.com/repos/' + repo.full_name + '/commits/' + commit.sha;

            try {
              const commitDetailResponse = UrlFetchApp.fetch(commitUrl, {
                headers: headers,
                muteHttpExceptions: true
              });

              if (commitDetailResponse.getResponseCode() === 200) {
                const commitDetail = JSON.parse(commitDetailResponse.getContentText());

                if (commitDetail.stats) {
                  totalChanges += (commitDetail.stats.additions || 0) + (commitDetail.stats.deletions || 0);
                }
              }
            } catch (e) {
              Logger.log('コミット詳細取得エラー: ' + e.message);
            }
          });
        }
      } catch (e) {
        Logger.log('コミット一覧取得エラー (' + repo.full_name + '): ' + e.message);
      }
    });

  } catch (e) {
    Logger.log('GitHub API呼び出しエラー: ' + e.message);
    return 0;
  }

  return totalChanges;
}

/**
 * タグに対応する列番号を取得
 */
// 列番号を取得する関数
function getColumnForTag(tag) {
  return TAG_COLUMN_MAP[tag] || null;
}


/**
 * タグ運用開始日から今日までのタグ時間を全てプロット
 */
function plotTagTimesForRange() {
  var startDate = START_DATE;
  var endDate = new Date();

  // 開始日から今日まで順番に処理
  while (startDate <= endDate) {
    plotTagTimesToSheet(startDate);
    startDate.setDate(startDate.getDate() + 1);
  }
}

/**
 * タグ運用開始日から現在までのGitHub変更行数を全てプロット
 */
function plotGitHubChangesForRange() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var githubColumn = TAG_COLUMN_MAP['#github'];

  var startDate = new Date(START_DATE);
  var endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // 昨日まで

  // 開始日から昨日まで順番に処理
  var currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    var formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');

    Logger.log('処理中: ' + formattedDate);

    // シートから該当日付の行を探す
    for (var i = 1; i < data.length; i++) { // i=0はヘッダーなのでスキップ
      var cellDate = data[i][0];

      if (cellDate) {
        var cellDateFormatted = Utilities.formatDate(new Date(cellDate), Session.getScriptTimeZone(), 'yyyy/MM/dd');

        if (cellDateFormatted === formattedDate) {
          // 該当行を見つけた場合、GitHub変更行数を取得して書き込み
          var githubChanges = getYesterdayGitHubCodeChanges(currentDate);
          sheet.getRange(i + 1, githubColumn).setValue(githubChanges);
          Logger.log(formattedDate + ': ' + githubChanges + '行');
          break;
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  Logger.log('完了');
}

/**
 * 「Googleカレンダー集計」シートを縦持ちに変換
 */
function convertToVertical() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAME);
  let verticalSheet = ss.getSheetByName(GRAPH_SHEET_NAME);
  verticalSheet.clear();
  
  // ヘッダー設定
  verticalSheet.getRange(1, 1, 1, 3).setValues([['日付', 'カテゴリ', '時間']]);
  
  const data = sourceSheet.getDataRange().getValues();
  const categories = [
    '仕事', '生活', '睡眠', '運動', '思考整理', 
    'リフレッシュ', 'YouTube活動', '自己研鑽', 
    '読書', 'プログラミング', 'ちーちゃん'
  ];
  
  let outputRow = 2;
  
  // データ変換ループ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = row[0];
    
    if (!date) continue; // 空行をスキップ
    
    // 各カテゴリのデータを縦に展開
    for (let j = 0; j < categories.length; j++) {
      const category = categories[j];
      const hours = parseFloat(row[j + 1]) || 0;
      
      verticalSheet.getRange(outputRow, 1, 1, 3).setValues([[
        date, category, hours
      ]]);
      outputRow++;
    }
  }
  
  console.log('縦持ち変換完了！');
}





/** 以降は遊び */

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
