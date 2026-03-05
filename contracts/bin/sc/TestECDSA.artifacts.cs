using Neo.Cryptography.ECC;
using Neo.Extensions;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Numerics;

#pragma warning disable CS0067

namespace Neo.SmartContract.Testing;

public abstract class TestECDSA(Neo.SmartContract.Testing.SmartContractInitialize initialize) : Neo.SmartContract.Testing.SmartContract(initialize), IContractInfo
{
    #region Compiled data

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""TestECDSA"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""testVerify"",""parameters"":[{""name"":""message"",""type"":""ByteArray""},{""name"":""pubkey"",""type"":""ByteArray""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":0,""safe"":false}],""events"":[]},""permissions"":[{""contract"":""*"",""methods"":""*""}],""trusts"":[],""extra"":{""Author"":""Test"",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"TkVGM05lby5Db21waWxlci5DU2hhcnAgMy45LjErNWZhOTU2NmU1MTY1ZWRlMjE2NWE5YmUxZjRhMDEyMGMxNzYuLi4AAAEb9XWrEYlohBNhCjWhKIbN4LZscg92ZXJpZnlXaXRoRUNEc2EEAAEPAAAXVwADAHp6eUrYJAlKygAhKAM6eDcAAEB6GvWZ").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Unsafe methods

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("testVerify")]
    public abstract bool? TestVerify(byte[]? message, byte[]? pubkey, byte[]? signature);

    #endregion
}
