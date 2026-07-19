import PayPalComponent from "./Paypal";

function Payment({
  handleEventPayPal,
  handlePaymentCancel,
  handlePaymentError,
  createPayPalOrder,
  restaurantOrderId,
  isCreatingPayment,
}) {
  return (
    <div className="form-group">
      <PayPalComponent
        createPayPalOrder={createPayPalOrder}
        restaurantOrderId={restaurantOrderId}
        isCreatingPayment={isCreatingPayment}
        onSuccess={handleEventPayPal}
        onCancel={handlePaymentCancel}
        onError={handlePaymentError}
      />
    </div>
  );
}

export default Payment;


