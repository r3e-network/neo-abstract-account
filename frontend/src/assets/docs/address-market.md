# AA Address Market

The address market is where operators publish Abstract Account addresses for sale.

## What A Listing Includes

- AA address
- seller address
- price in GAS
- verifier profile
- hook profile
- transfer notes

## What A Purchase Means

The market records buyer intent, reserved buyer state, and commercial terms.

The actual control transfer still completes inside the app workspace by rotating:

- verifier plugin
- hook plugin
- backup owner / escape path

## Seller Checklist

Before listing:

1. confirm you still control the active verifier path
2. document the current hook stack
3. disclose whether the buyer should rotate the verifier immediately
4. disclose whether the address has whitelist / daily-limit / credential dependencies

## Buyer Checklist

Before buying:

1. inspect verifier profile
2. inspect hook profile
3. verify there is a recovery path you can rotate away from the seller
4. plan the post-purchase `updateVerifier` / `updateHook` sequence in the app workspace
