// グローバル変数
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

// DOM要素
const roomImages = document.querySelectorAll('.room-image');
const roomSelect = document.getElementById('roomSelect');
const startDateTime = document.getElementById('startDateTime');
const endDateTime = document.getElementById('endDateTime');
const reserverName = document.getElementById('reserverName');
const reservationForm = document.getElementById('reservationForm');
const downloadCSVBtn = document.getElementById('downloadCSV');
const reservationList = document.getElementById('reservationList');

// 画像クリックイベント
roomImages.forEach(img => {
    img.addEventListener('click', function() {
        // すべての画像から選択状態を解除
        roomImages.forEach(image => {
            image.classList.remove('selected');
        });

        // クリックされた画像を選択状態に
        this.classList.add('selected');

        // プルダウンメニューの値を更新
        const roomValue = this.getAttribute('data-room');
        roomSelect.value = roomValue;
    });
});

// プルダウン変更時のイベント
roomSelect.addEventListener('change', function() {
    const selectedRoom = this.value;

    // すべての画像から選択状態を解除
    roomImages.forEach(image => {
        image.classList.remove('selected');
    });

    // 選択された会議室の画像を選択状態に
    if (selectedRoom) {
        const targetImage = document.getElementById(`room${selectedRoom}`);
        if (targetImage) {
            targetImage.classList.add('selected');
        }
    }
});

// フォーム送信イベント
reservationForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // バリデーション
    if (!validateForm()) {
        return;
    }

    // 新しい予約を作成
    const newReservation = {
        id: Date.now(),
        room: roomSelect.value,
        startDateTime: startDateTime.value,
        endDateTime: endDateTime.value,
        reserverName: reserverName.value
    };

    // 予約を保存
    reservations.push(newReservation);
    saveReservations();

    // フォームをリセット
    this.reset();
    roomImages.forEach(image => {
        image.classList.remove('selected');
    });

    // 予約一覧を更新
    renderReservationList();

    alert('予約が完了しました！');
});

// CSVダウンロードイベント
downloadCSVBtn.addEventListener('click', function() {
    if (reservations.length === 0) {
        alert('ダウンロードする予約データがありません。');
        return;
    }

    // CSVデータ生成
    const csvContent = generateCSV();

    // ダウンロード
    downloadCSV(csvContent);
});

// フォームバリデーション
function validateForm() {
    let isValid = true;
    let errorMsg = '';

    // 会議室選択のチェック
    if (!roomSelect.value) {
        errorMsg += '会議室を選択してください。\n';
        isValid = false;
    }

    // 日時チェック
    if (!startDateTime.value) {
        errorMsg += '開始日時を入力してください。\n';
        isValid = false;
    }

    if (!endDateTime.value) {
        errorMsg += '終了日時を入力してください。\n';
        isValid = false;
    }

    // 開始・終了時刻の順序チェック
    if (startDateTime.value && endDateTime.value) {
        const start = new Date(startDateTime.value);
        const end = new Date(endDateTime.value);

        if (start >= end) {
            errorMsg += '終了日時は開始日時より後である必要があります。\n';
            isValid = false;
        }
    }

    // 予約者名のチェック
    if (!reserverName.value.trim()) {
        errorMsg += '予約者名を入力してください。\n';
        isValid = false;
    }

    // 時間の重複チェック
    if (isValid && startDateTime.value && endDateTime.value && roomSelect.value) {
        const newStart = new Date(startDateTime.value);
        const newEnd = new Date(endDateTime.value);
        const selectedRoom = roomSelect.value;

        // 同じ会議室で時間が重複している予約をチェック
        const conflict = reservations.some(res => {
            if (res.room !== selectedRoom) return false;

            const resStart = new Date(res.startDateTime);
            const resEnd = new Date(res.endDateTime);

            // 時間の重複チェック
            return (newStart < resEnd && newEnd > resStart);
        });

        if (conflict) {
            errorMsg += '選択した時間帯は既に予約されています。\n';
            isValid = false;
        }
    }

    if (!isValid) {
        alert(errorMsg);
    }

    return isValid;
}

// 予約データをローカルストレージに保存
function saveReservations() {
    localStorage.setItem('reservations', JSON.stringify(reservations));
}

// 予約一覧を表示
function renderReservationList() {
    reservationList.innerHTML = '';

    if (reservations.length === 0) {
        reservationList.innerHTML = '<p>予約はまだありません。</p>';
        return;
    }

    // 日付順にソート
    const sortedReservations = [...reservations].sort((a, b) => {
        return new Date(a.startDateTime) - new Date(b.startDateTime);
    });

    sortedReservations.forEach(res => {
        const startDate = new Date(res.startDateTime);
        const endDate = new Date(res.endDateTime);

        const formattedStart = formatDateTime(startDate);
        const formattedEnd = formatDateTime(endDate);

        const reservationItem = document.createElement('div');
        reservationItem.className = 'reservation-item';
        reservationItem.innerHTML = `
            <p><strong>会議室:</strong> ${res.room}</p>
            <p><strong>開始:</strong> ${formattedStart}</p>
            <p><strong>終了:</strong> ${formattedEnd}</p>
            <p><strong>予約者:</strong> ${res.reserverName}</p>
            <button class="delete-btn" data-id="${res.id}">キャンセル</button>
        `;

        // キャンセルボタンのイベント設定
        const deleteBtn = reservationItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const idToDelete = Number(this.getAttribute('data-id'));
            if (confirm('この予約をキャンセルしますか？')) {
                reservations = reservations.filter(r => r.id !== idToDelete);
                saveReservations();
                renderReservationList();
            }
        });

        reservationList.appendChild(reservationItem);
    });
}

// 日時のフォーマット
function formatDateTime(date) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return date.toLocaleString('ja-JP', options);
}

// CSV生成
function generateCSV() {
    // ヘッダー
    let csvContent = '会議室,開始日時,終了日時,予約者名\n';

    // データ行
    reservations.forEach(res => {
        const row = [
            `"会議室${res.room}"`,
            `"${res.startDateTime.replace('T', ' ')}"`,
            `"${res.endDateTime.replace('T', ' ')}"`,
            `"${res.reserverName}"`
        ].join(',');

        csvContent += row + '\n';
    });

    return csvContent;
}

// CSVファイルのダウンロード
function downloadCSV(csvContent) {
    // BOMを追加してShift-JISでも文字化けしないように
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `会議室予約_${formatDateForFilename(new Date())}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ファイル名用の日付フォーマット
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 読み込み時に予約一覧を表示
document.addEventListener('DOMContentLoaded', function() {
    renderReservationList();

    // 現在時刻を反映
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getMinutes() % 30, 0, 0); // 30分単位に丸める

    const formattedNow = now.toISOString().slice(0, 16);
    startDateTime.value = formattedNow;

    // 終了時刻は開始時刻の1時間後
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    const formattedOneHourLater = oneHourLater.toISOString().slice(0, 16);
    endDateTime.value = formattedOneHourLater;
});
