// 전역 변수
let currentCategory = 'chansongga';
let loadedImages = new Set();

// DOM 요소
const hymnContainer = document.getElementById('hymnContainer');
const currentCategoryTitle = document.getElementById('currentCategory');
const categorySelect = document.getElementById('categorySelect');
const hymnNumberInput = document.getElementById('hymnNumber');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');

// 카테고리 설정
const categories = {
    chansongga: {
        name: '찬송가',
        total: 559,
        folder: 'chansongga'
    },
    eunhae: {
        name: '은혜찬송',
        total: 308,
        folder: 'eunhae'
    }
};

// 카테고리 선택
categorySelect.addEventListener('change', (e) => {
    switchCategory(e.target.value);
});

function switchCategory(category) {
    currentCategory = category;
    currentCategoryTitle.textContent = categories[category].name;
    categorySelect.value = category;
    
    hymnNumberInput.max = categories[category].total;
    hymnNumberInput.placeholder = `번호 (1-${categories[category].total})`;
    
    // 카테고리 변경 시 초기화
    hymnContainer.innerHTML = '';
    loadedImages.clear();
    showWelcomeMessage();
}

// 환영 메시지 표시
function showWelcomeMessage() {
    hymnContainer.innerHTML = `
        <div style="
            text-align: center;
            padding: 60px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            color: white;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        ">
            <div style="font-size: 64px; margin-bottom: 20px;">🎵</div>
            <h2 style="font-size: 32px; margin-bottom: 16px; font-weight: 800;">
                ${categories[currentCategory].name}
            </h2>
            <p style="font-size: 20px; opacity: 0.9; margin-bottom: 30px; line-height: 1.6;">
                찾으시는 찬송가 번호를 입력하거나<br>
                왼쪽 메뉴에서 선택해주세요
            </p>
            <div style="
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 20px 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            ">
                <p style="font-size: 18px; margin: 0;">
                    1번 ~ ${categories[currentCategory].total}번
                </p>
            </div>
        </div>
    `;
}

// 찬송가 범위 로드 (검색 시)
function loadHymnRange(startNumber) {
    console.log(`🔍 ${startNumber}번 검색 시작`);
    const startTime = performance.now();
    
    loading.classList.add('active');
    hymnContainer.innerHTML = '';
    
    const folder = categories[currentCategory].folder;
    const total = categories[currentCategory].total;
    
    // 시작 번호와 다음 번호만 로드 (최대 2페이지)
    const numbersToLoad = [startNumber];
    if (startNumber < total) {
        numbersToLoad.push(startNumber + 1);
    }
    
    // 컨테이너 생성
    numbersToLoad.forEach(number => {
        const container = createHymnContainer(number);
        hymnContainer.appendChild(container);
    });
    
    // 이미지 로드
    let loadedCount = 0;
    numbersToLoad.forEach((number, index) => {
        setTimeout(() => {
            const imgStartTime = performance.now();
            loadHymnImage(number, folder, () => {
                const imgEndTime = performance.now();
                console.log(`✅ ${number}번 로드 완료: ${(imgEndTime - imgStartTime).toFixed(0)}ms`);
                
                loadedCount++;
                if (loadedCount === numbersToLoad.length) {
                    loading.classList.remove('active');
                    
                    const endTime = performance.now();
                    console.log(`🎉 전체 로딩 완료: ${(endTime - startTime).toFixed(0)}ms`);
                    
                    // 첫 번째 찬송가로 스크롤
                    const firstHymn = document.querySelector(`[data-hymn-number="${startNumber}"]`);
                    if (firstHymn) {
                        firstHymn.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        }, index * 50); // 50ms로 줄임
    });
}

// 찬송가 컨테이너 생성
function createHymnContainer(number) {
    const container = document.createElement('div');
    container.className = 'hymn-item';
    container.dataset.hymnNumber = number;
    container.style.minHeight = '400px';
    
    // 로딩 플레이스홀더
    const placeholder = document.createElement('div');
    placeholder.className = 'hymn-loading';
    placeholder.innerHTML = `⏳<br><br>${number}번<br>로딩중...`;
    placeholder.style.cssText = `
        width: 100%;
        height: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f5f7fa 0%, #e3e8ef 100%);
        color: #718096;
        font-size: 20px;
        font-weight: 600;
        animation: pulse 2s ease-in-out infinite;
    `;
    container.appendChild(placeholder);
    
    return container;
}

// 찬송가 이미지 로드
function loadHymnImage(number, folder, callback) {
    const container = document.querySelector(`[data-hymn-number="${number}"]`);
    if (!container || loadedImages.has(number)) {
        if (callback) callback();
        return;
    }
    
    const categoryName = categories[currentCategory].name;
    const patterns = generateFilePatterns(number, categoryName);
    
    tryLoadWithPatterns(container, folder, number, patterns, 0, callback);
}

// 파일명 패턴 생성 - ⚡ 최적화: 최소한의 패턴만!
function generateFilePatterns(number, categoryName) {
    const patterns = [];
    
    // ⭐ 1순위: 단일 파일 (가장 흔한 케이스)
    patterns.push({ file: `${number}.jpeg`, type: 'single', range: [number] });
    patterns.push({ file: `${number}.jpg`, type: 'single', range: [number] });
    
    // 2순위: 2-3개 합본 (일반적)
    const start2 = Math.max(1, number - 1);
    const end2 = Math.min(categories[currentCategory].total, number + 1);
    
    for (let s = start2; s <= number; s++) {
        for (let e = number; e <= end2; e++) {
            if (s < e && (e - s) <= 2) {
                patterns.push({ 
                    file: `${s}-${e}.jpeg`, 
                    type: 'combined', 
                    range: Array.from({length: e - s + 1}, (_, i) => s + i)
                });
                patterns.push({ 
                    file: `${s}-${e}.jpg`, 
                    type: 'combined', 
                    range: Array.from({length: e - s + 1}, (_, i) => s + i)
                });
            }
        }
    }
    
    console.log(`📋 ${number}번 패턴: ${patterns.length}개`);
    return patterns;
}

// 패턴들로 이미지 로드 시도
function tryLoadWithPatterns(container, folder, number, patterns, index, callback) {
    if (index >= patterns.length) {
        // 모든 패턴 실패 - placeholder
        console.warn(`❌ ${number}번: ${patterns.length}개 패턴 모두 실패`);
        const placeholder = document.createElement('div');
        placeholder.className = 'hymn-placeholder';
        placeholder.innerHTML = `📷<br><br>${number}번<br>이미지 없음`;
        container.innerHTML = '';
        container.appendChild(placeholder);
        container.style.minHeight = '';
        loadedImages.add(number);
        if (callback) callback();
        return;
    }
    
    const pattern = patterns[index];
    const testImg = new Image();
    const imgLoadStart = performance.now();
    testImg.src = `images/${folder}/${pattern.file}`;
    
    testImg.onload = function() {
        const imgLoadEnd = performance.now();
        console.log(`✅ ${number}번 [${index + 1}/${patterns.length}] 성공: ${pattern.file} (${(imgLoadEnd - imgLoadStart).toFixed(0)}ms)`);
        
        // 합본 처리
        if (pattern.type === 'combined') {
            const alreadyLoaded = pattern.range.some(num => loadedImages.has(num) && num !== number);
            
            if (alreadyLoaded) {
                container.style.display = 'none';
                if (callback) callback();
                return;
            }
            
            pattern.range.forEach(num => {
                loadedImages.add(num);
            });
            
            container.dataset.hymnNumber = pattern.range[0];
        } else {
            loadedImages.add(number);
        }
        
        // 이미지 표시
        const img = document.createElement('img');
        img.className = 'hymn-image';
        img.src = this.src;
        img.alt = pattern.type === 'combined' ? 
            `${pattern.range[0]}-${pattern.range[pattern.range.length-1]}번` : 
            `${number}번`;
        img.loading = 'lazy';
        container.innerHTML = '';
        container.appendChild(img);
        container.style.minHeight = '';
        
        // 단일 파일인 경우에만 추가 페이지 로드
        if (pattern.type === 'single') {
            loadAdditionalPages(container, folder, number, 1, callback);
        } else {
            if (callback) callback();
        }
    };
    
    testImg.onerror = function() {
        // 실패는 로그 안 남김 (너무 많음)
        // 다음 패턴 시도
        tryLoadWithPatterns(container, folder, number, patterns, index + 1, callback);
    };
}

// 추가 페이지 로드 - ⚡ 타임아웃 추가
function loadAdditionalPages(container, folder, number, pageNum, finalCallback) {
    const categoryName = categories[currentCategory].name;
    
    // 최대 2개 추가 페이지만 (대부분 찬송가는 2페이지 이내)
    if (pageNum > 2) {
        if (finalCallback) finalCallback();
        return;
    }
    
    const filenames = [
        `${number}-${pageNum}.jpeg`,
        `${number}-${pageNum}.jpg`,
    ];
    
    tryLoadAdditionalPage(container, folder, number, pageNum, filenames, 0, finalCallback);
}

function tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index, finalCallback) {
    if (index >= filenames.length) {
        // 더 이상 추가 페이지 없음
        if (finalCallback) finalCallback();
        return;
    }
    
    const filename = filenames[index];
    const testImg = new Image();
    
    // ⚡ 타임아웃 설정: 500ms 내에 로드 안 되면 포기
    let timeoutId;
    let hasResponded = false;
    
    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        hasResponded = true;
    };
    
    timeoutId = setTimeout(() => {
        if (!hasResponded) {
            console.log(`⏱️ ${number}-${pageNum} 타임아웃 (${filename})`);
            cleanup();
            // 다음 파일명 시도
            tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index + 1, finalCallback);
        }
    }, 500);
    
    testImg.src = `images/${folder}/${filename}`;
    
    testImg.onload = function() {
        if (hasResponded) return;
        cleanup();
        
        console.log(`✅ ${number}-${pageNum} 추가 페이지 로드 성공`);
        
        const img = document.createElement('img');
        img.className = 'hymn-image';
        img.src = this.src;
        img.alt = `${number}번 (${pageNum + 1}페이지)`;
        img.loading = 'lazy';
        container.appendChild(img);
        
        // 다음 페이지 시도
        loadAdditionalPages(container, folder, number, pageNum + 1, finalCallback);
    };
    
    testImg.onerror = function() {
        if (hasResponded) return;
        cleanup();
        
        // 다음 파일명 시도
        tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index + 1, finalCallback);
    };
}

// 검색 기능
searchBtn.addEventListener('click', searchHymn);
hymnNumberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchHymn();
    }
});

function searchHymn() {
    const number = parseInt(hymnNumberInput.value);
    const maxNumber = categories[currentCategory].total;
    
    if (!number || number < 1 || number > maxNumber) {
        showAlert(`번호를 확인해주세요<br><br>${categories[currentCategory].name}은(는)<br>1번부터 ${maxNumber}번까지 있습니다.`);
        return;
    }
    
    // 찬송가 로드
    loadHymnRange(number);
    hymnNumberInput.value = '';
}

function showAlert(message) {
    const overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999;
    `;
    
    const alertMsg = document.createElement('div');
    alertMsg.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 32px; border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10000;
        text-align: center; font-size: 24px; font-weight: 700;
        line-height: 1.6; max-width: 90%;
    `;
    alertMsg.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <div style="color: #2d3748;">${message}</div>
        <button style="
            margin-top: 20px; padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 12px;
            font-size: 22px; font-weight: 700; cursor: pointer;
        ">확인</button>
    `;
    
    overlayEl.onclick = () => {
        overlayEl.remove();
        alertMsg.remove();
    };
    
    alertMsg.querySelector('button').onclick = () => {
        overlayEl.remove();
        alertMsg.remove();
    };
    
    document.body.appendChild(overlayEl);
    document.body.appendChild(alertMsg);
}

// 초기 로드
hymnNumberInput.max = categories[currentCategory].total;
hymnNumberInput.placeholder = `번호 (1-${categories[currentCategory].total})`;
showWelcomeMessage();

// 맨 위로 버튼
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.id = 'scrollToTop';
scrollToTopBtn.innerHTML = '⬆<br>맨위로';
scrollToTopBtn.style.cssText = `
    position: fixed; bottom: 30px; right: 30px;
    width: 70px; height: 70px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; border: none; border-radius: 50%;
    font-size: 14px; font-weight: 700; cursor: pointer;
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    z-index: 998; opacity: 0; visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s, transform 0.2s;
    line-height: 1.3; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
`;

document.body.appendChild(scrollToTopBtn);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollToTopBtn.style.opacity = '1';
        scrollToTopBtn.style.visibility = 'visible';
    } else {
        scrollToTopBtn.style.opacity = '0';
        scrollToTopBtn.style.visibility = 'hidden';
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

scrollToTopBtn.addEventListener('mousedown', () => {
    scrollToTopBtn.style.transform = 'scale(0.95)';
});

scrollToTopBtn.addEventListener('mouseup', () => {
    scrollToTopBtn.style.transform = 'scale(1)';
});

scrollToTopBtn.addEventListener('touchstart', () => {
    scrollToTopBtn.style.transform = 'scale(0.95)';
});

scrollToTopBtn.addEventListener('touchend', () => {
    scrollToTopBtn.style.transform = 'scale(1)';
});
