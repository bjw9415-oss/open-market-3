import { Utils } from "../api/config.js";

export function renderCartItem(item) {
  const { onIncrease, onDecrease, onDelete, onOpenModal, onCheck } = handlers;

  const li = document.createElement("li");
  li.className = "cart-item";

  li.innerHTML = `
      <div class="col-info">
        <label class="check-container">
          <input type="checkbox" class="item-check" checked />
          <span class="custom-checkbox"></span>
        </label>
        <img src="${item.product.image}" alt="${
    item.product.name
  }" class="cart-img" />
        <div class="product-text">
          <span class="seller">${item.product.seller.store_name}</span>
          <strong class="name">${item.product.name}</strong>
          <span class="price">${Utils.formatNumber(item.product.price)}원</span>
          <br />
          <span class="delivery-info">택배배송/ 무료배송</span>
        </div>
      </div>
      <div class="col-qty">
        <div class="qty-stepper">
          <button type="button" class="qty-minus" aria-label="수량 감소">
           <svg width="34" height="34" style="display: block;">
            <use href="assets/icons/sprite.svg#icon-order-minus"></use>
           </svg>
          </button>
          <span class="qty-val">${item.quantity}</span>
          <button type="button" class="qty-plus" aria-label="수량 증가">
           <svg width="34" height="34" style="display: block;">
            <use href="assets/icons/sprite.svg#icon-order-plus"></use>
           </svg>
          </button>
        </div>
      </div>
      <div class="col-price">
        <span class="item-total-price">${Utils.formatNumber(
          item.product.price * item.quantity
        )}원</span>
        <button type="button" class="order-item-btn">주문하기</button>
      </div>
      <button type="button" class="item-delete-btn" aria-label="${
        item.product.name
      } 삭제">&times;</button>
    `;
  li.querySelector(".qty-plus").onclick = onIncrease;
  li.querySelector(".qty-minus").onclick = onDecrease;
  li.querySelector(".item-delete-btn").onclick = onDelete;
  li.querySelector(".item-check").onchange = onCheck;
  li.querySelector(".order-item-btn").onclick = onSingleOrder;

  const qtyValEl = li.querySelector(".qty-val");
  if (qtyValEl) {
    qtyValEl.style.cursor = "pointer";
    qtyValEl.onclick = (e) => {
      e.stopPropagation();
      onOpenModal(item.id);
    };
  }

  return li;
}
