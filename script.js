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
                검색해주세요
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
    
    // 항상 화면 초기화
    hymnContainer.innerHTML = '';
    loadedImages.clear();
    
    const folder = categories[currentCategory].folder;
    const total = categories[currentCategory].total;
    
    // 1단계: 검색한 번호 컨테이너 생성
    const mainContainer = createHymnContainer(startNumber);
    hymnContainer.appendChild(mainContainer);
    
    // 2단계: 검색한 번호 로드
    loadHymnImage(startNumber, folder, (loadedRange) => {
        const mainLoadTime = performance.now();
        console.log(`✅ ${startNumber}번 로드 완료: ${(mainLoadTime - startTime).toFixed(0)}ms`);
        console.log(`📦 로드된 범위: ${loadedRange.join(', ')}`);
        
        // 3단계: 로드된 파일의 마지막 번호 다음을 로드
        const lastNumber = Math.max(...loadedRange);
        const nextNumber = lastNumber + 1;
        
        if (nextNumber <= total) {
            console.log(`➡️ 다음 파일 ${nextNumber}번 로드 시작`);
            
            const nextContainer = createHymnContainer(nextNumber);
            hymnContainer.appendChild(nextContainer);
            
            loadHymnImage(nextNumber, folder, (nextRange) => {
                const endTime = performance.now();
                console.log(`✅ ${nextNumber}번 로드 완료`);
                console.log(`📦 로드된 범위: ${nextRange.join(', ')}`);
                console.log(`🎉 전체 로딩 완료: ${(endTime - startTime).toFixed(0)}ms`);
                
                loading.classList.remove('active');
                
                // 검색한 번호로 스크롤
                const firstHymn = document.querySelector(`[data-hymn-number="${startNumber}"]`);
                if (firstHymn) {
                    firstHymn.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        } else {
            // 마지막 번호인 경우
            loading.classList.remove('active');
            console.log(`🎉 전체 로딩 완료: ${(mainLoadTime - startTime).toFixed(0)}ms`);
            
            const firstHymn = document.querySelector(`[data-hymn-number="${startNumber}"]`);
            if (firstHymn) {
                firstHymn.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
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

// 찬송가 이미지 로드 - callback에 로드된 범위를 반환
function loadHymnImage(number, folder, callback) {
    const container = document.querySelector(`[data-hymn-number="${number}"]`);
    if (!container) {
        if (callback) callback([number]);
        return;
    }
    
    const categoryName = categories[currentCategory].name;
    const patterns = generateFilePatterns(number, categoryName);
    
    tryLoadWithPatterns(container, folder, number, patterns, 0, callback);
}

// 파일명 패턴 생성
function generateFilePatterns(number, categoryName) {
    const patterns = [];
    const maxNumber = categories[currentCategory].total;
    
    // ⭐ 특수 케이스: 551-556 (유일한 6개 합본)
    if (number >= 551 && number <= 556 && currentCategory === 'chansongga') {
        patterns.push({ 
            file: '551-556.jpeg', 
            type: 'combined', 
            range: [551, 552, 553, 554, 555, 556]
        });
        patterns.push({ 
            file: '551-556.jpg', 
            type: 'combined', 
            range: [551, 552, 553, 554, 555, 556]
        });
    }
    
    // 1순위: 단일 파일
    patterns.push({ file: `${number}.jpeg`, type: 'single', range: [number] });
    patterns.push({ file: `${number}.jpg`, type: 'single', range: [number] });
    
    // 2순위: 2개 합본 - 앞 번호와
    if (number > 1) {
        patterns.push({ 
            file: `${number - 1}-${number}.jpeg`, 
            type: 'combined', 
            range: [number - 1, number]
        });
        patterns.push({ 
            file: `${number - 1}-${number}.jpg`, 
            type: 'combined', 
            range: [number - 1, number]
        });
    }
    
    // 3순위: 2개 합본 - 뒤 번호와
    if (number < maxNumber) {
        patterns.push({ 
            file: `${number}-${number + 1}.jpeg`, 
            type: 'combined', 
            range: [number, number + 1]
        });
        patterns.push({ 
            file: `${number}-${number + 1}.jpg`, 
            type: 'combined', 
            range: [number, number + 1]
        });
    }
    
    console.log(`📋 ${number}번 패턴: ${patterns.length}개`);
    return patterns;
}

// 패턴들로 이미지 로드 시도
function tryLoadWithPatterns(container, folder, number, patterns, index, callback) {
    if (index >= patterns.length) {
        // 모든 패턴 실패
        console.warn(`❌ ${number}번: 이미지 없음`);
        const placeholder = document.createElement('div');
        placeholder.className = 'hymn-placeholder';
        placeholder.innerHTML = `📷<br><br>${number}번<br>이미지 없음`;
        container.innerHTML = '';
        container.appendChild(placeholder);
        container.style.minHeight = '';
        if (callback) callback([number]); // 범위는 자기 자신만
        return;
    }
    
    const pattern = patterns[index];
    const testImg = new Image();
    const imgLoadStart = performance.now();
    
    // 타임아웃
    let timeoutId;
    let hasResponded = false;
    
    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        hasResponded = true;
    };
    
    timeoutId = setTimeout(() => {
        if (!hasResponded) {
            cleanup();
            tryLoadWithPatterns(container, folder, number, patterns, index + 1, callback);
        }
    }, 200);
    
    testImg.src = `images/${folder}/${pattern.file}`;
    
    testImg.onload = function() {
        if (hasResponded) return;
        cleanup();
        
        const imgLoadEnd = performance.now();
        console.log(`✅ ${number}번 [${index + 1}/${patterns.length}] 성공: ${pattern.file} (${(imgLoadEnd - imgLoadStart).toFixed(0)}ms)`);
        
        // 합본 처리
        if (pattern.type === 'combined') {
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
            loadAdditionalPages(container, folder, number, 1, () => {
                // 추가 페이지가 있으면 range 확장
                const additionalPages = container.querySelectorAll('.hymn-image').length - 1;
                const finalRange = [number];
                if (callback) callback(finalRange);
            });
        } else {
            if (callback) callback(pattern.range);
        }
    };
    
    testImg.onerror = function() {
        if (hasResponded) return;
        cleanup();
        tryLoadWithPatterns(container, folder, number, patterns, index + 1, callback);
    };
}

// 추가 페이지 로드
function loadAdditionalPages(container, folder, number, pageNum, finalCallback) {
    if (pageNum > 1) {
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
        if (finalCallback) finalCallback();
        return;
    }
    
    const filename = filenames[index];
    const testImg = new Image();
    
    let timeoutId;
    let hasResponded = false;
    
    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        hasResponded = true;
    };
    
    timeoutId = setTimeout(() => {
        if (!hasResponded) {
            cleanup();
            tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index + 1, finalCallback);
        }
    }, 200);
    
    testImg.src = `images/${folder}/${filename}`;
    
    testImg.onload = function() {
        if (hasResponded) return;
        cleanup();
        
        console.log(`✅ ${number}-${pageNum} 추가 페이지 성공`);
        
        const img = document.createElement('img');
        img.className = 'hymn-image';
        img.src = this.src;
        img.alt = `${number}번 (2페이지)`;
        img.loading = 'lazy';
        container.appendChild(img);
        
        if (finalCallback) finalCallback();
    };
    
    testImg.onerror = function() {
        if (hasResponded) return;
        cleanup();
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
