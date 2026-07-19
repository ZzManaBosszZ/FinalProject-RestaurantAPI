import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import axios from "axios";
import LayoutPages from "../../layouts/LayoutPage";
import BreadCrumb from "../../layouts/BreadCrumb";
import "../../../public/css/orderConfirm.css";

function OrderConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const breadcrumbPath = [
    { href: "/", label: "Home" },
    { href: "/orderList", label: "My Orders" },
    { href: `/order_confirm/${id}`, label: "Order Details" },
  ];

  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchOrderDetail = async () => {
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
          `http://localhost:8080/api/v1/orders/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setOrderDetail(response.data?.data || null);
      } catch (error) {
        console.error("Error fetching order detail:", error);

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          Cookies.remove("access_token");
          navigate("/login");
          return;
        }

        if (error.response?.status === 404) {
          setErrorMessage(
            "Order not found or this order does not belong to you."
          );
        } else {
          setErrorMessage(
            error.response?.data?.message ||
              "Unable to load order details."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id, navigate]);

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
        return "order-confirm-status-success";

      case "cancelled":
      case "canceled":
      case "failed":
        return "order-confirm-status-danger";

      case "processing":
      case "confirmed":
        return "order-confirm-status-processing";

      default:
        return "order-confirm-status-pending";
    }
  };

  if (loading) {
    return (
      <LayoutPages showBreadCrumb={false}>
        <div className="order-confirm-loading">
          <div className="order-confirm-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </LayoutPages>
    );
  }

  if (errorMessage) {
    return (
      <LayoutPages showBreadCrumb={false}>
        <BreadCrumb
          title="Order Details"
          path={breadcrumbPath}
        />

        <section className="order-confirm-section">
          <div className="order-confirm-wrapper">
            <div className="order-confirm-error">
              <div className="order-confirm-error-icon">
                <i className="fa fa-exclamation-circle"></i>
              </div>

              <h3>Unable to open this order</h3>
              <p>{errorMessage}</p>

              <Link
                to="/orderList"
                className="order-confirm-back-button"
              >
                <i className="fa fa-arrow-left"></i>
                Back to My Orders
              </Link>
            </div>
          </div>
        </section>
      </LayoutPages>
    );
  }

  if (!orderDetail) {
    return null;
  }

  const items =
    orderDetail.orderDetail?.foodOrderDetails || [];

  const user = orderDetail.orderDetail?.user;

  const isPaid =
    orderDetail.paid === true ||
    orderDetail.isPaid === true;

  const statusClass = getStatusClass(orderDetail.status);

  return (
    <LayoutPages showBreadCrumb={false}>
      <BreadCrumb
        title="Order Details"
        path={breadcrumbPath}
      />

      <section className="order-confirm-section">
        <div className="order-confirm-wrapper">
          <div className="order-confirm-heading">
            <div>
              <span className="order-confirm-subtitle">
                Purchase details
              </span>

              <h2>Order Details</h2>

              <p>
                Review the products, payment and delivery
                information for this order.
              </p>
            </div>

            <span
              className={`order-confirm-status ${statusClass}`}
            >
              <span className="order-confirm-status-dot"></span>
              {orderDetail.status || "Pending"}
            </span>
          </div>

          <div className="order-confirm-layout">
            <main className="order-confirm-main">
              <article className="order-confirm-card">
                <div className="order-confirm-card-header">
                  <div className="order-confirm-title-group">
                    <div className="order-confirm-title-icon">
                      <i className="fa fa-file-text-o"></i>
                    </div>

                    <div>
                      <span>Order code</span>
                      <h3>
                        {orderDetail.orderCode ||
                          `Order #${orderDetail.id}`}
                      </h3>
                    </div>
                  </div>

                  <div className="order-confirm-date">
                    <i className="fa fa-calendar"></i>
                    <span>
                      {formatDate(orderDetail.createdDate)}
                    </span>
                  </div>
                </div>

                <div className="order-confirm-info-grid">
                  <div className="order-confirm-info-item">
                    <div className="order-confirm-info-icon">
                      <i className="fa fa-user"></i>
                    </div>

                    <div>
                      <span>Customer</span>
                      <strong>
                        {user?.fullName || "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="order-confirm-info-item">
                    <div className="order-confirm-info-icon">
                      <i className="fa fa-envelope"></i>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>
                        {user?.email || "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="order-confirm-info-item">
                    <div className="order-confirm-info-icon">
                      <i className="fa fa-phone"></i>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>
                        {orderDetail.customerPhone ||
                          "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="order-confirm-info-item">
                    <div className="order-confirm-info-icon">
                      <i className="fa fa-credit-card"></i>
                    </div>

                    <div>
                      <span>Payment method</span>
                      <strong>
                        {orderDetail.paymentMethod || "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="order-confirm-address">
                  <div className="order-confirm-address-icon">
                    <i className="fa fa-map-marker"></i>
                  </div>

                  <div>
                    <span>Delivery address</span>
                    <p>
                      {orderDetail.deliveryAddress ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="order-confirm-card">
                <div className="order-items-heading">
                  <div>
                    <span className="order-confirm-section-label">
                      Products
                    </span>

                    <h3>Order Items</h3>
                  </div>

                  <span className="order-items-count">
                    {items.length}{" "}
                    {items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="order-confirm-items">
                  {items.length > 0 ? (
                    items.map((item) => {
                      const quantity =
                        Number(item.quantity) || 0;

                      const unitPrice =
                        Number(item.unitPrice) || 0;

                      const subtotal =
                        quantity * unitPrice;

                      return (
                        <div
                          key={item.id}
                          className="order-confirm-item"
                        >
                          <div className="order-confirm-item-image">
                            {item.food?.image ? (
                              <img
                                src={item.food.image}
                                alt={
                                  item.food?.name || "Food"
                                }
                              />
                            ) : (
                              <div className="order-image-placeholder">
                                <i className="fa fa-cutlery"></i>
                              </div>
                            )}
                          </div>

                          <div className="order-confirm-item-content">
                            <div className="order-confirm-item-name">
                              <h4>
                                {item.food?.name ||
                                  "Unknown item"}
                              </h4>

                              <span>
                                ${formatPrice(unitPrice)}
                              </span>
                            </div>

                            <div className="order-confirm-item-meta">
                              <span>
                                <i className="fa fa-cubes"></i>
                                Quantity: {quantity}
                              </span>

                              <strong>
                                Subtotal: $
                                {formatPrice(subtotal)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="order-confirm-no-items">
                      <i className="fa fa-shopping-basket"></i>
                      <p>No items found in this order.</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="order-confirm-help-card">
                <div className="order-confirm-help-icon">
                  <i className="fa fa-headphones"></i>
                </div>

                <div>
                  <h3>Need help with this order?</h3>

                  <p>
                    Contact our support team at{" "}
                    <strong>12345678</strong> if you have any
                    questions about delivery or payment.
                  </p>
                </div>
              </article>
            </main>

            <aside className="order-confirm-sidebar">
              <div className="order-summary-card">
                <span className="order-confirm-section-label">
                  Payment summary
                </span>

                <h3>Order Summary</h3>

                <div className="order-summary-row">
                  <span>Items</span>
                  <strong>{items.length}</strong>
                </div>

                <div className="order-summary-row">
                  <span>Payment status</span>

                  <strong
                    className={
                      isPaid
                        ? "order-payment-paid"
                        : "order-payment-unpaid"
                    }
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </strong>
                </div>

                <div className="order-summary-row">
                  <span>Order status</span>
                  <strong>
                    {orderDetail.status || "Pending"}
                  </strong>
                </div>

                <div className="order-summary-divider"></div>

                <div className="order-summary-total">
                  <span>Total</span>

                  <strong>
                    ${formatPrice(orderDetail.total)}
                  </strong>
                </div>

                <Link
                  to="/orderList"
                  className="order-confirm-back-button"
                >
                  <i className="fa fa-arrow-left"></i>
                  Back to My Orders
                </Link>

                <Link
                  to="/shop"
                  className="order-confirm-shop-button"
                >
                  Continue Shopping
                  <i className="fa fa-shopping-cart"></i>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </LayoutPages>
  );
}

export default OrderConfirm;