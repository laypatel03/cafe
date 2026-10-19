# Healthy Hunger – where we are

Everything needed to take and bill orders is built and tested on a test computer. Next we get it ready to go live: packaging, backups, a security check and automatic tests – then the real web address.

<!-- The status board (scripts/status-board.mjs) shows this file. Keep it in everyday words, for the owner and staff. -->

## How an order works
1. **Scan** – the guest scans the café QR (one code for every table, the counter and the door).
2. **Pick** – they choose dishes and add-ons. Dine-in is already selected; takeaway is one tap.
3. **Order** – they add their name and mobile number and tap Place order.
4. **Accept** – staff hear a chime, check the order and accept it.
5. **Kitchen** – staff send it to the kitchen.
6. **Serve** – dine-in is served at the table; takeaway is marked ready, then picked up.
7. **Pay** – the bill is made at the counter and paid by cash, UPI or card.

## What works today
### Guests
- Open the menu on their phone from the QR – it loads in under 2 seconds on 4G. It has the café's real menu: salads and bowls, chaat, toasts, oats, smoothies, tea and coffee.
- Browse by category, search, and filter by 15 g+ protein, under 300 kcal or Bestseller. Every dish shows the veg mark, protein, calories and price.
- The website is honest about the numbers: it says protein and calories are our own estimates worked out from the ingredients – not lab-tested or checked by a nutritionist – and asks guests with allergies or special diets to talk to staff. It makes no health or "certified" claims.
- Pick dishes and add-ons, then order with their name and number. Their phone remembers the details for next time.
- Add an optional note for the kitchen and choose whether to receive offers.
- Follow their order live: Waiting for staff → Accepted → In the kitchen → Served or Ready to collect → Paid.
- The home page shows the café, Today's pick, bestsellers, how to visit, and a privacy note.
- A Blog with 5 short articles on vegetarian protein, sprouts, oats and how to read the menu, each with a photo and the dishes to try (protein and calories, no prices). The latest three show on the home page. New articles are added by the developer for now. The blog stays hidden from guests until the owner turns on Settings → Editing → "Show the blog" (staff who are logged in can preview it). "Guests can make lists" is in the same place now.

### Staff
- New orders appear instantly with a chime. Accept them, change items, or cancel with a reason.
- Take an order at the counter for a walk-in guest, using the same menu guests see on their phones – name needed, phone optional.
- Returning guests don't have to give their details again: type their mobile number first and their name fills in by itself, with how many times they've visited.
- Move orders along: send to the kitchen, then Served (dine-in) or Ready to collect and Picked up (takeaway).
- See what guests are choosing before they order.
- Make the bill – one bill for a guest's whole visit, even across several orders. Mark it paid by cash, UPI or card, and print a receipt.
- After a guest pays, text them a thank-you from the counter phone: tap "Open messages" and the message app opens with their number and a thank-you with the link to leave a Google review and the menu address ready – just press Send. It goes from the café's own number, so it's free. Paid bills in Order history have a "Text receipt" button too.
- Void a bill made by mistake, with a reason. Bill numbers never skip.
- Find any order or bill by number, phone, name or date, and reprint it.
- "Pay later" bills show on the live orders page only on the day they were marked. After that, find them in Order history (filter: pay later) and record the payment there.
- Order history shows a reminder at the top when orders from earlier days still need payment – how many and the total – with a button to list them.
- In Order history, filter by payment: payment pending (across all days), payment pending from earlier days only, pay later, paid, or paid by cash, Google Pay, credit or debit card. The owner can change how a paid bill was paid, or set it back to payment pending if the guest didn't actually pay.
- Long lists (Order history, Customers, the Money book) are split into numbered pages. In Order history and Customers you can choose to show 10, 25 or 50 at a time.
- Undo a mistake on the live orders page: each order shows "Undo" for its last step (accepted, sent to the kitchen, served, ready, picked up or cancelled), and you can keep undoing one step at a time. Payments can't be undone here – void the bill, or the owner changes it in Order history.
- Mark a dish sold out in one tap.
- Cash counter: enter the cash in the drawer each morning (or it carries over from last night), and count it at closing. The app shows what should be there and whether it's short or extra.
- Record expenses – vegetables, groceries, gas, salaries and so on – and how they were paid. Cash paid from the drawer is taken off the cash counter automatically.
- A clear warning shows if the internet drops, and the screen catches up when it's back.

### Owner
- Edit the menu: categories, dishes, prices, photos, add-ons, and hide or show items.
- Add an "Other item" to an order – anything that isn't on the menu, with its own name and price. A minus price takes money off, so it works as a discount (the total never goes below ₹0). Owner only: on the live orders page (Edit items) and in Order history. Staff see these lines but can't change them. They don't count as dishes in reports or favourites.
- Customers: search the list and open a profile with visits, spending, favourite dishes and staff notes.
- Start a new order straight from a customer's page – their name and number are already filled in.
- Stop offers for a guest, delete a guest's data when they ask, and download the customer list for Excel.
- Reports: sales by hour, day and month, dine-in vs takeaway, top dishes, how many guests are regulars, expenses by category, and sales minus expenses.
- See every expense for any period, and change or delete one. See past days at the cash counter and reopen today if a count was wrong.
- Print the café QR cards.
- Settings: café details and hours, Today's pick, switch ordering on or off, and staff logins.
