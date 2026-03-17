# AA Address Market

The AA address market is a trustless GAS escrow surface for transferring deterministic Neo Abstract Account addresses.

## What A Listing Includes

- AA core contract hash
- accountId hash
- derived AA address
- seller backup-owner address
- price in GAS
- title
- optional metadata URL

When a listing is created, the seller's account is immediately locked into market escrow on-chain. Normal AA execution and plugin maintenance are blocked until the listing is either cancelled or sold.

## What A Purchase Means

Buying is not just a commercial reservation.

The buyer completes one atomic chain flow:

1. transfer exact GAS to the market contract
2. settle the listing in the same transaction
3. rotate control to the buyer's new backup owner
4. clear the previously bound verifier and hook so old permissions stop applying
5. release seller proceeds only if the control transfer succeeds

If settlement fails, the entire transaction fails.

## Seller Checklist

Before listing:

1. confirm you are the current backup owner
2. review the current verifier and hook posture because it becomes frozen during escrow
3. document any policy assumptions in the metadata URL
4. understand that listing creation blocks normal account execution until cancel or sale

## Buyer Checklist

Before buying:

1. inspect the current verifier and hook posture shown from chain reads
2. set your desired new backup owner before submitting the buy transaction
3. expect old verifier / hook bindings to be cleared during settlement
4. use the app workspace after settlement for all new hook or verifier setup

## Operational Notes

- The market contract only escrows GAS and control transfer.
- It does not try to guarantee off-chain promises made in a metadata URL.
- The market transfers only the AA shell and ownership anchor.
- Old verifier and hook bindings are intentionally cleared during sale settlement so the buyer receives only the AA shell.
- Third-party plugin contracts may still keep their own internal storage, but it is no longer active once the AA core bindings are cleared.
