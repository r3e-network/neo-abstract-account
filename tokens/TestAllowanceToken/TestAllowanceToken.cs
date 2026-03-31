using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace TestAllowanceToken
{
    [DisplayName("TestAllowanceToken")]
    [ManifestExtra("Author", "R3E Network")]
    [SupportedStandards("NEP-17")]
    [ContractPermission("*", "*")]
    public class TestAllowanceToken : SmartContract
    {
        private static readonly byte[] BalancePrefix = new byte[] { 0x01 };
        private static readonly byte[] AllowancePrefix = new byte[] { 0x02 };
        private static readonly byte[] TotalSupplyKey = new byte[] { 0x03 };
        private static readonly byte[] OwnerKey = new byte[] { 0x04 };
        private const byte DecimalsValue = 8;
        private const string SymbolValue = "TAT";
        private static readonly BigInteger InitialSupply = 1_000_000_000_000_000;

        public delegate void OnTransferEvent(UInt160? from, UInt160? to, BigInteger amount);
        [DisplayName("Transfer")]
        public static event OnTransferEvent OnTransfer = default!;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            var tx = (Neo.SmartContract.Framework.Services.Transaction)Runtime.Transaction;
            UInt160 owner = tx.Sender;
            Storage.Put(Storage.CurrentContext, OwnerKey, owner);
            Storage.Put(Storage.CurrentContext, TotalSupplyKey, InitialSupply);
            StorageMap balances = new StorageMap(Storage.CurrentContext, BalancePrefix);
            balances.Put(owner, InitialSupply);
            OnTransfer(null, owner, InitialSupply);
        }

        [Safe]
        public static string Symbol() => SymbolValue;

        [Safe]
        public static byte Decimals() => DecimalsValue;

        [Safe]
        public static BigInteger TotalSupply()
        {
            ByteString? value = Storage.Get(Storage.CurrentContext, TotalSupplyKey);
            return value == null ? 0 : (BigInteger)value;
        }

        [Safe]
        public static BigInteger BalanceOf(UInt160 account)
        {
            ExecutionEngine.Assert(account != null && account != UInt160.Zero, "Invalid account");
            StorageMap balances = new StorageMap(Storage.CurrentContext, BalancePrefix);
            ByteString? value = balances.Get(account);
            return value == null ? 0 : (BigInteger)value;
        }

        [Safe]
        public static BigInteger Allowance(UInt160 owner, UInt160 spender)
        {
            ExecutionEngine.Assert(owner != null && owner != UInt160.Zero, "Invalid owner");
            ExecutionEngine.Assert(spender != null && spender != UInt160.Zero, "Invalid spender");
            StorageMap allowances = new StorageMap(Storage.CurrentContext, AllowancePrefix);
            ByteString? value = allowances.Get(AllowanceKey(owner, spender));
            return value == null ? 0 : (BigInteger)value;
        }

        public static bool Approve(UInt160 owner, UInt160 spender, BigInteger amount)
        {
            ExecutionEngine.Assert(owner != null && owner != UInt160.Zero, "Invalid owner");
            ExecutionEngine.Assert(spender != null && spender != UInt160.Zero, "Invalid spender");
            ExecutionEngine.Assert(amount >= 0, "Invalid amount");
            ExecutionEngine.Assert(Runtime.CheckWitness(owner), "No authorization");

            StorageMap allowances = new StorageMap(Storage.CurrentContext, AllowancePrefix);
            byte[] key = AllowanceKey(owner, spender);
            if (amount == 0)
            {
                allowances.Delete(key);
            }
            else
            {
                allowances.Put(key, amount);
            }
            return true;
        }

        public static bool Transfer(UInt160 from, UInt160 to, BigInteger amount, object data)
        {
            ExecutionEngine.Assert(from != null && from != UInt160.Zero, "Invalid from");
            ExecutionEngine.Assert(to != null && to != UInt160.Zero, "Invalid to");
            ExecutionEngine.Assert(amount >= 0, "Invalid amount");
            ExecutionEngine.Assert(Runtime.CheckWitness(from), "No authorization");
            if (amount == 0)
            {
                OnTransfer(from, to, amount);
                return true;
            }

            StorageMap balances = new StorageMap(Storage.CurrentContext, BalancePrefix);
            BigInteger fromBalance = BalanceOf(from);
            ExecutionEngine.Assert(fromBalance >= amount, "Insufficient balance");
            if (fromBalance == amount) balances.Delete(from);
            else balances.Put(from, fromBalance - amount);

            BigInteger toBalance = BalanceOf(to);
            balances.Put(to, toBalance + amount);
            OnTransfer(from, to, amount);
            return true;
        }

        [Safe]
        public static UInt160 GetOwner()
        {
            ByteString? value = Storage.Get(Storage.CurrentContext, OwnerKey);
            return value == null ? UInt160.Zero : (UInt160)value;
        }

        private static byte[] AllowanceKey(UInt160 owner, UInt160 spender)
        {
            return Helper.Concat((byte[])owner, (byte[])spender);
        }
    }
}
