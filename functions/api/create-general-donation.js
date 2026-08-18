export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const STRIPE_SECRET_KEY =
      env.STRIPE_SECRET_KEY;

    const TEAM_KEY =
      env.TEAM_KEY || "otb-baseball";

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse(
        {
          error: "Stripe is not configured."
        },
        500
      );
    }

    const body =
      await request.json();

    const donorName =
      String(
        body.donorName ||
        body.donor_name ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ");

    const amountDollars =
      Number(
        body.amount ||
        body.amountDollars ||
        0
      );

    if (!donorName) {
      return jsonResponse(
        {
          error:
            "Please enter a donor name or choose Anonymous."
        },
        400
      );
    }

    if (
      !Number.isFinite(amountDollars) ||
      amountDollars <= 0
    ) {
      return jsonResponse(
        {
          error:
            "Please enter a valid donation amount."
        },
        400
      );
    }

    const amountCents =
      Math.round(
        amountDollars * 100
      );

    if (amountCents < 100) {
      return jsonResponse(
        {
          error:
            "Minimum donation is $1."
        },
        400
      );
    }

    const origin =
      new URL(
        request.url
      ).origin;

    const form =
      new URLSearchParams();

    form.append(
      "mode",
      "payment"
    );

    form.append(
      "payment_method_types[0]",
      "card"
    );

    form.append(
      "line_items[0][price_data][currency]",
      "usd"
    );

    form.append(
      "line_items[0][price_data][unit_amount]",
      String(amountCents)
    );

    form.append(
      "line_items[0][price_data][product_data][name]",
      "OTB Baseball General Donation"
    );

    form.append(
      "line_items[0][price_data][product_data][description]",
      `General team donation from ${donorName}`
    );

    form.append(
      "line_items[0][quantity]",
      "1"
    );

    form.append(
      "success_url",
      `${origin}/?general_donation=success`
    );

    form.append(
      "cancel_url",
      `${origin}/?general_donation=canceled`
    );

    form.append(
      "metadata[donation_type]",
      "general"
    );

    form.append(
      "metadata[team_key]",
      TEAM_KEY
    );

    form.append(
      "metadata[donor_name]",
      donorName
    );

    form.append(
      "metadata[amount_cents]",
      String(amountCents)
    );

    const stripeResponse =
      await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${STRIPE_SECRET_KEY}`,

            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            form.toString()
        }
      );

    const stripeData =
      await stripeResponse.json();

    if (!stripeResponse.ok) {
      return jsonResponse(
        {
          error:
            stripeData?.error?.message ||
            "Unable to create donation checkout."
        },
        500
      );
    }

    return jsonResponse(
      {
        url:
          stripeData.url
      },
      200
    );

  } catch (error) {
    console.error(
      "General donation error:",
      error
    );

    return jsonResponse(
      {
        error:
          "Unexpected server error."
      },
      500
    );
  }
}


function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store"
      }
    }
  );
}
