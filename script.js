// 전역 변수
let currentCategory = 'chansongga';
let loadedImages = new Set();
let currentHymnNumber = null; // 현재 표시 중인 찬송가 번호

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
    currentHymnNumber = null; // ⭐ 번호 초기화
    updateNavButtons(); // ⭐ 버튼 비활성화
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

// 찬송가 범위 로드 (검색 시) - ⭐ 파일 범위 기반!
function loadHymnRange(startNumber) {
    console.log(`🔍 ${startNumber}번 검색 시작`);
    const startTime = performance.now();
    
    currentHymnNumber = startNumber; // ⭐ 현재 번호 저장
    updateNavButtons(); // ⭐ 이전/다음 버튼 상태 업데이트
    
    loading.classList.add('active');
    
    // 항상 화면 초기화
    hymnContainer.innerHTML = '';
    loadedImages.clear();
    
    const folder = categories[currentCategory].folder;
    const total = categories[currentCategory].total;
    
    // 1단계: 검색한 번호 컨테이너 생성
    const mainContainer = createHymnContainer(startNumber);
    hymnContainer.appendChild(mainContainer);
    
    // 2단계: 검색한 번호 로드 (병렬 검색)
    loadHymnImage(startNumber, folder, (loadedRange, hasAdditionalPage) => {
        const mainLoadTime = performance.now();
        console.log(`✅ ${startNumber}번 로드 완료: ${(mainLoadTime - startTime).toFixed(0)}ms`);
        console.log(`📦 로드된 범위: ${loadedRange.join(', ')}`);
        console.log(`📄 추가 페이지(-1) 존재: ${hasAdditionalPage}`);
        
        // 3단계: 추가 페이지가 없을 때만 다음 번호 로드
        if (!hasAdditionalPage) {
            const lastNumber = Math.max(...loadedRange);
            const nextNumber = lastNumber + 1;
            
            if (nextNumber <= total) {
                console.log(`➡️ 다음 파일 ${nextNumber}번 로드 시작`);
                
                const nextContainer = createHymnContainer(nextNumber);
                hymnContainer.appendChild(nextContainer);
                
                loadHymnImage(nextNumber, folder, (nextRange, hasAdditional) => {
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
                }, false); // ⭐ 두 번째 페이지는 추가 페이지 체크 안 함
            } else {
                // 마지막 번호인 경우
                loading.classList.remove('active');
                console.log(`🎉 전체 로딩 완료: ${(mainLoadTime - startTime).toFixed(0)}ms`);
                
                const firstHymn = document.querySelector(`[data-hymn-number="${startNumber}"]`);
                if (firstHymn) {
                    firstHymn.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } else {
            // 추가 페이지가 있으면 다음 번호 로드하지 않음
            loading.classList.remove('active');
            console.log(`🎉 전체 로딩 완료 (추가 페이지 있음): ${(mainLoadTime - startTime).toFixed(0)}ms`);
            
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

// 찬송가 이미지 로드 - callback에 로드된 범위와 추가 페이지 존재 여부 반환
function loadHymnImage(number, folder, callback, checkAdditionalPages = true) {
    const container = document.querySelector(`[data-hymn-number="${number}"]`);
    if (!container) {
        if (callback) callback([number], false);
        return;
    }
    
    const categoryName = categories[currentCategory].name;
    const patterns = generateFilePatterns(number, categoryName);
    
    tryLoadWithPatterns(container, folder, number, patterns, callback, checkAdditionalPages);
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

// 패턴들로 이미지 로드 시도 - ⚡ 병렬 로딩!
function tryLoadWithPatterns(container, folder, number, patterns, callback, checkAdditionalPages = true) {
    console.log(`🔍 ${number}번 - ${patterns.length}개 패턴 병렬 검색 시작 (추가페이지체크: ${checkAdditionalPages})`);
    
    let hasSucceeded = false;
    let completedCount = 0;
    const startTime = performance.now();
    
    // ⭐ 모든 패턴을 동시에 시도!
    patterns.forEach((pattern, idx) => {
        const testImg = new Image();
        
        // 3초 타임아웃 (온라인 환경 고려)
        const timeoutId = setTimeout(() => {
            if (!hasSucceeded) {
                completedCount++;
                if (completedCount === patterns.length) {
                    // 모두 실패
                    console.warn(`❌ ${number}번: 모든 패턴 실패 (${(performance.now() - startTime).toFixed(0)}ms)`);
                    const placeholder = document.createElement('div');
                    placeholder.className = 'hymn-placeholder';
                    placeholder.innerHTML = `📷<br><br>${number}번<br>이미지 없음`;
                    container.innerHTML = '';
                    container.appendChild(placeholder);
                    container.style.minHeight = '';
                    if (callback) callback([number], false); // 실패해도 자기 번호는 반환, 추가 페이지 없음
                }
            }
        }, 3000); // 2초 → 3초로 증가
        
        testImg.src = `images/${folder}/${pattern.file}`;
        
        testImg.onload = function() {
            if (hasSucceeded) return; // 이미 다른 패턴이 성공함
            
            hasSucceeded = true;
            clearTimeout(timeoutId);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ ${number}번 [${idx + 1}/${patterns.length}] 성공: ${pattern.file} (${loadTime.toFixed(0)}ms)`);
            
            // 합본 처리
            let finalRange;
            if (pattern.type === 'combined') {
                pattern.range.forEach(num => {
                    loadedImages.add(num);
                });
                container.dataset.hymnNumber = pattern.range[0];
                finalRange = pattern.range;
            } else {
                loadedImages.add(number);
                finalRange = [number];
            }
            
            // 이미지 표시
            const img = document.createElement('img');
            img.className = 'hymn-image';
            img.src = this.src;
            img.alt = pattern.type === 'combined' ? 
                `${pattern.range[0]}-${pattern.range[pattern.range.length-1]}번` : 
                `${number}번`;
            img.loading = 'eager'; // 메인 이미지는 즉시 로드
            img.decoding = 'async'; // 비동기 디코딩
            container.innerHTML = '';
            container.appendChild(img);
            container.style.minHeight = '';
            
            // ⭐ 추가 페이지 체크 (checkAdditionalPages가 true일 때만)
            if (checkAdditionalPages) {
                const checkNumber = pattern.type === 'single' ? number : Math.max(...finalRange);
                console.log(`🔎 추가 페이지 체크 시작: ${checkNumber}-1 (파일타입: ${pattern.type})`);
                
                loadAdditionalPages(container, folder, checkNumber, 1, (hasAdditional) => {
                    console.log(`✓ ${checkNumber}번 추가 페이지 확인 완료: ${hasAdditional ? '있음 ✅' : '없음 ❌'}`);
                    if (callback) {
                        const fileType = pattern.type === 'single' ? '단일' : '합본';
                        console.log(`📞 callback 호출: 검색${number}번, 파일${fileType}, 체크${checkNumber}번, 추가페이지${hasAdditional}`);
                        callback(finalRange, hasAdditional);
                    }
                });
            } else {
                // 추가 페이지 체크하지 않음 - 바로 callback 호출
                console.log(`⏩ 추가 페이지 체크 건너뜀 - 바로 callback 호출`);
                if (callback) callback(finalRange, false);
            }
        };
        
        testImg.onerror = function() {
            if (!hasSucceeded) {
                completedCount++;
                clearTimeout(timeoutId);
            }
        };
    });
}

// 추가 페이지 로드 - ⚡ 병렬! (callback에 존재 여부 전달)
function loadAdditionalPages(container, folder, number, pageNum, finalCallback) {
    console.log(`🔍 loadAdditionalPages 호출: ${number}-${pageNum}, callback존재: ${!!finalCallback}`);
    
    if (pageNum > 1) {
        console.log(`⚠️ pageNum > 1, callback(false) 호출`);
        if (finalCallback) finalCallback(false);
        return;
    }
    
    const filenames = [
        `${number}-${pageNum}.jpeg`,
        `${number}-${pageNum}.jpg`,
    ];
    
    console.log(`🔍 ${number}-${pageNum} 추가 페이지 병렬 검색 - 파일명: ${filenames.join(', ')}`);
    
    let hasSucceeded = false;
    let completedCount = 0;
    
    // ⚡ 모든 파일명 동시 시도
    filenames.forEach((filename, idx) => {
        const testImg = new Image();
        
        const timeoutId = setTimeout(() => {
            if (!hasSucceeded) {
                completedCount++;
                console.log(`⏱️ ${filename} 타임아웃 (${completedCount}/${filenames.length})`);
                if (completedCount === filenames.length) {
                    // 모두 실패 - 추가 페이지 없음
                    console.log(`ℹ️ ${number}번 추가 페이지 없음 - callback(false) 호출`);
                    if (finalCallback) finalCallback(false); // ⭐ 추가 페이지 없음
                }
            }
        }, 2500); // 1.5초 → 2.5초로 증가
        
        testImg.src = `images/${folder}/${filename}`;
        console.log(`🔄 이미지 로드 시도 [${idx + 1}/${filenames.length}]: ${testImg.src}`);
        
        testImg.onload = function() {
            if (hasSucceeded) {
                console.log(`⚠️ ${filename} 로드 성공했지만 이미 다른 파일이 성공함`);
                return;
            }
            
            hasSucceeded = true;
            clearTimeout(timeoutId);
            
            console.log(`✅ ${number}-${pageNum} 성공: ${filename} - 새 컨테이너에 추가 중`);
            
            // ⭐ 새로운 컨테이너 생성 (데스크탑 가로 배치를 위해)
            const additionalContainer = document.createElement('div');
            additionalContainer.className = 'hymn-item';
            additionalContainer.dataset.hymnNumber = `${number}-${pageNum}`;
            
            const img = document.createElement('img');
            img.className = 'hymn-image';
            img.src = this.src;
            img.alt = `${number}번 (2페이지)`;
            img.loading = 'eager'; // 추가 페이지도 즉시 로드
            img.decoding = 'async'; // 비동기 디코딩
            
            additionalContainer.appendChild(img);
            
            // 현재 컨테이너 다음에 추가
            container.parentNode.insertBefore(additionalContainer, container.nextSibling);
            
            console.log(`✅ 새 컨테이너에 이미지 DOM 추가 완료 - callback(true) 호출`);
            if (finalCallback) finalCallback(true); // ⭐ 추가 페이지 있음!
        };
        
        testImg.onerror = function() {
            if (!hasSucceeded) {
                completedCount++;
                clearTimeout(timeoutId);
                console.log(`❌ ${filename} 로드 실패 (${completedCount}/${filenames.length})`);
                
                if (completedCount === filenames.length) {
                    console.log(`ℹ️ 모든 파일 실패 - callback(false) 호출`);
                    if (finalCallback) finalCallback(false);
                }
            }
        };
    });
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
    position: fixed; bottom: 110px; right: 20px;
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; border: none; border-radius: 50%;
    font-size: 13px; font-weight: 700; cursor: pointer;
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

// ============================================================
// ⬅️ 이전 / 다음 ➡️ 네비게이션 버튼
// ============================================================

// 버튼 컨테이너
const navBtnContainer = document.createElement('div');
navBtnContainer.id = 'navButtons';
navBtnContainer.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
`;

// 이전 버튼
const prevBtn = document.createElement('button');
prevBtn.id = 'prevBtn';
prevBtn.innerHTML = '◀ 이전';
prevBtn.style.cssText = `
    padding: 0 24px;
    height: 56px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 28px;
    font-size: 20px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
    white-space: nowrap;
    min-width: 110px;
`;

// 번호 표시
const navNumDisplay = document.createElement('div');
navNumDisplay.id = 'navNumDisplay';
navNumDisplay.style.cssText = `
    height: 56px;
    min-width: 80px;
    padding: 0 18px;
    background: white;
    border-radius: 28px;
    font-size: 22px;
    font-weight: 900;
    color: #667eea;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    letter-spacing: -0.5px;
`;

// 다음 버튼
const nextBtn = document.createElement('button');
nextBtn.id = 'nextBtn';
nextBtn.innerHTML = '다음 ▶';
nextBtn.style.cssText = prevBtn.style.cssText; // 동일 스타일

navBtnContainer.appendChild(prevBtn);
navBtnContainer.appendChild(navNumDisplay);
navBtnContainer.appendChild(nextBtn);
document.body.appendChild(navBtnContainer);

// 버튼 상태 업데이트
function updateNavButtons() {
    if (currentHymnNumber === null) {
        navBtnContainer.style.opacity = '0';
        navBtnContainer.style.visibility = 'hidden';
        return;
    }

    navBtnContainer.style.opacity = '1';
    navBtnContainer.style.visibility = 'visible';

    const total = categories[currentCategory].total;
    navNumDisplay.textContent = `${currentHymnNumber}장`;

    // 이전 버튼
    if (currentHymnNumber <= 1) {
        prevBtn.style.opacity = '0.35';
        prevBtn.style.cursor = 'not-allowed';
        prevBtn.disabled = true;
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
        prevBtn.disabled = false;
    }

    // 다음 버튼
    if (currentHymnNumber >= total) {
        nextBtn.style.opacity = '0.35';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.disabled = true;
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        nextBtn.disabled = false;
    }
}

// 이전 버튼 클릭
prevBtn.addEventListener('click', () => {
    if (currentHymnNumber > 1) {
        loadHymnRange(currentHymnNumber - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// 다음 버튼 클릭
nextBtn.addEventListener('click', () => {
    const total = categories[currentCategory].total;
    if (currentHymnNumber < total) {
        loadHymnRange(currentHymnNumber + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// 버튼 눌림 효과
[prevBtn, nextBtn].forEach(btn => {
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.95)'; });
    btn.addEventListener('mouseup',   () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('touchstart',() => { btn.style.transform = 'scale(0.95)'; }, {passive: true});
    btn.addEventListener('touchend',  () => { btn.style.transform = 'scale(1)'; });
});

// ⌨️ 키보드 단축키: ← → 방향키
document.addEventListener('keydown', (e) => {
    // 입력창에 포커스 중이면 무시
    if (document.activeElement === hymnNumberInput) return;
    
    const total = categories[currentCategory].total;
    if (e.key === 'ArrowLeft' && currentHymnNumber > 1) {
        e.preventDefault();
        loadHymnRange(currentHymnNumber - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (e.key === 'ArrowRight' && currentHymnNumber < total) {
        e.preventDefault();
        loadHymnRange(currentHymnNumber + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});