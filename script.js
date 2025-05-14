// グローバル変数
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

// DOM要素
const roomImages = document.querySelectorAll('.room-image');
const roomSelect = document.getElementById('roomSelect');
const startDate = document.getElementById('startDate');
const startTime = document.getElementById('startTime');
const endDate = document.getElementById('endDate');
const endTime = document.getElementById('endTime');
const reserverName = document.getElementById('reserverName');
const purpose = document.getElementById('purpose');
const attendees = document.getElementById('attendees');
const isRecurring = document.getElementById('isRecurring');
const recurringOptions = document.getElementById('recurringOptions');
const recurringType = document.getElementById('recurringType');
const recurringEndDate = document.getElementById('recurringEndDate');
const reservationForm = document.getElementById('reservationForm');
const downloadCSVBtn = document.getElementById('downloadCSV');
const reservationList = document.getElementById('reservationList');
const reservationSearch = document.getElementById('reservationSearch');
const reservationRoomFilter = document.getElementById('reservationRoomFilter');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 時刻オプションの生成（30分単位）
function mtg_generate_time_options() {
    const timeSelects = [startTime, endTime];

    timeSelects.forEach(select => {
        // 既存のオプションをクリア（最初の「選択してください」は残す）
        while (select.options.length > 1) {
            select.remove(1);
        }

        // 30分単位の時刻オプションを追加（00:00～23:30）
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const formattedHour = hour.toString().padStart(2, '0');
                const formattedMinute = minute.toString().padStart(2, '0');
                const timeValue = `${formattedHour}:${formattedMinute}`;
                const timeText = `${formattedHour}:${formattedMinute}`;

                const option = document.createElement('option');
                option.value = timeValue;
                option.textContent = timeText;
                select.appendChild(option);
            }
        }
    });
}

// 日時を組み合わせる関数
function mtg_combine_date_time(dateInput, timeInput) {
    if (!dateInput.value || !timeInput.value) return '';

    const [hours, minutes] = timeInput.value.split(':');
    const date = new Date(dateInput.value);
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    return date.toISOString();
}

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

// 繰り返し予約のチェックボックス変更イベント
isRecurring.addEventListener('change', function() {
    recurringOptions.style.display = this.checked ? 'block' : 'none';
});

// フォーム送信イベント
reservationForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // バリデーション
    if (!mtg_validate_form()) {
        return;
    }

    // 日付と時刻を組み合わせる
    const startDateTime = mtg_combine_date_time(startDate, startTime);
    const endDateTime = mtg_combine_date_time(endDate, endTime);

    // 新しい予約を作成
    const newReservation = {
        id: Date.now(),
        room: roomSelect.value,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        reserverName: reserverName.value,
        purpose: purpose.value || '',
        attendees: attendees.value || '',
        isRecurring: isRecurring.checked,
        recurringType: isRecurring.checked ? recurringType.value : '',
        recurringEndDate: isRecurring.checked ? recurringEndDate.value : ''
    };

    // 繰り返し予約の処理
    if (isRecurring.checked && recurringEndDate.value) {
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        const duration = endDate.getTime() - startDate.getTime();
        const recurEnd = new Date(recurringEndDate.value);

        // 繰り返し予約を生成
        const recurReservations = mtg_generate_recurring_reservations(
            newReservation, startDate, recurEnd, duration
        );

        // 繰り返し予約を保存
        reservations = [...reservations, ...recurReservations];
    } else {
        // 単発予約を保存
        reservations.push(newReservation);
    }

    mtg_save_reservation();

    // フォームをリセット
    this.reset();
    roomImages.forEach(image => {
        image.classList.remove('selected');
    });
    recurringOptions.style.display = 'none';

    // 予約一覧を更新
    mtg_display_reservation_list();

    alert('予約が完了しました！');
});

// 繰り返し予約の生成
function mtg_generate_recurring_reservations(baseReservation, startDate, endRecurDate, duration) {
    const reservations = [];
    let currentDate = new Date(startDate);
    let interval;

    switch (baseReservation.recurringType) {
        case 'daily':
            interval = 1; // 日数
            break;
        case 'weekly':
            interval = 7; // 日数
            break;
        case 'biweekly':
            interval = 14; // 日数
            break;
        case 'monthly':
            interval = 1; // 月数（後で特別処理）
            break;
        default:
            interval = 7;
    }

    while (currentDate <= endRecurDate) {
        // 新しい予約を作成
        const startTime = new Date(currentDate);
        const endTime = new Date(startTime.getTime() + duration);

        const reservation = {
            ...baseReservation,
            id: Date.now() + Math.floor(Math.random() * 1000), // ユニークID
            startDateTime: startTime.toISOString(),
            endDateTime: endTime.toISOString()
        };

        reservations.push(reservation);

        // 次の日付を計算
        if (baseReservation.recurringType === 'monthly') {
            // 月単位の繰り返し
            currentDate.setMonth(currentDate.getMonth() + interval);
        } else {
            // 日単位の繰り返し
            currentDate.setDate(currentDate.getDate() + interval);
        }
    }

    return reservations;
}

// CSVダウンロードイベント
downloadCSVBtn.addEventListener('click', function() {
    if (reservations.length === 0) {
        alert('ダウンロードする予約データがありません。');
        return;
    }

    // CSVデータ生成
    const csvContent = mtg_generate_csv();

    // ダウンロード
    mtg_download_csv(csvContent);
});

// タブ切り替え機能
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');

        // タブボタンのアクティブ状態を切り替え
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // タブコンテンツの表示を切り替え
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// 検索とフィルター機能
reservationSearch.addEventListener('input', mtg_filter_reservations);
reservationRoomFilter.addEventListener('change', mtg_filter_reservations);

// 予約のフィルタリング
function mtg_filter_reservations() {
    const searchTerm = reservationSearch.value.toLowerCase();
    const roomFilter = reservationRoomFilter.value;

    mtg_display_reservation_list(searchTerm, roomFilter);
}

// フォームバリデーション
function mtg_validate_form() {
    let isValid = true;
    let errorMsg = '';

    // 会議室選択のチェック
    if (!roomSelect.value) {
        errorMsg += '会議室を選択してください。\n';
        isValid = false;
    }

    // 日時チェック
    if (!startDate.value) {
        errorMsg += '開始日を入力してください。\n';
        isValid = false;
    }

    if (!startTime.value) {
        errorMsg += '開始時刻を選択してください。\n';
        isValid = false;
    }

    if (!endDate.value) {
        errorMsg += '終了日を入力してください。\n';
        isValid = false;
    }

    if (!endTime.value) {
        errorMsg += '終了時刻を選択してください。\n';
        isValid = false;
    }

    // 開始・終了時刻の順序チェック
    if (startDate.value && startTime.value && endDate.value && endTime.value) {
        const startDateTime = mtg_combine_date_time(startDate, startTime);
        const endDateTime = mtg_combine_date_time(endDate, endTime);

        const start = new Date(startDateTime);
        const end = new Date(endDateTime);

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
    if (isValid && startDate.value && startTime.value && endDate.value && endTime.value && roomSelect.value) {
        const startDateTime = mtg_combine_date_time(startDate, startTime);
        const endDateTime = mtg_combine_date_time(endDate, endTime);

        const newStart = new Date(startDateTime);
        const newEnd = new Date(endDateTime);
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

    // 繰り返し予約の場合の追加チェック
    if (isValid && isRecurring.checked) {
        if (!recurringEndDate.value) {
            errorMsg += '繰り返し予約の終了日を設定してください。\n';
            isValid = false;
        } else {
            const startDt = new Date(startDate.value);
            const recurEndDt = new Date(recurringEndDate.value);

            if (recurEndDt <= startDt) {
                errorMsg += '繰り返し予約の終了日は開始日より後である必要があります。\n';
                isValid = false;
            }
        }
    }

    if (!isValid) {
        alert(errorMsg);
    }

    return isValid;
}

// 予約データをローカルストレージに保存
function mtg_save_reservation() {
    localStorage.setItem('reservations', JSON.stringify(reservations));
}

// 予約一覧を表示
function mtg_display_reservation_list(searchTerm = '', roomFilter = 'all') {
    reservationList.innerHTML = '';

    if (reservations.length === 0) {
        reservationList.innerHTML = '<p class="empty-message">予約はまだありません。<i class="fas fa-calendar-xmark"></i></p>';
        return;
    }

    // 日付順にソート
    const sortedReservations = [...reservations].sort((a, b) => {
        return new Date(a.startDateTime) - new Date(b.startDateTime);
    });

    // フィルタリング
    const filteredReservations = sortedReservations.filter(res => {
        // 部屋フィルター
        if (roomFilter !== 'all' && res.room !== roomFilter) {
            return false;
        }

        // 検索文字列
        if (searchTerm) {
            const reserverNameMatch = res.reserverName.toLowerCase().includes(searchTerm);
            const purposeMatch = res.purpose && res.purpose.toLowerCase().includes(searchTerm);
            return reserverNameMatch || purposeMatch;
        }

        return true;
    });

    if (filteredReservations.length === 0) {
        reservationList.innerHTML = '<p class="empty-message">条件に一致する予約はありません。<i class="fas fa-filter-circle-xmark"></i></p>';
        return;
    }

    filteredReservations.forEach(res => {
        const startDate = new Date(res.startDateTime);
        const endDate = new Date(res.endDateTime);

        const formattedStart = mtg_format_date_time(startDate);
        const formattedEnd = mtg_format_date_time(endDate);

        const reservationItem = document.createElement('div');
        reservationItem.className = `reservation-item room-${res.room}`;

        let recurringBadge = '';
        if (res.isRecurring) {
            let recurText = '';
            switch(res.recurringType) {
                case 'daily': recurText = '毎日'; break;
                case 'weekly': recurText = '毎週'; break;
                case 'biweekly': recurText = '隔週'; break;
                case 'monthly': recurText = '毎月'; break;
            }
            recurringBadge = `<span class="recurring-badge" title="${recurText}繰り返し"><i class="fas fa-repeat"></i></span>`;
        }

        let content = `
            <div class="reservation-header">
                <h3>会議室${res.room} ${recurringBadge}</h3>
            </div>
            <div class="reservation-details">
                <p><strong><i class="far fa-clock"></i> 日時:</strong> ${formattedStart} 〜 ${formattedEnd}</p>
                <p><strong><i class="far fa-user"></i> 予約者:</strong> ${res.reserverName}</p>
        `;

        if (res.purpose) {
            content += `<p><strong><i class="far fa-clipboard"></i> 目的:</strong> ${res.purpose}</p>`;
        }

        if (res.attendees) {
            content += `<p><strong><i class="fas fa-users"></i> 参加人数:</strong> ${res.attendees}人</p>`;
        }

        content += `<button class="delete-btn" data-id="${res.id}">キャンセル</button>`;
        content += `</div>`;

        reservationItem.innerHTML = content;

        // キャンセルボタンのイベント設定
        const deleteBtn = reservationItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const idToDelete = Number(this.getAttribute('data-id'));
            if (confirm('この予約をキャンセルしますか？')) {
                reservations = reservations.filter(r => r.id !== idToDelete);
                mtg_save_reservation();
                mtg_filter_reservations(); // フィルター適用して再表示
            }
        });

        reservationList.appendChild(reservationItem);
    });
}

// 日時のフォーマット
function mtg_format_date_time(date) {
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
function mtg_generate_csv() {
    // ヘッダー
    let csvContent = '会議室,開始日時,終了日時,予約者名,目的,参加人数,繰り返し\n';

    // データ行
    reservations.forEach(res => {
        const startDate = new Date(res.startDateTime);
        const endDate = new Date(res.endDateTime);

        const formattedStart = mtg_format_date_time(startDate);
        const formattedEnd = mtg_format_date_time(endDate);

        const recurringInfo = res.isRecurring ? res.recurringType || 'あり' : 'なし';

        const row = [
            `"会議室${res.room}"`,
            `"${formattedStart}"`,
            `"${formattedEnd}"`,
            `"${res.reserverName}"`,
            `"${res.purpose || ''}"`,
            `"${res.attendees || ''}"`,
            `"${recurringInfo}"`
        ].join(',');

        csvContent += row + '\n';
    });

    return csvContent;
}

// CSVファイルのダウンロード
function mtg_download_csv(csvContent) {
    // BOMを追加してShift-JISでも文字化けしないように
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `会議室予約_${mtg_format_filename_date(new Date())}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ファイル名用の日付フォーマット
function mtg_format_filename_date(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 読み込み時の処理
document.addEventListener('DOMContentLoaded', function() {
    // 時刻選択オプションを生成
    mtg_generate_time_options();

    // 予約一覧を表示
    mtg_display_reservation_list();

    // 現在日時を設定
    const now = new Date();
    const nowPlus1Hour = new Date(now);
    nowPlus1Hour.setHours(nowPlus1Hour.getHours() + 1);

    // 現在の日付を設定
    startDate.valueAsDate = now;
    endDate.valueAsDate = now;

    // 繰り返し予約の終了日を1週間後に設定
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    recurringEndDate.valueAsDate = oneWeekLater;

    // 時刻を30分単位で丸める
    const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
    now.setMinutes(roundedMinutes, 0, 0);

    // 現在の丸めた時刻を設定
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    startTime.value = `${currentHour}:${currentMinute}`;

    // 終了時刻（開始時刻の1時間後）を設定
    nowPlus1Hour.setMinutes(roundedMinutes, 0, 0);
    const endHour = nowPlus1Hour.getHours().toString().padStart(2, '0');
    const endMinute = nowPlus1Hour.getMinutes().toString().padStart(2, '0');
    endTime.value = `${endHour}:${endMinute}`;
});
