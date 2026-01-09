console.log("index.js loaded");

// 1. 전역 변수 관리 (딱 한 번만 선언)
let track, nextBtn, prevBtn, indicatorContainer;
let index = 0;
let slideCount = 0;
let autoSlideInterval;

// 2. DOM 요소 찾기 (안전하게 함수화)
function setElements() {
  const container = document.querySelector(".carousel-container");
  if (!container) return;

  track = container.querySelector(".carousel-track");
  nextBtn = container.querySelector(".next");
  prevBtn = container.querySelector(".prev");
  indicatorContainer = container.querySelector(".indicator-container");
}

// 3. 슬라이드 이동 (인디케이터 업데이트 포함)
function updateSlide() {
  if (!track || slideCount === 0) return;

  // 인덱스 무한 루프 방어 로직
  if (index < 0) index = slideCount - 1;
  if (index >= slideCount) index = 0;

  track.style.transform = `translateX(-${index * 100}%)`;

  // 점(Dot) 활성화 상태 업데이트
  const dots = indicatorContainer?.querySelectorAll(".dot");
  if (dots) {
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  }
}

// 4. 캐러셀 및 점 생성 (상세페이지 링크 추가)
function initCarousel(items) {
  if (!track) return;

  // 배너 클릭 시 상세페이지로 이동하도록 <a> 태그 추가
  track.innerHTML = items
    .map(
      (item) => `
    <div class="slide">
      <a href="./detail.html?id=${item.id}">
        <img src="${item.img}" alt="배너 이미지">
      </a>
    </div>
  `
    )
    .join("");

  slideCount = items.length;
  index = 0;

  // 인디케이터 생성
  if (indicatorContainer) {
    indicatorContainer.innerHTML = "";
    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement("div");
      dot.classList.add("dot");
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => {
        index = i;
        updateSlide();
        resetAutoSlide(); // 클릭 시 타이머 리셋
      });
      indicatorContainer.appendChild(dot);
    }
  }
  updateSlide();
}

// 5. 상품 목록 렌더링
function renderProducts(list) {
  const grid = document.querySelector("#productGrid");
  if (!grid) return;

  grid.innerHTML = list
    .map((p) => {
      const imgUrl = p.image?.startsWith("http")
        ? p.image
        : new URL(p.image, window.location.href).href;
      return `
      <li class="card">
        <a class="product-link" href="./detail.html?id=${p.id}">
          <img src="${imgUrl}" alt="${p.name}" />
          <p class="product-meta">${p.info ?? ""}</p>
          <p class="product-name">${p.name}</p>
          <p class="product-price">${Number(p.price).toLocaleString()}원</p>
        </a>
      </li>
    `;
    })
    .join("");
}

// 6. 자동 슬라이드 로직
function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    index = index < slideCount - 1 ? index + 1 : 0;
    updateSlide();
  }, 5000);
}

function resetAutoSlide() {
  clearInterval(autoSlideInterval);
  startAutoSlide();
}

// 7. 통합 데이터 로딩
async function initPage() {
  try {
    const res = await Utils.fetchWithAuth("/products");
    const data = await res.json();
    const list = data.results ?? [];

    // 배너와 상품목록에 데이터 뿌리기
    initCarousel(list.map((item) => ({ img: item.image, id: item.id })));
    renderProducts(list);

    // 마지막으로 자동 슬라이드 시작
    startAutoSlide();
  } catch (e) {
    console.error("데이터 초기화 실패:", e);
  }
}

// 8. 이벤트 연결 및 최종 실행
document.addEventListener("DOMContentLoaded", () => {
  setElements();

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      index++;
      updateSlide();
      resetAutoSlide();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      index--;
      updateSlide();
      resetAutoSlide();
    });
  }

  initPage();
});
