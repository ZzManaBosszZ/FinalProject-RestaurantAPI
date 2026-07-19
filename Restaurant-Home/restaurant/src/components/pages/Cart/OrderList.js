import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import LayoutPages from "../../layouts/LayoutPage";
import BreadCrumb from "../../layouts/BreadCrumb";
import "../../../public/css/OrderList.css";

function OrderList() {
  const navigate = useNavigate();

  const breadcrumbPath = [
    { href: "/", label: "Home" },
    { href: "/orderList", label: "My Orders" },
  ];

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const token = Cookies.get("access_token");

      if (!token) {
        setLoading(false);
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await axios.get(
          "http://localhost:8080/api/v1/orders/my-orders",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const orderData = response.data?.data;

        setOrders(Array.isArray(orderData) ? orderData : []);
      } catch (error) {
        console.error("Error loading order list:", error);

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          Cookies.remove("access_token");
          navigate("/login");
          return;
        }

        setErrorMessage(
          error.response?.data?.message ||
            "Unable to load your order history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const formatPrice = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const formatDate = (value) => {
    if (!value) {
      return "N/A";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
      case "completed":
      case "paid":
      case "delivered":
        return "order-status-success";

      case "cancelled":
      case "canceled":
      case "failed":
        return "order-status-danger";

      case "processing":
      case "confirmed":
        return "order-status-processing";

      default:
        return "order-status-pending";
    }
  };

  if (loading) {
    return (
      <LayoutPages showBreadCrumb={false}>
        <div className="order-loading-container">
          <div className="order-loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </LayoutPages>
    );
  }

  return (
    <LayoutPages showBreadCrumb={false}>
      <BreadCrumb title="My Orders" path={breadcrumbPath} />

      <section className="order-history-section">
        <div className="order-history-wrapper">
          <div className="order-history-heading">
            <div>
              <span className="order-history-subtitle">
                Purchase history
              </span>

              <h2>My Orders</h2>

              <p>
                Review your previous orders, payment details and
                delivery information.
              </p>
            </div>

            <div className="order-history-count">
              <i className="fa fa-shopping-bag"></i>

              <div>
                <span>Total orders</span>
                <strong>{orders.length}</strong>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="order-message-card order-error-card">
              <div className="order-message-icon">
                <i className="fa fa-exclamation-circle"></i>
              </div>

              <div>
                <h4>Unable to load orders</h4>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {!errorMessage && orders.length === 0 && (
            <div className="order-empty-state">
              <div className="order-empty-icon">
                <i className="fa fa-shopping-basket"></i>
              </div>

              <h3>No orders yet</h3>

              <p>
                You have not placed any orders. Start shopping and
                your order history will appear here.
              </p>

              <Link to="/shop" className="order-shop-button">
                <i className="fa fa-shopping-cart"></i>
                Start Shopping
              </Link>
            </div>
          )}

          {!errorMessage && orders.length > 0 && (
            <div className="order-list-content-container">
              {orders.map((order) => {
                const isPaid =
                  order.paid === true ||
                  order.isPaid === true;

                const statusClass = getStatusClass(order.status);

                return (
                  <article
                    key={order.id}
                    className="order-card-item-container"
                  >
                    <div className="order-card-top">
                      <div className="order-code-section">
                        <div className="order-icon-box">
                          <i className="fa fa-receipt"></i>
                        </div>

                        <div>
                          <span className="order-small-label">
                            Order code
                          </span>

                          <h4 className="order-code">
                            {order.orderCode ||
                              `Order #${order.id}`}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`order-status-badge ${statusClass}`}
                      >
                        <span className="order-status-dot"></span>
                        {order.status || "Pending"}
                      </span>
                    </div>

                    <div className="order-card-divider"></div>

                    <div className="order-information-grid">
                      <div className="order-information-item">
                        <div className="order-information-icon">
                          <i className="fa fa-calendar"></i>
                        </div>

                        <div>
                          <span>Order date</span>
                          <strong>
                            {formatDate(order.createdDate)}
                          </strong>
                        </div>
                      </div>

                      <div className="order-information-item">
                        <div className="order-information-icon">
                          <i className="fa fa-credit-card"></i>
                        </div>

                        <div>
                          <span>Payment method</span>
                          <strong>
                            {order.paymentMethod || "N/A"}
                          </strong>
                        </div>
                      </div>

                      <div className="order-information-item">
                        <div className="order-information-icon">
                          <i
                            className={
                              isPaid
                                ? "fa fa-check-circle"
                                : "fa fa-clock"
                            }
                          ></i>
                        </div>

                        <div>
                          <span>Payment status</span>

                          <strong
                            className={
                              isPaid
                                ? "payment-status-paid"
                                : "payment-status-unpaid"
                            }
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                          </strong>
                        </div>
                      </div>

                      {order.customerPhone && (
                        <div className="order-information-item">
                          <div className="order-information-icon">
                            <i className="fa fa-phone"></i>
                          </div>

                          <div>
                            <span>Phone</span>
                            <strong>
                              {order.customerPhone}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {order.deliveryAddress && (
                      <div className="order-address-box">
                        <div className="order-address-icon">
                          <i className="fa fa-map-marker"></i>
                        </div>

                        <div>
                          <span>Delivery address</span>
                          <p>{order.deliveryAddress}</p>
                        </div>
                      </div>
                    )}

                    <div className="order-card-footer">
                      <div className="order-total-section">
                        <span>Order total</span>

                        <strong>
                          ${formatPrice(order.total)}
                        </strong>
                      </div>

                      <Link
                        to={`/order_confirm/${order.id}`}
                        className="view-order-details-button"
                      >
                        View Details
                        <i className="fa fa-arrow-right"></i>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="order-help-box">
            <div className="order-help-icon">
              <i className="fa fa-headphones"></i>
            </div>

            <div>
              <h3>Need help with your order?</h3>

              <p>
                Contact our support team at{" "}
                <strong>12345678</strong> if you have any
                questions about your order.
              </p>
            </div>
          </div>
        </div>
      </section>
    </LayoutPages>
  );
}

export default OrderList;