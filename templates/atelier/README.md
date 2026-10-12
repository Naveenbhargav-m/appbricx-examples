# Atelier template

Marketplace for handmade goods. Buyers sign up. Sellers run a studio. An admin approves products.

This is the contract of the live showcase app at https://atelier.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Shop with product pages and a cart
- Orders with a status timeline
- Seller studio with stock and earnings

Platform features it uses:

- Rules: stock limits, no buying your own product
- Payment webhook marks orders paid
- Buyers and sellers see only their own orders

| | |
|---|---|
| Tables | `buyer`, `seller`, `admin`, `product`, `cart_item`, `order`, `payment` |
| Custom screens | `AtelierLogin`, `Storefront`, `Studio`, `AdminConsole` |
| Roles | `buyer` (consumer), `seller` (staff), `admin` (staff) |

Workflows:

- `order-placed`: Order placed: reserve stock and tell the maker
- `payment-callback`: Payment provider callback (inbound webhook)
- `payment-marks-paid`: A successful payment marks the order paid
- `order-paid`: Tell the maker an order is paid
- `order-shipped`: Tell the buyer their order shipped

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
