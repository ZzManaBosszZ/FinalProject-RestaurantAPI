// import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
// import config from "../../config";

// export default function PayPalComponent({ amount, onSuccess, onCancel, onError }) {
//     const paypalClientId = config.key.PAYPAL_CLIENT_ID;
//     console.log(paypalClientId);

//     const initialOptions = {
//         clientId: paypalClientId,
//         currency: "USD",
//     };

//     return (
//         <PayPalScriptProvider
//             options={{
//                 components: "buttons",
//             }}
//         >
//             <PayPalButtons
//                 style={{ layout: "horizontal" }}
//                 createOrder={(data, actions) => {
//                     return actions.order.create({
//                         purchase_units: [
//                             {
//                                 amount: {
//                                     value: amount,
//                                     currency_code: initialOptions.currency,
//                                 },
//                             },
//                         ],
//                     });
//                 }}
//                 onApprove={(data, actions) => {
//                     return actions.order.capture().then(function (details) {
//                         onSuccess(details, data);
//                     });
//                 }}
//                 onCancel={(data) => onCancel(data)}
//                 onError={(err) => onError(err)}
//                 options={initialOptions}
//             />
//         </PayPalScriptProvider>
//     );
// }

import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import api from "../../services/api";
import url from "../../services/url";
import { getAccessToken } from "../../utils/auth";
import config from "../../config";

export default function PayPalComponent({
  createPayPalOrder,
  restaurantOrderId,
  isCreatingPayment,
  onSuccess,
  onCancel,
  onError,
}) {
  const paypalClientId =
    config.key.PAYPAL_CLIENT_ID;

  const initialOptions = {
    "client-id": paypalClientId,
    currency: "USD",
    intent: "capture",
    components: "buttons",
  };

  const handleCreateOrder = async () => {
    try {
      if (!createPayPalOrder) {
        throw new Error(
          "createPayPalOrder function is missing."
        );
      }

      /*
       * Hàm này gọi:
       * POST /orders
       * POST /payment
       * POST /payments/paypal/orders/{orderId}
       *
       * Sau đó trả về PayPal Order ID.
       */
      const paypalOrderId =
        await createPayPalOrder();

      if (!paypalOrderId) {
        throw new Error(
          "Backend did not return PayPal order ID."
        );
      }

      return paypalOrderId;
    } catch (error) {
      console.error(
        "Cannot create PayPal order:",
        error
      );

      if (onError) {
        onError(error);
      }

      throw error;
    }
  };

  const handleApprove = async (data) => {
  try {
    if (!data?.orderID) {
      throw new Error(
        "PayPal did not return order ID."
      );
    }

    const response = await api.post(
      url.PAYMENT.CAPTURE_PAYPAL_ORDER(
        data.orderID
      ),
      {},
      {
        headers: {
          Authorization:
            `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureResult =
      response.data?.data;

    if (
      captureResult?.paymentStatus !==
      "COMPLETED"
    ) {
      throw new Error(
        "PayPal payment has not been completed."
      );
    }

    if (onSuccess) {
      await onSuccess(captureResult);
    }
  } catch (error) {
    console.error(
      "PayPal capture failed:",
      error
    );

    if (onError) {
      onError(error);
    }

    throw error;
  }
};

  const handleCancel = (data) => {
    console.log(
      "PayPal payment cancelled:",
      data
    );

    if (onCancel) {
      onCancel(data);
    }
  };

  const handleError = (error) => {
    console.error(
      "PayPal button error:",
      error
    );

    if (onError) {
      onError(error);
    }
  };

  if (!paypalClientId) {
    return (
      <p>
        PayPal Client ID has not been configured.
      </p>
    );
  }

  return (
    <PayPalScriptProvider
      options={initialOptions}
    >
      <PayPalButtons
        style={{
          layout: "horizontal",
        }}

        disabled={isCreatingPayment}

        createOrder={handleCreateOrder}

        onApprove={handleApprove}

        onCancel={handleCancel}

        onError={handleError}
      />
    </PayPalScriptProvider>
  );
}

