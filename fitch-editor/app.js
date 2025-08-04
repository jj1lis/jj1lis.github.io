// アプリケーションの「状態」として，証明全体のデータを配列で管理
var proofState = [];
var nextId = 1; // 次に採番するID
// HTMLから操作対象の要素を取得
var proofContainer = document.getElementById('proof-container');
var addLineBtn = document.getElementById('add-line-btn');
var jsonOutput = document.getElementById('json-output');
var copyJsonBtn = document.getElementById('copy-json-btn');
var notification = document.getElementById('notification');
// --- 状態を変更する関数群 ---
// [Action] 新しい行を追加する
function addLine() {
    // 現在の最終行のレベルを取得する（空な場合は0）
    var lastLevel = proofState.length > 0 ? proofState[proofState.length - 1].level : 0;
    var newLine = {
        id: nextId++,
        level: lastLevel,
        formula: '',
        rule: '',
        isAssumption: false,
    };
    proofState.push(newLine);
    render(); // データを変更したので画面を再描画
}
// [Action] 指定されたIDの行を削除する
function deleteLine(id) {
    proofState = proofState.filter(function (line) { return line.id !== id; });
    render();
}
// [Action] インデントを増やす
function increaseIndent(id) {
    var line = proofState.find(function (line) { return line.id === id; });
    if (line) {
        line.level++;
        render();
    }
}
// [Action] インデントを減らす
function decreaseIndent(id) {
    var line = proofState.find(function (line) { return line.id === id; });
    if (line && line.level > 0) {
        line.level--;
        render();
    }
}
// [Action] 命題のテキストを更新する
function updateFormula(id, newFormula) {
    var line = proofState.find(function (line) { return line.id === id; });
    if (line) {
        line.formula = newFormula;
        renderJson(); // JSON出力のみ更新
    }
}
// [Action] ルールのテキストを更新する
function updateRule(id, newRule) {
    var line = proofState.find(function (line) { return line.id === id; });
    if (line) {
        line.rule = newRule;
        renderJson(); // JSON出力のみ更新
    }
}
// [Action] 仮定チェックボックスの状態を切り替える
function toggleAssumption(id) {
    var _a;
    var line = proofState.find(function (l) { return l.id === id; });
    if (line) {
        line.isAssumption = !line.isAssumption;
        // rule の値を変更
        if (line.isAssumption) {
            line.ruleBackup = line.rule;
            line.rule = '仮定';
        }
        else {
            line.rule = (_a = line.ruleBackup) !== null && _a !== void 0 ? _a : '';
            delete line.ruleBackup;
        }
        render(); // 状態が変わったので再描画
    }
}
// --- 描画関数 ---
/**
 * 内部的な状態 `proofState` をJSON出力用の形式に変換する
 * - id を 0-indexed の行番号に変換する
 */
function getOutputState() {
    return proofState.map(function (line, index) { return ({
        id: index, // 配列のインデックスをそのままIDとして使用
        level: line.level,
        formula: line.formula,
        rule: line.rule,
    }); });
}
// `proofState` の内容を元にJSON出力を更新する
function renderJson() {
    var outputState = getOutputState();
    jsonOutput.textContent = JSON.stringify(outputState, null, 2);
}
// `proofState` の内容を元に，証明全体のHTMLを描画する
// `app.ts` の既存の render 関数を、以下に置き換える
function render() {
    proofContainer.innerHTML = ''; // コンテナを一旦空にする
    proofState.forEach(function (line, index) {
        var lineEl = document.createElement('div');
        // 古い 'level-N' クラスは使わないので削除
        lineEl.className = 'proof-line';
        lineEl.dataset.lineId = line.id.toString(); // デバッグ用にIDを保持
        // --- 線の描画部分 ---
        var lineBarsContainer = document.createElement('div');
        lineBarsContainer.className = 'line-bars-container';
        // levelの数だけ縦線を追加
        for (var i = 0; i < line.level; i++) {
            var bar = document.createElement('span');
            bar.className = 'line-bar';
            lineBarsContainer.appendChild(bar);
        }
        // --- メインコンテンツ部分 ---
        var mainContent = document.createElement('div');
        mainContent.className = 'line-main-content';
        if (line.isAssumption) {
            mainContent.classList.add('assumption-line');
        }
        var checkedAttribute = line.isAssumption ? 'checked' : '';
        var ruleInputDisabled = line.isAssumption ? 'disabled' : '';
        mainContent.innerHTML = "\n        <div class=\"line-controls\">\n          <button onclick=\"decreaseIndent(".concat(line.id, ")\" title=\"\u30A4\u30F3\u30C7\u30F3\u30C8\u89E3\u9664\">\u25C0</button>\n          <button onclick=\"increaseIndent(").concat(line.id, ")\" title=\"\u30A4\u30F3\u30C7\u30F3\u30C8\">\u25B6</button>\n        </div>\n        <div class=\"line-content\">\n          <input type=\"text\" value=\"").concat(line.formula, "\" oninput=\"updateFormula(").concat(line.id, ", this.value)\" placeholder=\"\u547D\u984C\">\n          <input type=\"text\" value=\"").concat(line.rule, "\" oninput=\"updateRule(").concat(line.id, ", this.value)\" placeholder=\"\u30EB\u30FC\u30EB\" ").concat(ruleInputDisabled, ">\n        </div>\n        <div class=\"line-options\">\n          <input type=\"checkbox\" id=\"assumption-").concat(line.id, "\" onchange=\"toggleAssumption(").concat(line.id, ")\" ").concat(checkedAttribute, ">\n          <label for=\"assumption-").concat(line.id, "\">\u4EEE\u5B9A</label>\n        </div>\n        <button onclick=\"deleteLine(").concat(line.id, ")\" title=\"\u884C\u3092\u524A\u9664\">\u00D7</button>\n      ");
        // --- 要素の組み立て ---
        lineEl.appendChild(lineBarsContainer);
        lineEl.appendChild(mainContent);
        proofContainer.appendChild(lineEl);
    });
    renderJson(); // HTMLの再描画と同時にJSONも更新
}
// --- クリップボード関連 ---
// alertの代わりに通知を表示する関数
var notificationTimer;
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    // 以前のタイマーが残っていればクリア
    clearTimeout(notificationTimer);
    // 3秒後に.showクラスを削除して通知を消す
    notificationTimer = setTimeout(function () {
        notification.classList.remove('show');
    }, 3000);
}
// JSONをクリップボードにコピーする関数
function copyToClipboard() {
    var outputState = getOutputState();
    var jsonText = JSON.stringify(outputState, null, 2);
    if (jsonText) {
        navigator.clipboard.writeText(jsonText)
            .then(function () {
            showNotification('JSONをクリップボードにコピーしました');
        })
            .catch(function (err) {
            showNotification('JSONのコピーに失敗しました．');
            console.error('クリップボードへのコピーに失敗しました: ', err);
        });
    }
    else {
        alert('出力するJSONがありません。');
    }
}
// --- 初期化処理 ---
// HTML側で onclick から呼び出せるように、関数をグローバルスコープに登録
window.decreaseIndent = decreaseIndent;
window.increaseIndent = increaseIndent;
window.updateFormula = updateFormula;
window.updateRule = updateRule;
window.deleteLine = deleteLine;
window.toggleAssumption = toggleAssumption;
// 「行を追加」ボタンにクリックイベントを割り当て
addLineBtn.addEventListener('click', addLine);
copyJsonBtn.addEventListener('click', copyToClipboard);
// 起動時に最初の行を追加
addLine();
