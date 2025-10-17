// 전역 변수
let currentCategory = 'chansongga';
let loadedImages = new Set(); // 이미 로드된 번호 추적

// DOM 요소
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
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

// 사이드바 토글
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// 카테고리 선택
document.querySelectorAll('.category-title').forEach(title => {
    title.addEventListener('click', () => {
        const category = title.dataset.category;
        switchCategory(category);
        
        if (window.innerWidth < 1024) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});

categorySelect.addEventListener('change', (e) => {
    switchCategory(e.target.value);
});

function switchCategory(category) {
    currentCategory = category;
    currentCategoryTitle.textContent = categories[category].name;
    categorySelect.value = category;
    
    hymnNumberInput.max = categories[category].total;
    hymnNumberInput.placeholder = `번호 (1-${categories[category].total})`;
    
    loadAllHymns();
}

// 페이지 링크 클릭
document.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const start = parseInt(e.target.dataset.start);
        
        if (window.innerWidth < 1024) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
        
        scrollToHymn(start);
    });
});

// 전체 찬송가 로드
function loadAllHymns() {
    hymnContainer.innerHTML = '';
    loadedImages.clear();
    loading.classList.add('active');
    
    const folder = categories[currentCategory].folder;
    const total = categories[currentCategory].total;
    
    // ⭐ 미리 모든 컨테이너를 순서대로 생성
    const containers = {};
    for (let i = 1; i <= total; i++) {
        const hymnItem = document.createElement('div');
        hymnItem.className = 'hymn-item';
        hymnItem.dataset.hymnNumber = i;
        hymnItem.style.minHeight = '100px'; // 로딩 중 최소 높이
        containers[i] = hymnItem;
        hymnContainer.appendChild(hymnItem);
    }
    
    // 이미지 비동기 로드
    for (let i = 1; i <= total; i++) {
        // 이미 로드된 번호는 건너뛰기
        if (loadedImages.has(i)) {
            continue;
        }
        loadHymnWithPages(i, folder, containers);
    }
    
    loading.classList.remove('active');
}

// 찬송가와 추가 페이지 로드
function loadHymnWithPages(number, folder, containers) {
    // 다시 한번 체크 (비동기 처리 중 추가될 수 있음)
    if (loadedImages.has(number)) {
        return;
    }
    
    const hymnItem = containers[number];
    
    // 첫 번째 이미지 로드 시도
    tryLoadMainImage(hymnItem, folder, number, containers);
}

// 메인 이미지 로드 시도 (합본 포함)
function tryLoadMainImage(container, folder, number, containers) {
    const categoryName = categories[currentCategory].name;
    
    // 시도할 파일명 패턴들
    const patterns = generateFilePatterns(number, categoryName);
    
    tryLoadWithPatterns(container, folder, number, patterns, 0, containers);
}

// 파일명 패턴 생성
function generateFilePatterns(number, categoryName) {
    const patterns = [];
    const maxNumber = categories[currentCategory].total;
    
    // ⭐ 중요: 합본 파일을 먼저 찾아야 중복 방지됨!
    
    // 1. 합본 파일 (숫자만) - 최대 6개 - 먼저 시도!
    for (let start = Math.max(1, number - 5); start <= number; start++) {
        for (let end = number; end <= Math.min(maxNumber, start + 5); end++) {
            if (start < end) {
                patterns.push({ 
                    file: `${start}-${end}.jpg`, 
                    type: 'combined', 
                    range: Array.from({length: end - start + 1}, (_, i) => start + i)
                });
                patterns.push({ 
                    file: `${start}-${end}.jpeg`, 
                    type: 'combined', 
                    range: Array.from({length: end - start + 1}, (_, i) => start + i)
                });
            }
        }
    }
    
    // 2. 합본 파일 (카테고리명) - 최대 6개
    for (let start = Math.max(1, number - 5); start <= number; start++) {
        for (let end = number; end <= Math.min(maxNumber, start + 5); end++) {
            if (start < end) {
                patterns.push({ 
                    file: `${categoryName} ${start}-${end}.jpg`, 
                    type: 'combined', 
                    range: Array.from({length: end - start + 1}, (_, i) => start + i)
                });
                patterns.push({ 
                    file: `${categoryName} ${start}-${end}.jpeg`, 
                    type: 'combined', 
                    range: Array.from({length: end - start + 1}, (_, i) => start + i)
                });
            }
        }
    }
    
    // 3. 단일 파일 (숫자만) - 합본을 찾지 못한 경우에만 시도
    patterns.push({ file: `${number}.jpg`, type: 'single', range: [number] });
    patterns.push({ file: `${number}.jpeg`, type: 'single', range: [number] });
    
    // 4. 단일 파일 (카테고리명)
    patterns.push({ file: `${categoryName} ${number}.jpg`, type: 'single', range: [number] });
    patterns.push({ file: `${categoryName} ${number}.jpeg`, type: 'single', range: [number] });
    
    return patterns;
}

// 패턴들로 이미지 로드 시도
function tryLoadWithPatterns(container, folder, number, patterns, index, containers) {
    if (index >= patterns.length) {
        // 모든 패턴 실패 - placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'hymn-placeholder';
        placeholder.innerHTML = `📷<br><br>${number}번<br>이미지 없음`;
        container.innerHTML = '';
        container.appendChild(placeholder);
        container.style.minHeight = '';
        loadedImages.add(number);
        return;
    }
    
    const pattern = patterns[index];
    const testImg = new Image();
    testImg.src = `images/${folder}/${pattern.file}`;
    
    testImg.onload = function() {
        // ⭐⭐⭐ 핵심 수정: 합본인 경우 범위의 모든 번호를 즉시 loadedImages에 추가
        if (pattern.type === 'combined') {
            // 범위 내 모든 번호가 이미 처리되었는지 확인
            const alreadyLoaded = pattern.range.some(num => loadedImages.has(num) && num !== number);
            
            if (alreadyLoaded) {
                // 이미 다른 번호에서 이 합본을 로드했음 - 이 컨테이너는 숨김
                container.style.display = 'none';
                return;
            }
            
            // 범위의 모든 번호를 즉시 추가 (다른 번호들이 이 합본을 다시 로드하지 않도록)
            pattern.range.forEach(num => {
                loadedImages.add(num);
                // 해당 범위의 다른 컨테이너들은 숨김
                if (num !== number && containers[num]) {
                    containers[num].style.display = 'none';
                }
            });
            
            // 첫 번째 번호로 표시 (가장 작은 번호)
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
        
        // 단일 파일인 경우에만 추가 페이지 로드 (100-1.jpg 등)
        if (pattern.type === 'single') {
            loadAdditionalPages(container, folder, number, 1);
        }
    };
    
    testImg.onerror = function() {
        // 다음 패턴 시도
        tryLoadWithPatterns(container, folder, number, patterns, index + 1, containers);
    };
}

// 추가 페이지 로드 (100-1.jpg, 100-2.jpg 등)
function loadAdditionalPages(container, folder, number, pageNum) {
    const categoryName = categories[currentCategory].name;
    
    const filenames = [
        `${number}-${pageNum}.jpg`,
        `${number}-${pageNum}.jpeg`,
        `${categoryName} ${number}-${pageNum}.jpg`,
        `${categoryName} ${number}-${pageNum}.jpeg`
    ];
    
    tryLoadAdditionalPage(container, folder, number, pageNum, filenames, 0);
}

function tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index) {
    if (index >= filenames.length) {
        // 이 페이지 없음 - 종료
        return;
    }
    
    const filename = filenames[index];
    const testImg = new Image();
    testImg.src = `images/${folder}/${filename}`;
    
    testImg.onload = function() {
        // 추가 페이지 찾음!
        const img = document.createElement('img');
        img.className = 'hymn-image';
        img.src = this.src;
        img.alt = `${number}번 (${pageNum + 1}페이지)`;
        img.loading = 'lazy';
        container.appendChild(img);
        
        // 다음 페이지도 시도 (최대 5개 추가 페이지)
        if (pageNum < 5) {
            loadAdditionalPages(container, folder, number, pageNum + 1);
        }
    };
    
    testImg.onerror = function() {
        // 다음 파일명 시도
        tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index + 1);
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
        const overlayEl = document.createElement('div');
        overlayEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        
        const alertMsg = document.createElement('div');
        alertMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 32px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            line-height: 1.6;
            max-width: 90%;
        `;
        alertMsg.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <div style="color: #2d3748; margin-bottom: 12px;">번호를 확인해주세요</div>
            <div style="color: #4a5568; font-size: 20px;">${categories[currentCategory].name}은(는)<br>1번부터 ${maxNumber}번까지 있습니다.</div>
            <button style="
                margin-top: 20px;
                padding: 14px 32px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 22px;
                font-weight: 700;
                cursor: pointer;
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
        return;
    }
    
    scrollToHymn(number);
    hymnNumberInput.value = '';
}

function scrollToHymn(number) {
    // 해당 번호 또는 해당 번호를 포함하는 컨테이너 찾기
    let target = document.querySelector(`[data-hymn-number="${number}"]`);
    
    // 합본에 포함되어 있을 수 있으므로, 범위 내에서 찾기
    if (!target) {
        const allItems = document.querySelectorAll('.hymn-item');
        for (const item of allItems) {
            const itemNumber = parseInt(item.dataset.hymnNumber);
            // 합본인 경우 범위 내에 있는지 확인 (최대 6개 범위)
            if (itemNumber <= number && number <= itemNumber + 5) {
                target = item;
                break;
            }
        }
    }
    
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 강조 효과
        target.style.boxShadow = '0 0 0 4px #667eea';
        setTimeout(() => {
            target.style.boxShadow = '';
        }, 2000);
    }
}

// 초기 로드
hymnNumberInput.max = categories[currentCategory].total;
hymnNumberInput.placeholder = `번호 (1-${categories[currentCategory].total})`;
loadAllHymns();

// 맨 위로 버튼 기능
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.id = 'scrollToTop';
scrollToTopBtn.innerHTML = '⬆<br>맨위로';
scrollToTopBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s, transform 0.2s;
    line-height: 1.3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

document.body.appendChild(scrollToTopBtn);

// 스크롤 감지
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollToTopBtn.style.opacity = '1';
        scrollToTopBtn.style.visibility = 'visible';
    } else {
        scrollToTopBtn.style.opacity = '0';
        scrollToTopBtn.style.visibility = 'hidden';
    }
});

// 맨 위로 이동
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// 버튼 활성화 효과
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