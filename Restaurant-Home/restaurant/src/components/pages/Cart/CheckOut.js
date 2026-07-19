import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "../../../services/api";
import url from "../../../services/url";
import { getAccessToken } from "../../../utils/auth";

import LayoutPages from "../../layouts/LayoutPage";
import Payment from "../../Payment/index";

import "../../../public/css/checkout.css";

function CheckOut() {
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    phone: "",
    address: "",
    paymentMethod: "card",
  });

  const [paymentDetails, setPaymentDetails] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  const [restaurantOrderId, setRestaurantOrderId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  /*
   * Dùng ref để tránh tạo nhiều order/payment khi PayPal
   * gọi createOrder nhiều lần hoặc người dùng bấm nhanh.
   */
  const restaurantOrderIdRef = useRef(null);
  const paymentIdRef = useRef(null);
  const creatingPayPalOrderRef = useRef(false);

  const navigate = useNavigate();

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

        setCustomerInfo((previous) => ({
          ...previous,
          ...response.data.data,

          /*
           * Không để profile ghi đè paymentMethod mặc định
           * nếu API không trả trường này.
           */
          paymentMethod:
            response.data.data?.paymentMethod ||
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

        setCartItems(selectedCartItems);

        /*
         * totalPrice chỉ dùng để hiển thị.
         * Backend vẫn phải tự lấy giá món và tính lại total.
         */
        const displayTotal = selectedCartItems.reduce(
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

    /*
     * Khi đổi phương thức thanh toán, reset dữ liệu nhập
     * và trạng thái PayPal cũ của lần checkout hiện tại.
     */
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
      return (
        JSON.parse(
          localStorage.getItem("selectedCartItems")
        ) || []
      );
    } catch (error) {
      console.error("Invalid selectedCartItems:", error);
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
    toast.error("One or more cart items are invalid.");
    return null;
  }

  return selectedCartItems;
};

  const buildOrderPayload = (
    selectedCartItems,
    paymentMethod
  ) => ({
    /*
     * Không gửi price, total, isPaid hoặc status.
     * Backend tự lấy giá từ database và tính total.
     */
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

  /*
   * Tạo order nội bộ trong database.
   *
   * Order sau khi tạo phải:
   * status = pending
   * isPaid = false
   */
  const createRestaurantOrder = async (
  paymentMethod = "paypal"
) => {
  if (restaurantOrderIdRef.current) {
    return restaurantOrderIdRef.current;
  }

  const selectedCartItems = validateCheckout();

  if (!selectedCartItems) {
    throw new Error("Checkout information is incomplete.");
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
console.log("customerInfo:", customerInfo);
  /*
   * Tạo bản ghi Payment PENDING.
   *
   * Backend phải lấy price từ order.getTotal(),
   * không lấy giá từ request frontend.
   */
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

  /*
   * Gọi backend để backend gọi PayPal Orders API.
   *
   * Hàm này trả PayPal Order ID cho PayPalButtons.
   */
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
    captureResult?.paymentStatus !==
    "COMPLETED"
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
      const orderId = await createRestaurantOrder(
        customerInfo.paymentMethod
      );

      removePurchasedItemsFromLocalStorage();

      toast.success(
        "Your order has been created successfully!"
      );

      resetPayPalCheckoutState();

      setTimeout(() => {
        navigate(`/order_confirm/${orderId}`);
      }, 1000);
    } catch (error) {
      console.error("Create order failed:", error);

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "There was an error creating your order."
      );
    }
  };

  return (
    <LayoutPages showBreadCrumb={false}>
      <div className="checkout-area default-padding">
        <div className="container">
          <div className="checkout-content">
            <h2>Checkout</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Name</label>

                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={customerInfo.fullName || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={customerInfo.phone || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  Address
                </label>

                <input
                  type="text"
                  id="address"
                  name="address"
                  value={customerInfo.address || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>

                <select
                  name="paymentMethod"
                  value={
                    customerInfo.paymentMethod || "card"
                  }
                  onChange={
                    handlePaymentMethodChange
                  }
                >
                  <option value="card">
                    Credit/Debit Card
                  </option>

                  <option value="bank">
                    Bank Transfer
                  </option>

                  <option value="paypal">
                    PayPal
                  </option>
                </select>
              </div>

              {(customerInfo.paymentMethod === "card" ||
                customerInfo.paymentMethod === "bank") && (
                  <div className="payment-details-container">
                    {customerInfo.paymentMethod ===
                      "card" && (
                        <div className="form-group">
                          <label htmlFor="paymentDetails">
                            Card Details
                          </label>

                          <input
                            type="text"
                            id="paymentDetails"
                            value={paymentDetails}
                            onChange={
                              handlePaymentDetailsChange
                            }
                            required
                          />
                        </div>
                      )}

                    {customerInfo.paymentMethod ===
                      "bank" && (
                        <div className="form-group">
                          <label htmlFor="paymentDetails">
                            Bank Transfer Instructions
                          </label>

                          <textarea
                            id="paymentDetails"
                            value={paymentDetails}
                            onChange={
                              handlePaymentDetailsChange
                            }
                            required
                          />
                        </div>
                      )}
                  </div>
                )}

              <div className="order-summary_checkout">
                <h3>Order Summary</h3>

                <ul>
                  {cartItems.map((item) => (
                    <li key={item.id}>
                      {item.name} x {item.quantity} - $
                      {(
                        Number(item.price || 0) *
                        Number(item.quantity || 0)
                      ).toFixed(2)}
                    </li>
                  ))}
                </ul>

                <p>
                  Total: ${Number(totalPrice).toFixed(2)}
                </p>
              </div>

              {customerInfo.paymentMethod ===
                "paypal" && (
                  <Payment
                    createPayPalOrder={createPayPalOrder}
                    handleEventPayPal={handlePayPalSuccess}
                    handlePaymentCancel={() => {
                      toast.info("Payment was cancelled.");
                    }}
                    handlePaymentError={(error) => {
                      console.error(error);
                      toast.error("PayPal payment error.");
                    }}
                    restaurantOrderId={restaurantOrderId}
                    isCreatingPayment={isCreatingPayment}
                  />
                )}

              {customerInfo.paymentMethod !==
                "paypal" && (
                  <div className="button-container">
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      Place Order
                    </button>
                  </div>
                )}
            </form>
          </div>
        </div>
      </div>

      <ToastContainer />
    </LayoutPages>
  );
}

export default CheckOut;

