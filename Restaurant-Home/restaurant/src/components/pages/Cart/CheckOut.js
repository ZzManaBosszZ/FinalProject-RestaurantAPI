import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "../../../services/api";
import url from "../../../services/url";
import { getAccessToken } from "../../../utils/auth";

import LayoutPages from "../../layouts/LayoutPage";
import BreadCrumb from "../../layouts/BreadCrumb";
import Payment from "../../Payment/index";

import "../../../public/css/checkout.css";

function CheckOut() {
  const navigate = useNavigate();

  const breadcrumbPath = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/cart", label: "Cart" },
    { href: "/check_out", label: "Checkout" },
  ];

  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    phone: "",
    address: "",
    paymentMethod: "card",
  });

  const [paymentDetails, setPaymentDetails] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  const [restaurantOrderId, setRestaurantOrderId] =
    useState(null);

  const [paymentId, setPaymentId] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] =
    useState(false);

  const restaurantOrderIdRef = useRef(null);
  const paymentIdRef = useRef(null);
  const creatingPayPalOrderRef = useRef(false);

  const getHeaderConfig = () => ({
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get(
          url.AUTH.PROFILE,
          getHeaderConfig()
        );

        const profile = response.data?.data || {};

        setCustomerInfo((previous) => ({
          ...previous,
          ...profile,
          paymentMethod:
            profile.paymentMethod ||
            previous.paymentMethod ||
            "card",
        }));
      } catch (error) {
        console.error("Error loading profile:", error);

        toast.error(
          error.response?.data?.message ||
            "Cannot load your profile information."
        );
      }
    };

    const loadCartItems = () => {
      try {
        const selectedCartItems =
          JSON.parse(
            localStorage.getItem("selectedCartItems")
          ) || [];

        const normalizedItems = Array.isArray(
          selectedCartItems
        )
          ? selectedCartItems
          : [];

        setCartItems(normalizedItems);

        const displayTotal = normalizedItems.reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
              Number(item.quantity || 0),
          0
        );

        setTotalPrice(displayTotal);
      } catch (error) {
        console.error("Cannot read cart:", error);

        setCartItems([]);
        setTotalPrice(0);

        toast.error("Cart data is invalid.");
      }
    };

    loadProfile();
    loadCartItems();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setCustomerInfo((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePaymentMethodChange = (event) => {
    const paymentMethod = event.target.value;

    setCustomerInfo((previous) => ({
      ...previous,
      paymentMethod,
    }));

    setPaymentDetails("");

    if (paymentMethod !== "paypal") {
      resetPayPalCheckoutState();
    }
  };

  const handlePaymentDetailsChange = (event) => {
    setPaymentDetails(event.target.value);
  };

  const getSelectedCartItems = () => {
    try {
      const selectedCartItems =
        JSON.parse(
          localStorage.getItem("selectedCartItems")
        ) || [];

      return Array.isArray(selectedCartItems)
        ? selectedCartItems
        : [];
    } catch (error) {
      console.error(
        "Invalid selectedCartItems:",
        error
      );

      return [];
    }
  };

  const validateCheckout = () => {
    const selectedCartItems = getSelectedCartItems();

    if (selectedCartItems.length === 0) {
      toast.error("Please select at least one item.");
      return null;
    }

    if (!customerInfo.fullName?.trim()) {
      toast.error("Name is required.");
      return null;
    }

    if (!customerInfo.phone?.trim()) {
      toast.error("Phone number is required.");
      return null;
    }

    if (!customerInfo.address?.trim()) {
      toast.error("Address is required.");
      return null;
    }

    const invalidItem = selectedCartItems.find(
      (item) =>
        !item.id ||
        !item.quantity ||
        Number(item.quantity) <= 0
    );

    if (invalidItem) {
      toast.error(
        "One or more cart items are invalid."
      );

      return null;
    }

    return selectedCartItems;
  };

  const buildOrderPayload = (
    selectedCartItems,
    paymentMethod
  ) => ({
    foodQuantities: selectedCartItems.map((item) => ({
      foodId: item.id,
      quantity: Number(item.quantity),
    })),

    paymentMethod,
    phone: customerInfo.phone.trim(),
    address: customerInfo.address.trim(),
  });

  const removePurchasedItemsFromLocalStorage = () => {
    const selectedCartItems = getSelectedCartItems();

    let cart = [];

    try {
      cart =
        JSON.parse(localStorage.getItem("cart")) || [];
    } catch (error) {
      console.error("Invalid cart data:", error);
    }

    const remainingCart = cart.filter(
      (cartItem) =>
        !selectedCartItems.some(
          (selectedItem) =>
            selectedItem.id === cartItem.id
        )
    );

    localStorage.setItem(
      "cart",
      JSON.stringify(remainingCart)
    );

    localStorage.removeItem("selectedCartItems");

    setCartItems([]);
    setTotalPrice(0);
  };

  const resetPayPalCheckoutState = () => {
    restaurantOrderIdRef.current = null;
    paymentIdRef.current = null;
    creatingPayPalOrderRef.current = false;

    setRestaurantOrderId(null);
    setPaymentId(null);
    setIsCreatingPayment(false);
  };

  const createRestaurantOrder = async (
    paymentMethod = "paypal"
  ) => {
    if (restaurantOrderIdRef.current) {
      return restaurantOrderIdRef.current;
    }

    const selectedCartItems = validateCheckout();

    if (!selectedCartItems) {
      throw new Error(
        "Checkout information is incomplete."
      );
    }

    const payload = buildOrderPayload(
      selectedCartItems,
      paymentMethod
    );

    const response = await api.post(
      url.ORDER.CREATE,
      payload,
      getHeaderConfig()
    );

    const orderData = response.data?.data;

    const orderId =
      orderData?.id || orderData?.orderId;

    if (!orderId) {
      throw new Error(
        "Backend did not return the restaurant order ID."
      );
    }

    restaurantOrderIdRef.current = orderId;
    setRestaurantOrderId(orderId);

    return orderId;
  };

  const initializePayment = async (orderId) => {
    if (paymentIdRef.current) {
      return paymentIdRef.current;
    }

    const response = await api.post(
      url.PAYMENT.CREATE,
      {
        orderId,
        paymentMethod: "paypal",
      },
      getHeaderConfig()
    );

    const paymentData = response.data?.data;

    const newPaymentId =
      paymentData?.id || paymentData?.paymentId;

    if (!newPaymentId) {
      throw new Error(
        "Backend did not return the payment ID."
      );
    }

    paymentIdRef.current = newPaymentId;
    setPaymentId(newPaymentId);

    return newPaymentId;
  };

  const createPayPalOrder = async () => {
    if (creatingPayPalOrderRef.current) {
      throw new Error(
        "PayPal order is already being created."
      );
    }

    try {
      creatingPayPalOrderRef.current = true;
      setIsCreatingPayment(true);

      const orderId =
        await createRestaurantOrder("paypal");

      await initializePayment(orderId);

      const response = await api.post(
        url.PAYMENT.CREATE_PAYPAL_ORDER(orderId),
        {},
        getHeaderConfig()
      );

      const paypalData = response.data?.data;

      const paypalOrderId =
        paypalData?.paypalOrderId;

      if (!paypalOrderId) {
        throw new Error(
          "Backend did not return the PayPal order ID."
        );
      }

      return paypalOrderId;
    } catch (error) {
      console.error(
        "Create PayPal order failed:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Cannot create PayPal order."
      );

      throw error;
    } finally {
      creatingPayPalOrderRef.current = false;
      setIsCreatingPayment(false);
    }
  };

  const handlePayPalSuccess = async (
    captureResult
  ) => {
    if (
      captureResult?.paymentStatus !== "COMPLETED"
    ) {
      toast.error(
        "PayPal payment has not been completed."
      );

      return;
    }

    const orderId =
      captureResult.orderId ||
      restaurantOrderIdRef.current;

    removePurchasedItemsFromLocalStorage();

    toast.success(
      "Your payment was completed successfully!"
    );

    resetPayPalCheckoutState();

    navigate(`/order_confirm/${orderId}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (customerInfo.paymentMethod === "paypal") {
      return;
    }

    try {
      const orderId =
        await createRestaurantOrder(
          customerInfo.paymentMethod
        );

      removePurchasedItemsFromLocalStorage();

      toast.success(
        "Your order has been created successfully!"
      );

      resetPayPalCheckoutState();

      setTimeout(() => {
        navigate(`/order_confirm/${orderId}`);
      }, 800);
    } catch (error) {
      console.error("Create order failed:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "There was an error creating your order."
      );
    }
  };

  const formatPrice = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const totalQuantity = cartItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  if (cartItems.length === 0) {
    return (
      <LayoutPages showBreadCrumb={false}>
        <BreadCrumb
          title="Checkout"
          path={breadcrumbPath}
        />

        <section className="checkout-page-section">
          <div className="checkout-page-wrapper">
            <div className="checkout-empty-state">
              <div className="checkout-empty-icon">
                <i className="fa fa-shopping-cart"></i>
              </div>

              <h2>No products selected</h2>

              <p>
                Return to your cart and select at least one
                product before continuing to checkout.
              </p>

              <Link
                to="/cart"
                className="checkout-return-cart-button"
              >
                <i className="fa fa-arrow-left"></i>
                Return to Cart
              </Link>
            </div>
          </div>
        </section>

        <ToastContainer />
      </LayoutPages>
    );
  }

  return (
    <LayoutPages showBreadCrumb={false}>
      <BreadCrumb
        title="Checkout"
        path={breadcrumbPath}
      />

      <section className="checkout-page-section">
        <div className="checkout-page-wrapper">
          <div className="checkout-page-heading">
            <div>
              <span className="checkout-page-subtitle">
                Complete your purchase
              </span>

              <h2>Checkout</h2>

              <p>
                Enter your delivery information and choose a
                payment method to complete your order.
              </p>
            </div>

            <div className="checkout-secure-card">
              <div className="checkout-secure-icon">
                <i className="fa fa-lock"></i>
              </div>

              <div>
                <span>Secure checkout</span>
                <strong>Protected payment</strong>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="checkout-page-layout"
          >
            <main className="checkout-main-column">
              <article className="checkout-card">
                <div className="checkout-card-heading">
                  <div className="checkout-card-heading-icon">
                    <i className="fa fa-user"></i>
                  </div>

                  <div>
                    <span>Customer details</span>
                    <h3>Delivery Information</h3>
                  </div>
                </div>

                <div className="checkout-form-grid">
                  <div className="checkout-form-group checkout-full-width">
                    <label htmlFor="fullName">
                      Full name
                    </label>

                    <div className="checkout-input-wrapper">
                      <i className="fa fa-user"></i>

                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={
                          customerInfo.fullName || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="checkout-form-group">
                    <label htmlFor="phone">
                      Phone number
                    </label>

                    <div className="checkout-input-wrapper">
                      <i className="fa fa-phone"></i>

                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={
                          customerInfo.phone || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                  </div>

                  <div className="checkout-form-group">
                    <label htmlFor="address">
                      Delivery address
                    </label>

                    <div className="checkout-input-wrapper">
                      <i className="fa fa-map-marker"></i>

                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={
                          customerInfo.address || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter delivery address"
                        required
                      />
                    </div>
                  </div>
                </div>
              </article>

              <article className="checkout-card">
                <div className="checkout-card-heading">
                  <div className="checkout-card-heading-icon">
                    <i className="fa fa-credit-card"></i>
                  </div>

                  <div>
                    <span>Payment</span>
                    <h3>Payment Method</h3>
                  </div>
                </div>

                <div className="checkout-payment-options">
                  <label
                    className={`checkout-payment-option ${
                      customerInfo.paymentMethod === "card"
                        ? "checkout-payment-selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={
                        customerInfo.paymentMethod === "card"
                      }
                      onChange={
                        handlePaymentMethodChange
                      }
                    />

                    <div className="checkout-payment-icon">
                      <i className="fa fa-credit-card"></i>
                    </div>

                    <div>
                      <strong>Credit / Debit Card</strong>
                      <span>
                        Pay using your bank card
                      </span>
                    </div>

                    <div className="checkout-payment-radio">
                      <span></span>
                    </div>
                  </label>

                  <label
                    className={`checkout-payment-option ${
                      customerInfo.paymentMethod === "bank"
                        ? "checkout-payment-selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={
                        customerInfo.paymentMethod === "bank"
                      }
                      onChange={
                        handlePaymentMethodChange
                      }
                    />

                    <div className="checkout-payment-icon">
                      <i className="fa fa-university"></i>
                    </div>

                    <div>
                      <strong>Bank Transfer</strong>
                      <span>
                        Transfer directly from your bank
                      </span>
                    </div>

                    <div className="checkout-payment-radio">
                      <span></span>
                    </div>
                  </label>

                  <label
                    className={`checkout-payment-option ${
                      customerInfo.paymentMethod === "paypal"
                        ? "checkout-payment-selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={
                        customerInfo.paymentMethod ===
                        "paypal"
                      }
                      onChange={
                        handlePaymentMethodChange
                      }
                    />

                    <div className="checkout-payment-icon">
                      <i className="fa fa-paypal"></i>
                    </div>

                    <div>
                      <strong>PayPal</strong>
                      <span>
                        Pay securely with PayPal
                      </span>
                    </div>

                    <div className="checkout-payment-radio">
                      <span></span>
                    </div>
                  </label>
                </div>

                {customerInfo.paymentMethod === "card" && (
                  <div className="checkout-payment-details">
                    <div className="checkout-form-group checkout-full-width">
                      <label htmlFor="paymentDetails">
                        Card details
                      </label>

                      <div className="checkout-input-wrapper">
                        <i className="fa fa-credit-card"></i>

                        <input
                          type="text"
                          id="paymentDetails"
                          value={paymentDetails}
                          onChange={
                            handlePaymentDetailsChange
                          }
                          placeholder="Enter card information"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {customerInfo.paymentMethod === "bank" && (
                  <div className="checkout-payment-details">
                    <div className="checkout-form-group checkout-full-width">
                      <label htmlFor="paymentDetails">
                        Bank transfer information
                      </label>

                      <textarea
                        id="paymentDetails"
                        value={paymentDetails}
                        onChange={
                          handlePaymentDetailsChange
                        }
                        placeholder="Enter transfer information"
                        required
                      />
                    </div>
                  </div>
                )}

                {customerInfo.paymentMethod ===
                  "paypal" && (
                  <div className="checkout-paypal-container">
                    <div className="checkout-paypal-notice">
                      <i className="fa fa-info-circle"></i>

                      <span>
                        Confirm your delivery information before
                        clicking the PayPal button.
                      </span>
                    </div>

                    {isCreatingPayment && (
                      <div className="checkout-payment-loading">
                        <div className="checkout-small-spinner"></div>
                        <span>
                          Preparing PayPal payment...
                        </span>
                      </div>
                    )}

                    <Payment
                      createPayPalOrder={createPayPalOrder}
                      handleEventPayPal={
                        handlePayPalSuccess
                      }
                      handlePaymentCancel={() => {
                        toast.info(
                          "Payment was cancelled."
                        );
                      }}
                      handlePaymentError={(error) => {
                        console.error(error);

                        toast.error(
                          "PayPal payment error."
                        );
                      }}
                      restaurantOrderId={
                        restaurantOrderId
                      }
                      isCreatingPayment={
                        isCreatingPayment
                      }
                    />
                  </div>
                )}
              </article>
            </main>

            <aside className="checkout-summary-column">
              <div className="checkout-summary-card">
                <span className="checkout-summary-label">
                  Your order
                </span>

                <h3>Order Summary</h3>

                <div className="checkout-summary-items">
                  {cartItems.map((item) => {
                    const quantity =
                      Number(item.quantity || 0);

                    const subtotal =
                      Number(item.price || 0) *
                      quantity;

                    return (
                      <div
                        key={item.id}
                        className="checkout-summary-item"
                      >
                        <div className="checkout-summary-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={
                                item.name || "Food"
                              }
                            />
                          ) : (
                            <div className="checkout-image-placeholder">
                              <i className="fa fa-cutlery"></i>
                            </div>
                          )}
                        </div>

                        <div className="checkout-summary-item-info">
                          <strong>
                            {item.name ||
                              "Unnamed product"}
                          </strong>

                          <span>
                            ${formatPrice(item.price)} ×{" "}
                            {quantity}
                          </span>
                        </div>

                        <strong className="checkout-summary-item-price">
                          ${formatPrice(subtotal)}
                        </strong>
                      </div>
                    );
                  })}
                </div>

                <div className="checkout-summary-divider"></div>

                <div className="checkout-summary-row">
                  <span>Products</span>
                  <strong>{cartItems.length}</strong>
                </div>

                <div className="checkout-summary-row">
                  <span>Total quantity</span>
                  <strong>{totalQuantity}</strong>
                </div>

                <div className="checkout-summary-row">
                  <span>Delivery fee</span>
                  <strong className="checkout-free-text">
                    Free
                  </strong>
                </div>

                <div className="checkout-summary-divider"></div>

                <div className="checkout-summary-total">
                  <span>Total</span>

                  <strong>
                    ${formatPrice(totalPrice)}
                  </strong>
                </div>

                {customerInfo.paymentMethod !==
                  "paypal" && (
                  <button
                    type="submit"
                    className="checkout-place-order-button"
                  >
                    Place Order
                    <i className="fa fa-arrow-right"></i>
                  </button>
                )}

                <Link
                  to="/cart"
                  className="checkout-back-cart-button"
                >
                  <i className="fa fa-arrow-left"></i>
                  Back to Cart
                </Link>

                <div className="checkout-security-note">
                  <i className="fa fa-lock"></i>

                  <span>
                    Your payment information is protected.
                  </span>
                </div>
              </div>
            </aside>
          </form>

          <div className="checkout-help-card">
            <div className="checkout-help-icon">
              <i className="fa fa-headphones"></i>
            </div>

            <div>
              <h3>Need help completing your order?</h3>

              <p>
                Contact our support team at{" "}
                <strong>12345678</strong> if you experience any
                checkout or payment issues.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ToastContainer />
    </LayoutPages>
  );
}

export default CheckOut;

