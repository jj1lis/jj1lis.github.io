// 1行のデータを表現する型
interface ProofLine {
  id: number;      // 各行を区別するための一意のID
  level: number;   // ネストの深さ (インデント)
  formula: string; // 命題のテキスト
  rule: string;    // 適応したルールのテキスト
  ruleBackup?: string;    // ルールのテキストのバックアップ
  isAssumption: boolean;  // それが仮定の導入であるか
}

// 証明図を表現するJSONの型
interface ProofTreeNode {
  id: number;
  rule: string;
  premises?: ProofTreeNode[];
  isAssumption: boolean;
  conclusion: string;
}

// 証明図の要素の型
type ProofTree1Element = ProofLine | ProofTree1Element[];

// アプリケーションの「状態」として，証明全体のデータを配列で管理
let proofState: ProofLine[] = [];
let nextId = 1; // 次に採番するID

// HTMLから操作対象の要素を取得
const proofContainer = document.getElementById('proof-container')!;
const addLineBtn = document.getElementById('add-line-btn')!;
const jsonOutput = document.getElementById('json-output')!;
const copyJsonBtn = document.getElementById('copy-json-btn')!;
const notification = document.getElementById('notification')!;

// --- 状態を変更する関数群 ---

// [Action] 新しい行を追加する
function addLine() {
  // 現在の最終行のレベルを取得する（空な場合は0）
  const lastLevel = proofState.length > 0 ? proofState[proofState.length - 1].level : 0;
  const newLine: ProofLine = {
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
function deleteLine(id: number) {
  proofState = proofState.filter(line => line.id !== id);
  render();
}

// [Action] インデントを増やす
function increaseIndent(id: number) {
  const line = proofState.find(line => line.id === id);
  if (line) {
    line.level++;
    render();
  }
}

// [Action] インデントを減らす
function decreaseIndent(id: number) {
  const line = proofState.find(line => line.id === id);
  if (line && line.level > 0) {
    line.level--;
    render();
  }
}

// [Action] 命題のテキストを更新する
function updateFormula(id: number, newFormula: string) {
  const line = proofState.find(line => line.id === id);
  if (line) {
    line.formula = newFormula;
    renderJson(); // JSON出力のみ更新
  }
}

// [Action] ルールのテキストを更新する
function updateRule(id: number, newRule: string) {
  const line = proofState.find(line => line.id === id);
  if (line) {
    line.rule = newRule;
    renderJson(); // JSON出力のみ更新
  }
}

// [Action] 仮定チェックボックスの状態を切り替える
function toggleAssumption(id: number) {
  const line = proofState.find(l => l.id === id);
  if (line) {
    line.isAssumption = !line.isAssumption;

    // rule の値を変更
    if (line.isAssumption) {
      line.ruleBackup = line.rule;
      line.rule = '仮定';
    } else {
      line.rule = line.ruleBackup ?? '';
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
  return proofState.map((line, index) => ({
    id: index, // 配列のインデックスをそのままIDとして使用
    level: line.level,
    formula: line.formula,
    rule: line.rule,
  }));
}

// 行をただ1つの要素からなる木に変換する
function makeTree(line: ProofLine) : ProofTreeNode {
  const ret : ProofTreeNode = {
    id: line.id,
    rule: line.rule,
    premises: [],
    isAssumption: line.isAssumption,
    conclusion: line.formula
  } 
  return ret;
}

// 状態を木に変換する
function convertStateToTree01(state : ProofLine[], baseLevel : number) // : ProofTree | undefined {
{
  if (state.length == 0) {
    return undefined;
  }
  let tree : ProofTree1Element[] = [];
  for (let i : number = 0; i < state.length; i++) {
    if (state[i].level == baseLevel) {
      tree.push(state[i]);
      continue;
    }
    let j = i;
    while (j < state.length && baseLevel < state[j].level) {
      j++;
    }
    const sub = convertStateToTree01(state.slice(i, j), baseLevel + 1);
    if (sub != undefined) {
      tree.push(sub);
    }
    i = j - 1;
  }
  return tree;
}

// 状態を木に変換する
function convertStateToTree02(state : ProofLine[], baseLevel : number) // : ProofTree | undefined {
{
  const last = state.pop();
  if (last === undefined) {
    return undefined;
  } else if (last.level != baseLevel) {
    return undefined;
  }
  
  const tree : ProofTreeNode = {
    id: last.id,
    rule: last.rule,
    isAssumption: last.isAssumption,
    conclusion: last.formula,
  };
  return state.concat([last]);
}


// `proofState` の内容を元にJSON出力を更新する
function renderJson() {
    // const outputState = getOutputState();
    // jsonOutput.textContent = JSON.stringify(outputState, null, 2);
    jsonOutput.textContent = JSON.stringify(convertStateToTree01([...proofState], 0), null, 2);
}

// `proofState` の内容を元に，証明全体のHTMLを描画する
// `app.ts` の既存の render 関数を、以下に置き換える
function render() {
  proofContainer.innerHTML = ''; // コンテナを一旦空にする

  proofState.forEach((line, index) => {
    const lineEl = document.createElement('div');
    // 古い 'level-N' クラスは使わないので削除
    lineEl.className = 'proof-line'; 
    lineEl.dataset.lineId = line.id.toString(); // デバッグ用にIDを保持

    // --- 線の描画部分 ---
    const lineBarsContainer = document.createElement('div');
    lineBarsContainer.className = 'line-bars-container';

    // levelの数だけ縦線を追加
    for (let i = 0; i < line.level; i++) {
        const bar = document.createElement('span');
        bar.className = 'line-bar';
        lineBarsContainer.appendChild(bar);
    }
    
    // --- メインコンテンツ部分 ---
    const mainContent = document.createElement('div');
    mainContent.className = 'line-main-content';
    if (line.isAssumption) {
      mainContent.classList.add('assumption-line');
    }
    const checkedAttribute = line.isAssumption ? 'checked' : '';
    const ruleInputDisabled = line.isAssumption ? 'disabled' : '';
      mainContent.innerHTML = `
        <div class="line-controls">
          <button onclick="decreaseIndent(${line.id})" title="インデント解除">◀</button>
          <button onclick="increaseIndent(${line.id})" title="インデント">▶</button>
        </div>
        <div class="line-content">
          <input type="text" value="${line.formula}" oninput="updateFormula(${line.id}, this.value)" placeholder="命題">
          <input type="text" value="${line.rule}" oninput="updateRule(${line.id}, this.value)" placeholder="ルール" ${ruleInputDisabled}>
        </div>
        <div class="line-options">
          <input type="checkbox" id="assumption-${line.id}" onchange="toggleAssumption(${line.id})" ${checkedAttribute}>
          <label for="assumption-${line.id}">仮定</label>
        </div>
        <button onclick="deleteLine(${line.id})" title="行を削除">×</button>
      `;

    // --- 要素の組み立て ---
    lineEl.appendChild(lineBarsContainer);
    lineEl.appendChild(mainContent);
    proofContainer.appendChild(lineEl);
  });

  renderJson(); // HTMLの再描画と同時にJSONも更新
}

// --- クリップボード関連 ---

// alertの代わりに通知を表示する関数
let notificationTimer: number;
function showNotification(message: string) {
  notification.textContent = message;
  notification.classList.add('show');

  // 以前のタイマーが残っていればクリア
  clearTimeout(notificationTimer);

  // 3秒後に.showクラスを削除して通知を消す
  notificationTimer = setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// JSONをクリップボードにコピーする関数
function copyToClipboard() {
    const outputState = getOutputState();
    const jsonText = JSON.stringify(outputState, null, 2);
    if (jsonText) {
        navigator.clipboard.writeText(jsonText)
            .then(() => {
                showNotification('JSONをクリップボードにコピーしました')
            })
            .catch(err => {
                showNotification('JSONのコピーに失敗しました．')
                console.error('クリップボードへのコピーに失敗しました: ', err)
            });
    } else {
        alert('出力するJSONがありません。');
    }
}

// --- 初期化処理 ---

// HTML側で onclick から呼び出せるように、関数をグローバルスコープに登録
(window as any).decreaseIndent = decreaseIndent;
(window as any).increaseIndent = increaseIndent;
(window as any).updateFormula = updateFormula;
(window as any).updateRule = updateRule;
(window as any).deleteLine = deleteLine;
(window as any).toggleAssumption = toggleAssumption;

// 「行を追加」ボタンにクリックイベントを割り当て
addLineBtn.addEventListener('click', addLine);
copyJsonBtn.addEventListener('click', copyToClipboard);

// 起動時に最初の行を追加
addLine();
