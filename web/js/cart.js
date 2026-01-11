/* ==========================================================
   1. 전역 변수 및 요소 선택
   ========================================================== */
const containerEl = document.getElementById("cart-container"); // 장바구니 메인 박스
const emptyEl = document.getElementById("cart-empty"); // 상품 없을 때 보여줄 섹션
const listEl = document.getElementById("cart-list"); // 상품 있을 때 보여줄 섹션
const itemsEl = document.getElementById("cart-items"); // <li> 태그들이 삽입될 <ul>
const totalPriceEl = document.getElementById("total-price"); // 합계 금액 출력 위치
const finalPriceEl = document.getElementById("final-price"); // 최종 결제 금액 출력 위치
const orderBtn = document.getElementById("order-btn"); // [전체 주문] 버튼
import { renderCartItem } from "./common/CartItem.js";
// 서버에서 받아온 원본 데이터를 보관하는 '데이터 저장소' 역할을 합니다.
let cartItems = [];

// 브라우저가 HTML을 다 읽자마자 초기 데이터를 불러오는 loadCart 실행
document.addEventListener("DOMContentLoaded", loadCart);

/* ==========================================================
   2. 데이터 연동 (Server Connection)
   ========================================================== */
async function loadCart() {
  // [인증 확인] Utils.isLoggedIn()은 로컬스토리지의 토큰 유무를 판단
  if (!Utils.isLoggedIn()) {
    Modal.open({
      message:
        "로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?",
      onConfirm: () => {
        location.href = PAGES.SIGNIN;
      },
      onCancel: () => {
        location.href = PAGES.HOME;
      }, // 비로그인 시 장바구니 접근 차단
      confirmText: "로그인",
    });
    return;
  }
  try {
    const res = await Utils.fetchWithAuth("/cart/");

    const data = await res.json();

    // 만약 'cart'가 없으면 이전 구조인 'results'를 확인합니다.
    cartItems = data.cart || data.results || [];

    sessionStorage.setItem("cartData", JSON.stringify(cartItems));

    containerEl.classList.remove("is-hidden");

    // 데이터가 0개보다 많아야 리스트를 그립니다.
    if (cartItems.length > 0) {
      renderCartList();
    } else {
      renderEmpty();
    }
  } catch (err) {
    console.error("로딩 실패:", err);
    containerEl.classList.remove("is-hidden");
    renderEmpty();
  }
}
/* ==========================================================
   3. UI 렌더링 (View Generation)
   ========================================================== */
function renderEmpty() {
  emptyEl.classList.remove("is-hidden"); // 1. 숨겨져 있던 '비어있음' 메시지를 보여줌
  listEl.classList.add("is-hidden"); // 2. 혹시 떠 있을지 모르는 '리스트' 영역을 숨김
}
function renderCartList() {
  emptyEl.classList.add("is-hidden");
  listEl.classList.remove("is-hidden");

  // 1. 기존 리스트 비우기
  itemsEl.innerHTML = "";

  // 2. 데이터 반복문 돌리기
  cartItems.forEach((item) => {
    // 3. createCartItem 호출 (데이터와 핸들러 전달)
    const li = createCartItem(item, {
      onIncrease: (e) => onIncrease(e), // 수량 증가
      onDecrease: (e) => onDecrease(e), // 수량 감소
      onDelete: (id) => onDelete(id), // 삭제 (id 전달)
      onCheck: () => updateTotalPrice(), // 체크 시 합계 계산
      onOpenModal: (id) => openQtyEditModal(id), // 모달 열기
      onSingleOrder: () => {
        // 개별 주문 로직
        const orderData = { items: [item], order_kind: "cart_order" };
        sessionStorage.setItem("orderData", JSON.stringify(orderData));
        location.href = PAGES.ORDER;
      },
    });

    // 4. 완성된 li를 부모 ul에 추가
    itemsEl.appendChild(li);
  });

  // 5. 전체 합계 업데이트
  updateTotalPrice();
}

/* ==========================================================
   4. 상호작용 (Event Binding)
   ========================================================== */
function bindEvents() {
  const checkAll = document.getElementById("check-all"); // 전체 선택 체크박스
  const itemChecks = itemsEl.querySelectorAll(".item-check"); // 개별 상품 체크박스들

  // [전체 선택 클릭] 모든 상품의 체크 상태를 부모와 일치시키고 합계 다시 계산
  if (checkAll) {
    checkAll.onchange = () => {
      itemChecks.forEach((chk) => (chk.checked = checkAll.checked));
      updateTotalPrice();
    };
  }

  // [각종 버튼 클릭] 생성된 DOM 요소에서 dataset 값을 읽어와 해당 핸들러 함수로 전달
  itemsEl
    .querySelectorAll(".qty-plus")
    .forEach((btn) => (btn.onclick = onIncrease));
  itemsEl
    .querySelectorAll(".qty-minus")
    .forEach((btn) => (btn.onclick = onDecrease));
  itemsEl.querySelectorAll(".item-delete-btn").forEach((btn) => {
    btn.onclick = (e) => {
      // 클릭된 버튼에서 ID를 먼저 추출합니다.
      const id = e.target.closest("li").dataset.id;
      // 추출한 '숫자 ID'를 onDelete 함수에 던져줍니다.
      onDelete(id);
    };
  });

  // [개별 체크 클릭] 모든 체크박스가 선택되면 전체 선택 버튼도 자동으로 체크
  itemChecks.forEach((chk) => {
    chk.onchange = () => {
      if (checkAll)
        checkAll.checked = Array.from(itemChecks).every((c) => c.checked);
      updateTotalPrice();
    };
  });

  // [하단 주문 버튼] 클릭 시 moveToOrder()를 실행하여 주문 데이터를 서버에 전송
  if (orderBtn) orderBtn.onclick = moveToOrder;

  // [상품별 개별 주문]

  // (bindEvents 함수 내부에서 호출될 내용)
  itemsEl.querySelectorAll(".order-item-btn").forEach((btn, index) => {
    btn.onclick = (e) => {
      // 클릭된 그 줄의 상품 정보만 가져옴
      const singleItem = cartItems[index];

      const orderData = {
        items: [singleItem],
        order_kind: "cart_order",
      };

      // 세션 스토리지에 하나의 키로 저장
      sessionStorage.setItem("orderData", JSON.stringify(orderData));
      location.href = PAGES.ORDER;
    };
  });
}

/* ==========================================================
   5. 수량 변경 및 연산 (Business Logic)
   ========================================================== */
async function updateQuantity(id, newQuantity) {
  try {
    const response = await Utils.fetchWithAuth(`/cart/${id}/`, {
      method: "PUT",
      body: JSON.stringify({
        quantity: newQuantity,
      }),
    });

    // 1. 성공 처리 (200 OK)
    if (response.ok) {
      // 정석: 세션 데이터를 비우고 서버에서 최신 목록을 다시 가져옴
      sessionStorage.removeItem("cartData");
      await loadCart();
      return;
    }

    // 2. HTTP 상태 코드별 상세 오류 처리
    switch (response.status) {
      case 403: // 접근 권한 없음
        Modal.open({ message: "수정 권한이 없습니다.", cancelText: "" });
        break;

      case 404: // 상품을 찾을 수 없음
        Modal.open({
          message: "해당 상품 정보를 찾을 수 없습니다.",
          cancelText: "",
        });
        await loadCart();
        break;

      default:
        const errorData = await response.json();
        Modal.open({
          message: errorData.detail || "수정 중 오류가 발생했습니다.",
          cancelText: "",
        });
    }
  } catch (err) {
    console.error("수량 수정 통신 에러:", err);
    Modal.open({
      message: "서버와의 연결이 원활하지 않습니다.",
      cancelText: "",
    });
  }
}
// [+] 버튼 클릭 시
function onIncrease(e) {
  const li = e.target.closest("li");
  const id = li.dataset.id;
  const item = cartItems.find((i) => String(i.id) === String(id));
  if (item) updateQuantity(id, item.quantity + 1);
}

// [-] 버튼 클릭 시
function onDecrease(e) {
  const li = e.target.closest("li");
  const id = li.dataset.id;
  const item = cartItems.find((i) => String(i.id) === String(id));
  if (item && item.quantity > 1) updateQuantity(id, item.quantity - 1);
}
// [합계 계산] 체크박스가 켜진 상품들만 골라서 (가격 * 수량)을 더합니다.
function updateTotalPrice() {
  let total = 0;
  itemsEl.querySelectorAll("li").forEach((li) => {
    // UI 상의 체크 여부를 판단합니다.
    if (li.querySelector(".item-check").checked) {
      // 전역 변수 'cartItems'에서 해당 ID의 실제 가격 정보를 찾아 연산
      const item = cartItems.find(
        (i) => String(i.id) === String(li.dataset.id)
      );
      if (item) total += item.product.price * item.quantity;
    }
  });

  const formatted = Utils.formatNumber(total);
  if (totalPriceEl) totalPriceEl.textContent = formatted;
  if (finalPriceEl) finalPriceEl.textContent = formatted;
}

/* ==========================================================
   6. 주문 및 삭제 (Final Action)
   ========================================================== */
async function onDelete(id) {
  if (!id) return;

  Modal.open({
    message: "상품을 삭제하시겠습니까?",
    onConfirm: async () => {
      try {
        const response = await Utils.fetchWithAuth(`/cart/${id}/`, {
          method: "DELETE",
        });

        // 1. 성공 처리 (200 OK)
        if (response.ok) {
          sessionStorage.removeItem("cartData");
          await loadCart();
          return;
        }

        // 2. HTTP 상태 코드별 상세 오류 처리
        switch (response.status) {
          case 403: // 접근 권한 없음
            Modal.open({
              message: "본인의 장바구니 상품만 삭제할 수 있습니다.",
              cancelText: "",
            });
            break;

          case 404: // 장바구니 상품을 찾을 수 없음
            Modal.open({
              message: "이미 삭제되었거나 존재하지 않는 상품입니다.",
              cancelText: "",
            });
            // 목록에 없으므로 데이터 동기화 시도
            await loadCart();
            break;

          default:
            const errorData = await response.json();
            Modal.open({
              message: errorData.detail || "삭제 중 오류가 발생했습니다.",
              cancelText: "",
            });
        }
      } catch (err) {
        console.error("네트워크 에러:", err);
        Modal.open({
          message: "서버와의 연결이 원활하지 않습니다.",
          cancelText: "",
        });
      }
    },
  });
}
/**
 * 7. "주문하기" 클릭 시 실행되는 함수
 */
function moveToOrder() {
  // 체크박스가 선택된 상품들만 필터링
  const selectedCartItems = cartItems.filter((item, index) => {
    const checkBoxes = itemsEl.querySelectorAll(".item-check");
    return checkBoxes[index] && checkBoxes[index].checked;
  });

  // 선택된 상품이 없는 경우 방어 로직을 실행
  if (selectedCartItems.length === 0) {
    Modal.open({ message: "주문할 상품을 선택해주세요.", cancelText: "" });
    return;
  }
  const orderData = {
    items: selectedCartItems, // 선택된 상품 배열
    order_kind: "cart_order", // 주문 종류
  };

  sessionStorage.setItem("orderData", JSON.stringify(orderData));

  location.href = PAGES.ORDER;
}

/* ==========================================================
    8. 수량 수정 모달 (Quantity Edit Modal)
    ========================================================== */
async function openQtyEditModal(itemId) {
  const item = cartItems.find((i) => String(i.id) === String(itemId));
  if (!item) return;

  let tempQty = item.quantity;

  Modal.open({
    message: "로딩 중..",
    confirmText: "수정",
    cancelText: "취소",
    onConfirm: async () => {
      if (tempQty !== item.quantity) {
        await updateQuantity(itemId, tempQty);
      }
    },
  });

  setTimeout(() => {
    // image_cef08b.png에서 확인된 정확한 ID 선택자 사용
    const modalBody = document.getElementById("modal-text");

    if (modalBody) {
      modalBody.innerHTML = `
        <div class="modal-qty-container" style="display: flex; justify-content: center; align-items: center; min-height: 80px; padding: 10px 0;">
    <div class="qty-stepper" style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
      <button type="button" id="m-minus" style="width: 45px; height: 45px; border: none; background: #fff; cursor: pointer; font-size: 20px; border-right: 1px solid #ddd;">-</button>
      <span id="m-val" style="width: 50px; height: 45px; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; font-weight: 600; background: #fff;">${tempQty}</span>
      <button type="button" id="m-plus" style="width: 45px; height: 45px; border: none; background: #fff; cursor: pointer; font-size: 20px; border-left: 1px solid #ddd;">+</button>
    </div>
  </div>
      `;

      // 3. 버튼 이벤트 연결
      const btnMinus = document.getElementById("m-minus");
      const btnPlus = document.getElementById("m-plus");
      const valText = document.getElementById("m-val");

      btnMinus.onclick = (e) => {
        e.preventDefault();
        if (tempQty > 1) {
          tempQty--;
          valText.textContent = tempQty;
        }
      };
      btnPlus.onclick = (e) => {
        e.preventDefault();
        tempQty++;
        valText.textContent = tempQty;
      };
    }
  }, 100);
}
