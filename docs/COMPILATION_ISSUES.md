# Compilation Notes

## Recovery verifier isolated build requirement

The recovery verifier folder contains both legacy source files and validated `*.Fixed.cs` variants.

Because `nccs` can pull sibling sources from the same directory, the supported artifact generation path is:

```bash
bash contracts/recovery/compile_recovery_contracts.sh
```

That script copies each validated source into an isolated temporary project before calling `nccs`.

## Why this matters

Without isolation, duplicate class names and outdated source files can collide during compilation and produce invalid or misleading artifacts.

## Canonical source files

- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`
