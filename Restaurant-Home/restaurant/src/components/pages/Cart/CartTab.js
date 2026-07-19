import LayoutPages from "../../layouts/LayoutPage";
import BreadCrumb from "../../layouts/BreadCrumb";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../public/css/cart.css";

function CartTab() {
  const navigate = useNavigate();

  const breadcrumbPath = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/cart", label: "Cart" },
  ];

  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      setCartItems(Array.isArray(cart) ? cart : []);
    } catch (error) {
      console.error("Error loading cart:", error);
      setCartItems([]);
    }
  }, []);

  const saveCart = (cart) => {
    localStorage.setItem("cart", JSON.stringify(cart));
    setCartItems(cart);
  };

  const isSelectAll =
    cartItems.length > 0 &&
    selectedItems.size === cartItems.length;

  const handleSelectAllChange = () => {
    if (isSelectAll) {
      setSelectedItems(new Set());
      return;
    }

    setSelectedItems(
      new Set(cartItems.map((item) => item.id))
    );
  };

  const handleItemSelect = (id) => {
    setSelectedItems((previousItems) => {
      const nextItems = new Set(previousItems);

      if (nextItems.has(id)) {
        nextItems.delete(id);
      } else {
        nextItems.add(id);
      }

      return nextItems;
    });
  };

  const handleQuantityChange = (id, value) => {
    const parsedQuantity = Number.parseInt(value, 10);
    const nextQuantity =
      Number.isNaN(parsedQuantity) || parsedQuantity < 1
        ? 1
        : parsedQuantity;

    const updatedCart = cartItems.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: nextQuantity,
          }
        : item
    );

    saveCart(updatedCart);
  };

  const increaseQuantity = (id) => {
    const updatedCart = cartItems.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: Number(item.quantity || 1) + 1,
          }
        : item
    );

    saveCart(updatedCart);
  };

  const decreaseQuantity = (id) => {
    const updatedCart = cartItems.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: Math.max(
              1,
              Number(item.quantity || 1) - 1
            ),
          }
        : item
    );

    saveCart(updatedCart);
  };

  const handleRemoveItem = (id) => {
    const updatedCart = cartItems.filter(
      (item) => item.id !== id
    );

    saveCart(updatedCart);

    setSelectedItems((previousItems) => {
      const nextItems = new Set(previousItems);
      nextItems.delete(id);
      return nextItems;
    });
  };

  const selectedCartItems = cartItems.filter((item) =>
    selectedItems.has(item.id)
  );

  const selectedQuantity = selectedCartItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const totalPrice = selectedCartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const formatPrice = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const handleCheckout = () => {
    if (selectedCartItems.length === 0) {
      return;
    }

    localStorage.setItem(
      "selectedCartItems",
      JSON.stringify(selectedCartItems)
    );

    navigate("/check_out");
  };

  return (
    <LayoutPages showBreadCrumb={false}>
      <BreadCrumb
        title="Shopping Cart"
        path={breadcrumbPath}
      />

      <section className="cart-page-section">
        <div className="cart-page-wrapper">
          <div className="cart-page-heading">
            <div>
              <span className="cart-page-subtitle">
                Your selections
              </span>

              <h2>Shopping Cart</h2>

              <p>
                Review your selected food items and adjust their
                quantities before checkout.
              </p>
            </div>

            <div className="cart-count-card">
              <div className="cart-count-icon">
                <i className="fa fa-shopping-basket"></i>
              </div>

              <div>
                <span>Cart items</span>
                <strong>{cartItems.length}</strong>
              </div>
            </div>
          </div>

          {cartItems.length > 0 ? (
            <div className="cart-page-layout">
              <main className="cart-products-column">
                <div className="cart-selection-toolbar">
                  <label className="cart-select-all">
                    <input
                      type="checkbox"
                      checked={isSelectAll}
                      onChange={handleSelectAllChange}
                    />

                    <span className="cart-custom-checkbox">
                      <i className="fa fa-check"></i>
                    </span>

                    <span>
                      Select all products
                    </span>
                  </label>

                  <span className="cart-selected-count">
                    {selectedItems.size} selected
                  </span>
                </div>

                <div className="cart-product-list">
                  {cartItems.map((item) => {
                    const isSelected =
                      selectedItems.has(item.id);

                    const quantity =
                      Number(item.quantity) || 1;

                    const subtotal =
                      Number(item.price || 0) *
                      quantity;

                    return (
                      <article
                        key={item.id}
                        className={`cart-product-card ${
                          isSelected
                            ? "cart-product-selected"
                            : ""
                        }`}
                        onClick={() =>
                          handleItemSelect(item.id)
                        }
                      >
                        <div className="cart-product-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleItemSelect(item.id)
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          />

                          <span className="cart-custom-checkbox">
                            <i className="fa fa-check"></i>
                          </span>
                        </div>

                        <div className="cart-product-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name || "Food"}
                            />
                          ) : (
                            <div className="cart-image-placeholder">
                              <i className="fa fa-cutlery"></i>
                            </div>
                          )}
                        </div>

                        <div className="cart-product-content">
                          <div className="cart-product-top">
                            <div>
                              <span className="cart-product-label">
                                Food item
                              </span>

                              <h3>
                                {item.name ||
                                  "Unnamed product"}
                              </h3>
                            </div>

                            <button
                              type="button"
                              className="cart-remove-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveItem(item.id);
                              }}
                              aria-label={`Remove ${
                                item.name || "item"
                              }`}
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </div>

                          <div className="cart-product-bottom">
                            <div className="cart-product-price">
                              <span>Unit price</span>

                              <strong>
                                ${formatPrice(item.price)}
                              </strong>
                            </div>

                            <div
                              className="cart-quantity-control"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(item.id)
                                }
                              >
                                <i className="fa fa-minus"></i>
                              </button>

                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    item.id,
                                    event.target.value
                                  )
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(item.id)
                                }
                              >
                                <i className="fa fa-plus"></i>
                              </button>
                            </div>

                            <div className="cart-product-subtotal">
                              <span>Subtotal</span>

                              <strong>
                                ${formatPrice(subtotal)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </main>

              <aside className="cart-summary-column">
                <div className="cart-summary-card">
                  <span className="cart-summary-label">
                    Payment summary
                  </span>

                  <h3>Order Summary</h3>

                  <div className="cart-summary-row">
                    <span>Selected products</span>
                    <strong>
                      {selectedCartItems.length}
                    </strong>
                  </div>

                  <div className="cart-summary-row">
                    <span>Total quantity</span>
                    <strong>{selectedQuantity}</strong>
                  </div>

                  <div className="cart-summary-row">
                    <span>Delivery fee</span>
                    <strong className="cart-free-text">
                      Free
                    </strong>
                  </div>

                  <div className="cart-summary-divider"></div>

                  <div className="cart-summary-total">
                    <span>Total</span>

                    <strong>
                      ${formatPrice(totalPrice)}
                    </strong>
                  </div>

                  {selectedCartItems.length === 0 && (
                    <div className="cart-selection-warning">
                      <i className="fa fa-info-circle"></i>
                      Select at least one item to checkout.
                    </div>
                  )}

                  <button
                    type="button"
                    className="cart-checkout-button"
                    disabled={
                      selectedCartItems.length === 0
                    }
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                    <i className="fa fa-arrow-right"></i>
                  </button>

                  <Link
                    to="/shop"
                    className="cart-continue-button"
                  >
                    <i className="fa fa-arrow-left"></i>
                    Continue Shopping
                  </Link>

                  <div className="cart-secure-note">
                    <i className="fa fa-lock"></i>

                    <span>
                      Secure checkout and protected payment.
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="cart-empty-state">
              <div className="cart-empty-icon">
                <i className="fa fa-shopping-cart"></i>
              </div>

              <h3>Your cart is empty</h3>

              <p>
                Add your favorite food items and they will appear
                here.
              </p>

              <Link
                to="/shop"
                className="cart-shop-button"
              >
                <i className="fa fa-cutlery"></i>
                Explore Menu
              </Link>
            </div>
          )}

          <div className="cart-help-card">
            <div className="cart-help-icon">
              <i className="fa fa-headphones"></i>
            </div>

            <div>
              <h3>Need help with your cart?</h3>

              <p>
                Contact our support team at{" "}
                <strong>12345678</strong> if you experience any
                issues while ordering.
              </p>
            </div>
          </div>
        </div>
      </section>
    </LayoutPages>
  );
}

export default CartTab;