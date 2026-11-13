# Hooddie components

Free React + Tailwind components for online stores: virtual try-on, a size finder, 360° spin, product cards, a bag drawer, checkout steps and more. 34 components, MIT licensed.

![Virtual try-on, compare slider, 360° spin and size finder](media/hooddie-demo.gif)

**Live demos and docs:** https://www.hooddie.com

## Install

Each component is one file that imports only React. Add one with the [shadcn CLI](https://ui.shadcn.com/docs/cli):

```bash
npx shadcn@latest add https://www.hooddie.com/r/virtual-try-on.json
```

Or copy the file from `registry/hooddie/` into your project. Components use the shadcn/ui colour tokens (`bg-primary`, `text-muted-foreground`, …), so they take on your theme. They work with React 18 or 19 and Tailwind 3.4 or later.

## Components

### Try-on

| Component | What it does |
|---|---|
| [Virtual try-on](https://www.hooddie.com/components/virtual-try-on) | The shopper adds a photo and sees the product on themselves. Bring any AI try-on service; the component handles the photo, the wait, the result and the privacy note. |
| [Before and after](https://www.hooddie.com/components/before-after) | A slider that compares two photos, such as the shopper's photo and the try-on result. Works with drag, touch and arrow keys. |
| [Size finder](https://www.hooddie.com/components/size-finder) | Height, weight and how the shopper likes it to fit in, a recommended size out, with how close the fit is and why. |

### Product

| Component | What it does |
|---|---|
| [Product card](https://www.hooddie.com/components/product-card) | A product tile with a second image on hover, colour swatches that swap the photo, and sale pricing. |
| [Product gallery](https://www.hooddie.com/components/product-gallery) | Main photo with thumbnails, arrow keys, and swipe on touch screens. |
| [Variant picker](https://www.hooddie.com/components/variant-picker) | Colour swatches and size buttons, with sold-out sizes crossed out and still announced to screen readers. |
| [Size guide](https://www.hooddie.com/components/size-guide) | A measurement table that switches between centimetres and inches and highlights one size. |
| [Sticky add to bag](https://www.hooddie.com/components/sticky-add-to-bag) | A bar that slides up from the bottom with the price and buy button once the main one scrolls out of view. |
| [Wishlist button](https://www.hooddie.com/components/wishlist-button) | A heart that saves a product, with its saved state in the markup and announced to screen readers. |
| [Back in stock](https://www.hooddie.com/components/back-in-stock) | An email form for a sold-out size that says when the shopper will hear back. |
| [Stock indicator](https://www.hooddie.com/components/stock-indicator) | In stock, only a few left, sold out or preorder, said in words and not only in colour. |
| [360° product spin](https://www.hooddie.com/components/product-spin) | Drag or use arrow keys to turn the product, from a set of photos taken around it. |
| [Complete the look](https://www.hooddie.com/components/complete-the-look) | Products that go with this one, ticked by default, with the total and one button to add them all. |

### Bag

| Component | What it does |
|---|---|
| [Quantity stepper](https://www.hooddie.com/components/quantity-stepper) | Minus, number, plus. Respects a minimum and maximum, and works with the keyboard. |
| [Add to bag](https://www.hooddie.com/components/add-to-bag) | The buy button with its states: ready, adding, added, sold out. Announces the result to screen readers. |
| [Bag drawer](https://www.hooddie.com/components/bag-drawer) | A slide-over bag with line items, quantity controls, subtotal and a checkout button. Traps focus and closes on Escape. |
| [Free shipping bar](https://www.hooddie.com/components/free-shipping-bar) | A progress bar that says how much more to spend for free shipping, and when it's reached. |
| [Order summary](https://www.hooddie.com/components/order-summary) | Line items, discount, shipping, tax and total for the bag or checkout page. |
| [Discount code](https://www.hooddie.com/components/discount-code) | A field for a discount code that shows the applied code, removes it, and explains why one didn't work. |

### Checkout

| Component | What it does |
|---|---|
| [Address form](https://www.hooddie.com/components/address-form) | Shipping address fields with the right autofill hints, country list and inline errors. |
| [Delivery options](https://www.hooddie.com/components/delivery-options) | Shipping methods as radio cards with delivery estimate and price, free ones marked. |
| [Checkout steps](https://www.hooddie.com/components/checkout-steps) | Where the shopper is in checkout, with finished steps as links back. |

### Browse

| Component | What it does |
|---|---|
| [Filter bar](https://www.hooddie.com/components/filter-bar) | Filter chips and a sort menu for a product listing, with a count and a clear-all button. |
| [Product search](https://www.hooddie.com/components/product-search) | A search box with product suggestions, keyboard selection, and a no-results state. |
| [Collection header](https://www.hooddie.com/components/collection-header) | The top of a category page: title, short description, product count and an optional photo. |
| [Mega menu](https://www.hooddie.com/components/mega-menu) | Store navigation with link columns and a featured product, opened by click or keyboard, closed with Escape. |
| [Breadcrumbs](https://www.hooddie.com/components/breadcrumbs) | The path to the current page, shortened in the middle on small screens. |
| [Load more](https://www.hooddie.com/components/load-more) | How many products are shown out of how many, with a progress line and a button for the next batch. |
| [Quick view](https://www.hooddie.com/components/quick-view) | A product in a dialog from the listing: photo, price, colour and size, and add to bag. Traps focus and closes on Escape. |

### Trust

| Component | What it does |
|---|---|
| [Reviews summary](https://www.hooddie.com/components/reviews-summary) | Average rating, a bar for each star count, and a short list of reviews. |
| [Announcement bar](https://www.hooddie.com/components/announcement-bar) | A dismissible strip for one message, such as free shipping or a sale, that remembers it was closed. |
| [Reviews list](https://www.hooddie.com/components/reviews-list) | Full reviews with stars, verified-buyer marks and sorting, a few at a time. |
| [Store benefits](https://www.hooddie.com/components/store-benefits) | A row of short promises such as free shipping, free returns and secure payment, each with an icon. |
| [Newsletter signup](https://www.hooddie.com/components/newsletter-signup) | An email signup with a consent line and clear sending, done and error states. |

## Virtual try-on

`VirtualTryOn` handles the shopper's side: the photo, the privacy note, the wait and the result. You connect any AI try-on service with one function:

```tsx
<VirtualTryOn
  product={{ title: "Classic Hoodie", image: "/hoodie.webp" }}
  onGenerate={async ({ photo, signal }) => {
    const body = new FormData();
    body.append("photo", photo);
    const res = await fetch("/api/try-on", { method: "POST", body, signal });
    return (await res.json()).image; // a URL to the result
  }}
/>
```

The photo is scaled down and re-encoded in the browser (which drops its metadata) and is only sent where `onGenerate` sends it.

## Licence

The components in `registry/hooddie/` are MIT licensed (see LICENSE). The Hooddie name, logo and the owl mascot are not covered by the licence.

Made by Zee Design. Issues and requests: open an issue or write to info@hooddie.com.
