# Atelier template

Marketplace for handmade goods. Buyers sign up. Sellers run a studio. An admin approves products.

This is the contract of the live showcase app at https://atelier.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Storefront with makers, collection, product page and bag drawer
- My orders on its own page (`/orders`)
- Maker studio: overview with a six-month earnings chart, products with an AI "Write it for me" description writer, and orders (`/studio/products`, `/studio/orders`)
- Curator console with approvals (with undo) and marketplace sales (`/console/sales`)

Platform features it uses:

- Rules: stock limits, no buying your own product
- Payment webhook marks orders paid
- Buyers and sellers see only their own orders

| | |
|---|---|
| Tables | `buyer`, `seller`, `admin`, `product`, `cart_item`, `order`, `payment` |
| Custom screens | `AtelierLogin`, `Storefront`, `Studio`, `AdminConsole`, `MyOrders`, `TeamIntro` |
| Roles | `buyer` (consumer), `seller` (staff), `admin` (staff) |

Workflows:

- `order-placed`: Order placed: reserve stock and tell the maker
- `payment-callback`: Payment provider callback (inbound webhook)
- `payment-marks-paid`: A successful payment marks the order paid
- `order-paid`: Tell the maker an order is paid
- `order-shipped`: Tell the buyer their order shipped

## Screens

| Route | Page | Who |
|---|---|---|
| `/team` | Team & access | `admin` |
| `/shop` | Shop | `buyer`, `seller` |
| `/studio` | Studio | `seller` |
| `/console` | Console | `admin` |
| `/orders` | My orders | `buyer` |
| `/studio/products` | Studio products | `seller` |
| `/studio/orders` | Studio orders | `seller` |
| `/console/sales` | Sales | `admin` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New pages: `/orders` (new `MyOrders` screen), `/studio/products`, `/studio/orders` and `/console/sales`; the Team page has a new `TeamIntro` heading.
- Calmer type and colour: no text under 12px, muted text and buttons pass contrast, one ease-out curve instead of bouncy springs.
- Product photos re-matched to their products; studio earnings chart and a "Needs your attention" panel; undo in the curator console.
- Seeds rebuilt: 15 products and 35 orders from May to October.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Atelier"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-atelier
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Atelier template in
> templates/atelier/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
