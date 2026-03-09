# 快速参考

## 全仓本地验证

```bash
./scripts/verify_repo.sh
```

## 仅前端

```bash
cd frontend && npm test
cd frontend && npm run build
```

## 仅 SDK

```bash
cd sdk/js && npm test
```

## Recovery verifier 重新编译

```bash
bash contracts/recovery/compile_recovery_contracts.sh
```

## Recovery verifier 测试网验证

```bash
cd sdk/js
npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
```

## 核心文档

- `docs/HOW_IT_WORKS.zh-CN.md`
- `docs/WORKFLOWS.zh-CN.md`
- `docs/DATA_FLOW.zh-CN.md`
- `docs/architecture.zh-CN.md`
