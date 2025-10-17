// 전역 변수
let currentCategory = 'chansongga';
let loadedImages = new Set();
let allContainers = {};
let loadQueue = [];
let isLoading = false;

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
    allContainers = {};
    loadQueue = [];
    loading.classList.add('active');
    
    const folder = categories[currentCategory].folder;
    const total = categories[currentCategory].total;
    
    // 1. 모든 컨테이너를 순서대로 생성
    for (let i = 1; i <= total; i++) {
        const hymnItem = document.createElement('div');
        hymnItem.className = 'hymn-item';
        hymnItem.dataset.hymnNumber = i;
        hymnItem.dataset.loaded = 'false';
        hymnItem.style.minHeight = '400px';
        
        // 로딩 플레이스홀더
        const placeholder = document.createElement('div');
        placeholder.className = 'hymn-loading';
        placeholder.innerHTML = `⏳<br><br>${i}번<br>로딩 대기중...`;
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
        `;
        hymnItem.appendChild(placeholder);
        
        allContainers[i] = hymnItem;
        hymnContainer.appendChild(hymnItem);
        loadQueue.push(i);
    }
    
    loading.classList.remove('active');
    
    // 2. Intersection Observer로 뷰포트에 들어올 때만 로드
    setupIntersectionObserver();
}

// Intersection Observer 설정
function setupIntersectionObserver() {
    // ⭐ 먼저 처음 20개는 무조건 로드 (GitHub Pages 호환성)
    for (let i = 1; i <= Math.min(20, Object.keys(allContainers).length); i++) {
        if (!loadedImages.has(i)) {
            loadHymnWithDelay(i);
        }
    }
    
    const observerOptions = {
        root: null,
        rootMargin: '1000px', // 1000px로 증가 (더 일찍 로드)
        threshold: 0.01
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                const number = parseInt(container.dataset.hymnNumber);
                
                if (container.dataset.loaded === 'false' && !loadedImages.has(number)) {
                    loadHymnWithDelay(number);
                    observer.unobserve(container);
                }
            }
        });
    }, observerOptions);
    
    // 21번부터 관찰
    Object.values(allContainers).forEach(container => {
        const number = parseInt(container.dataset.hymnNumber);
        if (number > 20) {
            observer.observe(container);
        }
    });
}

// 딜레이를 둔 이미지 로드 (Rate Limit 방지)
let loadCounter = 0;
function loadHymnWithDelay(number) {
    // 이미 로드된 경우 건너뛰기
    if (loadedImages.has(number)) {
        return;
    }
    
    const folder = categories[currentCategory].folder;
    const container = allContainers[number];
    
    // 처음 20개는 빠르게, 나머지는 천천히
    const delay = number <= 20 ? 
        Math.floor(loadCounter / 5) * 50 : // 5개당 50ms
        Math.floor(loadCounter / 3) * 100; // 3개당 100ms
    loadCounter++;
    
    setTimeout(() => {
        tryLoadMainImage(container, folder, number, allContainers);
    }, delay);
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
    
    // 1. 합본 파일 (숫자만) - 최대 6개
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
    
    // 2. 합본 파일 (카테고리명)
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
    
    // 3. 단일 파일 (숫자만)
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
        container.dataset.loaded = 'true';
        loadedImages.add(number);
        return;
    }
    
    const pattern = patterns[index];
    const testImg = new Image();
    testImg.src = `images/${folder}/${pattern.file}`;
    
    testImg.onload = function() {
        if (pattern.type === 'combined') {
            const alreadyLoaded = pattern.range.some(num => loadedImages.has(num) && num !== number);
            
            if (alreadyLoaded) {
                container.style.display = 'none';
                container.dataset.loaded = 'true';
                return;
            }
            
            pattern.range.forEach(num => {
                loadedImages.add(num);
                if (num !== number && containers[num]) {
                    containers[num].style.display = 'none';
                    containers[num].dataset.loaded = 'true';
                }
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
        container.dataset.loaded = 'true';
        
        // 단일 파일인 경우에만 추가 페이지 로드
        if (pattern.type === 'single') {
            loadAdditionalPages(container, folder, number, 1);
        }
    };
    
    testImg.onerror = function() {
        tryLoadWithPatterns(container, folder, number, patterns, index + 1, containers);
    };
}

// 추가 페이지 로드
function loadAdditionalPages(container, folder, number, pageNum) {
    const categoryName = categories[currentCategory].name;
    
    // .jpeg를 먼저 시도
    const filenames = [
        `${number}-${pageNum}.jpeg`,
        `${number}-${pageNum}.jpg`,
        `${categoryName} ${number}-${pageNum}.jpeg`,
        `${categoryName} ${number}-${pageNum}.jpg`
    ];
    
    tryLoadAdditionalPage(container, folder, number, pageNum, filenames, 0);
}

function tryLoadAdditionalPage(container, folder, number, pageNum, filenames, index) {
    if (index >= filenames.length) {
        return;
    }
    
    const filename = filenames[index];
    const testImg = new Image();
    testImg.src = `images/${folder}/${filename}`;
    
    testImg.onload = function() {
        const img = document.createElement('img');
        img.className = 'hymn-image';
        img.src = this.src;
        img.alt = `${number}번 (${pageNum + 1}페이지)`;
        img.loading = 'lazy';
        container.appendChild(img);
        
        if (pageNum < 5) {
            loadAdditionalPages(container, folder, number, pageNum + 1);
        }
    };
    
    testImg.onerror = function() {
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
        showAlert(`번호를 확인해주세요<br><br>${categories[currentCategory].name}은(는)<br>1번부터 ${maxNumber}번까지 있습니다.`);
        return;
    }
    
    scrollToHymn(number);
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

function scrollToHymn(number) {
    let target = document.querySelector(`[data-hymn-number="${number}"]`);
    
    if (!target) {
        const allItems = document.querySelectorAll('.hymn-item');
        for (const item of allItems) {
            const itemNumber = parseInt(item.dataset.hymnNumber);
            if (itemNumber <= number && number <= itemNumber + 5) {
                target = item;
                break;
            }
        }
    }
    
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
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
