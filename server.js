import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(bodyParser.json());

const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

// 🟢 Serve the marketing preferences page with current status
app.get("/marketing-preferences", async (req, res) => {
    const customerId = req.query.id;
    let accepts = false;
    let message = "Loading...";

    if (customerId) {
        try {
            const response = await fetch(`https://${SHOP}/admin/api/2024-10/customers/${customerId}.json`, {
                headers: {
                    "X-Shopify-Access-Token": TOKEN,
                    "Content-Type": "application/json",
                },
            });
            if (response.ok) {
                const data = await response.json();
                const customer = data.customer;

                // Check both possible fields
                accepts =
                    customer.accepts_marketing ||
                    (customer.email_marketing_consent &&
                        customer.email_marketing_consent.state === "subscribed");

                message = accepts ?
                    "You are currently subscribed to marketing emails." :
                    "You are currently not subscribed to marketing emails.";
            } else {
                message = "⚠️ Unable to load current status.";
            }
        } catch (err) {
            console.error("Error fetching customer:", err);
            message = "⚠️ Error fetching customer data.";
        }
    }

    res.send(`
    <html>
      <head>
        <title>Marketing Preferences</title>
        <style>
          @font-face {
            font-display: swap;
            font-family: "Bentley";
            font-style: normal;
            font-weight: 300;
            src: url("/bentley-light-webfont.woff2") format("woff2"),
                 url("/bentley-light-webfont.woff") format("woff");
          }

          @font-face {
            font-display: swap;
            font-family: "Bentley";
            font-style: normal;
            font-weight: 600;
            src: url("/bentley-semibold-webfont.woff2") format("woff2"),
                 url("/bentley-semibold-webfont.woff") format("woff");
          }

          body {
            font-family: "Bentley", "Helvetica Neue", Helvetica, Arial, sans-serif;
            max-width: 420px;
            margin: 2rem auto;
            text-align: center;
          }
          .button, body .buorg .buorg-buttons a, button, input[type=submit] {
              font-family: "Bentley", "Helvetica Neue", Helvetica, Arial, sans-serif;
              font-size: 14px;
              font-size: .875rem;
              line-height: 1.4285714286;
              text-transform: uppercase;
              position: relative;
              display: inline-block;
              padding: 1rem;
              border: 1px solid rgba(0, 0, 0, 0);
              color: #fff;
              background-color: #486b5d;
              cursor: pointer;
              min-width: 220px;
              text-align: center;
              transition: background-color .2s cubic-bezier(0.75, 0.02, 0.5, 1), fill .2s cubic-bezier(0.75, 0.02, 0.5, 1), color .2s cubic-bezier(0.75, 0.02, 0.5, 1);
          }
          .button--secondary {
              background-color: rgba(0, 0, 0, 0);
              border-color: #000;
              color: #000;
          }
          .button--secondary:active:not([disabled]), .button--secondary:focus:not([disabled]), .button--secondary:hover:not([disabled]) {
              background-color: rgba(0, 0, 0, .1);
          }
          h2 { margin-bottom: 0.5rem; }
          .toggle-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 1.5rem 0;
          }
          .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 28px;
          }
          .switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 34px;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
          }
          input:checked + .slider {
            background-color: #486b5d; /* green */
          }
          input:checked + .slider:before {
            transform: translateX(22px);
          }
          button {
            margin-top: 1rem;
            padding: 0.6rem 1.2rem;
            cursor: pointer;
            border: none;
            background: #2563eb;
            color: white;
            border-radius: 0;
            font-size: 1rem;
          }
          #msg {
            margin-top: 1rem;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <p id="current-status">${message}</p>

        <form id="form">
          <div class="toggle-container">
            <label class="switch">
              <input type="checkbox" id="marketing" ${accepts ? "checked" : ""}/>
              <span class="slider"></span>
            </label>
            <span id="status-label">${accepts ? "Subscribed" : "Unsubscribed"}</span>
          </div>
          <button type="submit" class="button button--secondary">Save Preferences</button>
        </form>

        <p id="msg"></p>

        <script>
          const checkbox = document.getElementById('marketing');
          const label = document.getElementById('status-label');
          const statusText = document.getElementById('current-status');

          checkbox.addEventListener('change', () => {
            const checked = checkbox.checked;
            label.textContent = checked ? "Subscribed" : "Unsubscribed";
            statusText.textContent = checked
              ? "You are currently subscribed to marketing emails."
              : "You are currently not subscribed to marketing emails.";
          });

          document.getElementById('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const acceptsMarketing = checkbox.checked;
            const id = new URLSearchParams(window.location.search).get('id');

            const res = await fetch('/api/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, acceptsMarketing })
            });
            const data = await res.json();
            document.getElementById('msg').textContent = data.message;
          });
        </script>
      </body>
    </html>
  `);
});

// 🟣 API route to update preference
app.post("/api/update", async (req, res) => {
    const {
        id,
        acceptsMarketing
    } = req.body;

    try {
        const response = await fetch(`https://${SHOP}/admin/api/2024-10/customers/${id}.json`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": TOKEN,
            },
            body: JSON.stringify({
                customer: {
                    id,
                    accepts_marketing: acceptsMarketing,
                    email_marketing_consent: {
                        state: acceptsMarketing ? "subscribed" : "unsubscribed",
                        opt_in_level: "single_opt_in",
                        consent_updated_at: new Date().toISOString(),
                    },
                },
            }),
        });

        if (response.ok) {
            res.json({
                message: acceptsMarketing ?
                    "✅ You are now subscribed to marketing emails." :
                    "❌ You have unsubscribed from marketing emails.",
            });
        } else {
            const errText = await response.text();
            console.error("Error:", errText);
            res.status(400).json({
                message: "Error updating preference ❌"
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({
            message: "Server error ❌"
        });
    }
});
app.listen(process.env.PORT || 3000, () =>
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`)
);