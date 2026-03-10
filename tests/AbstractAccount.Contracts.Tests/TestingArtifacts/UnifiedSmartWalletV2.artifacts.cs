using Neo.Cryptography.ECC;
using Neo.Extensions;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Numerics;

#pragma warning disable CS0067

namespace Neo.SmartContract.Testing;

public abstract class UnifiedSmartWalletV2(Neo.SmartContract.Testing.SmartContractInitialize initialize) : Neo.SmartContract.Testing.SmartContract(initialize), IContractInfo
{
    #region Compiled data

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""UnifiedSmartWalletV2"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""createAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""createAccountWithAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3193,""safe"":false},{""name"":""createAccountBatch"",""parameters"":[{""name"":""accountIds"",""type"":""Array""},{""name"":""admins"",""type"":""Hash160""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Hash160""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4044,""safe"":false},{""name"":""verify"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":4158,""safe"":true},{""name"":""setAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8104,""safe"":false},{""name"":""setAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8122,""safe"":false},{""name"":""getAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":1870,""safe"":true},{""name"":""getAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":8224,""safe"":true},{""name"":""getAdminThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":6380,""safe"":true},{""name"":""getAdminThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8240,""safe"":true},{""name"":""setManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8256,""safe"":false},{""name"":""setManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8274,""safe"":false},{""name"":""getManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":2577,""safe"":true},{""name"":""getManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":8290,""safe"":true},{""name"":""getManagerThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":6462,""safe"":true},{""name"":""getManagerThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8309,""safe"":true},{""name"":""setDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8328,""safe"":false},{""name"":""setDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":8598,""safe"":false},{""name"":""getDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":6606,""safe"":true},{""name"":""getDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":8618,""safe"":true},{""name"":""getDomeThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":6534,""safe"":true},{""name"":""getDomeThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8637,""safe"":true},{""name"":""getDomeTimeout"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":6652,""safe"":true},{""name"":""getDomeTimeoutByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8656,""safe"":true},{""name"":""setBlacklist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":8675,""safe"":false},{""name"":""setBlacklistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":8794,""safe"":false},{""name"":""setWhitelistMode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":8813,""safe"":false},{""name"":""setWhitelistModeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":8958,""safe"":false},{""name"":""setWhitelist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":8976,""safe"":false},{""name"":""setWhitelistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":9093,""safe"":false},{""name"":""setMaxTransfer"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":9112,""safe"":false},{""name"":""setMaxTransferByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":9216,""safe"":false},{""name"":""bindAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":9232,""safe"":false},{""name"":""setVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":9249,""safe"":false},{""name"":""setVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":9455,""safe"":false},{""name"":""getAccountIdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":9473,""safe"":true},{""name"":""getAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":9507,""safe"":true},{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":9588,""safe"":false},{""name"":""onNEP17Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":9641,""safe"":false},{""name"":""onNEP11Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""tokenId"",""type"":""ByteArray""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":9648,""safe"":false},{""name"":""execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":9653,""safe"":false},{""name"":""executeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":12052,""safe"":false},{""name"":""getNonce"",""parameters"":[{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":12639,""safe"":true},{""name"":""getNonceForAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":12649,""safe"":true},{""name"":""getNonceForAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":12690,""safe"":true},{""name"":""computeArgsHash"",""parameters"":[{""name"":""args"",""type"":""Array""}],""returntype"":""ByteArray"",""offset"":12761,""safe"":true},{""name"":""executeMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":12784,""safe"":false},{""name"":""executeMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":15445,""safe"":false},{""name"":""setDomeOracle"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":15817,""safe"":false},{""name"":""setDomeOracleByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":15891,""safe"":false},{""name"":""requestDomeActivation"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Void"",""offset"":15906,""safe"":false},{""name"":""requestDomeActivationByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":16343,""safe"":false},{""name"":""domeActivationCallback"",""parameters"":[{""name"":""url"",""type"":""String""},{""name"":""userData"",""type"":""Any""},{""name"":""responseCode"",""type"":""Integer""},{""name"":""result"",""type"":""Array""}],""returntype"":""Void"",""offset"":17918,""safe"":false},{""name"":""getLastDomeOracleResponseCode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":18671,""safe"":true},{""name"":""getLastDomeOracleResponseCodeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":18743,""safe"":true},{""name"":""getLastDomeOracleResponse"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""ByteArray"",""offset"":18759,""safe"":true},{""name"":""getLastDomeOracleResponseByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":18803,""safe"":true},{""name"":""getLastDomeOracleResponseUrl"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""String"",""offset"":18819,""safe"":true},{""name"":""getLastDomeOracleResponseUrlByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""String"",""offset"":18863,""safe"":true},{""name"":""getLastDomeOracleUrlMatched"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":18879,""safe"":true},{""name"":""getLastDomeOracleUrlMatchedByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Boolean"",""offset"":18930,""safe"":true},{""name"":""getLastDomeOracleTruthAccepted"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":18946,""safe"":true},{""name"":""getLastDomeOracleTruthAcceptedByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Boolean"",""offset"":18997,""safe"":true},{""name"":""getLastDomeOracleUnlockApplied"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":19013,""safe"":true},{""name"":""getLastDomeOracleUnlockAppliedByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Boolean"",""offset"":19064,""safe"":true},{""name"":""getLastDomeOracleExpectedUrl"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""String"",""offset"":19080,""safe"":true},{""name"":""getLastDomeOracleExpectedUrlByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""String"",""offset"":19124,""safe"":true},{""name"":""getLastDomeOracleConfiguredUrl"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""String"",""offset"":19140,""safe"":true},{""name"":""getLastDomeOracleConfiguredUrlByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""String"",""offset"":19184,""safe"":true},{""name"":""isDomeOracleUnlocked"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":6758,""safe"":true},{""name"":""getLastActiveTimestamp"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":6705,""safe"":true},{""name"":""getLastActiveTimestampByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":19200,""safe"":true},{""name"":""getVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":6299,""safe"":true},{""name"":""getVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Hash160"",""offset"":19286,""safe"":true},{""name"":""getAccountsByAdmin"",""parameters"":[{""name"":""address"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":19305,""safe"":true},{""name"":""getAccountsByManager"",""parameters"":[{""name"":""address"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":19345,""safe"":true},{""name"":""getAccountAddressesByAdmin"",""parameters"":[{""name"":""address"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":19385,""safe"":true},{""name"":""getAccountAddressesByManager"",""parameters"":[{""name"":""address"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":19505,""safe"":true},{""name"":""update"",""parameters"":[{""name"":""nefFile"",""type"":""ByteArray""},{""name"":""manifest"",""type"":""String""}],""returntype"":""Void"",""offset"":19628,""safe"":false},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":19770,""safe"":false}],""events"":[{""name"":""Execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}]},{""name"":""AccountCreated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""creator"",""type"":""Hash160""}]},{""name"":""RoleUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""role"",""type"":""String""},{""name"":""members"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}]},{""name"":""PolicyUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""policyType"",""type"":""String""},{""name"":""target"",""type"":""Hash160""},{""name"":""value"",""type"":""ByteArray""}]}]},""permissions"":[{""contract"":""0x726cb6e0cd8628a1350a611384688911ab75f51b"",""methods"":[""keccak256"",""ripemd160"",""sha256"",""verifyWithECDsa""]},{""contract"":""0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0"",""methods"":[""deserialize"",""serialize""]},{""contract"":""0xfe924b7cfe89ddd271abaf7210a80a7e11178758"",""methods"":[""request""]},{""contract"":""0xfffdc93764dbaddd97c48f252a53ea4643faa3fd"",""methods"":[""update""]},{""contract"":""*"",""methods"":[""allowance"",""approve"",""balanceOf"",""bindAccountAddress"",""decimals"",""domeActivationCallback"",""getNonce"",""getNonceForAccount"",""getNonceForAddress"",""requestDomeActivation"",""requestDomeActivationByAddress"",""setAdmins"",""setAdminsByAddress"",""setBlacklist"",""setBlacklistByAddress"",""setDomeAccounts"",""setDomeAccountsByAddress"",""setDomeOracle"",""setDomeOracleByAddress"",""setManagers"",""setManagersByAddress"",""setMaxTransfer"",""setMaxTransferByAddress"",""setVerifierContract"",""setVerifierContractByAddress"",""setWhitelist"",""setWhitelistByAddress"",""setWhitelistMode"",""setWhitelistModeByAddress"",""symbol"",""totalSupply"",""transfer"",""verify""]}],""trusts"":[],""extra"":{""Author"":""R3E Network"",""Email"":""jimmy@r3e.network"",""Description"":""A global, unified permission-controlling programmable account gateway."",""nef"":{""optimization"":""Basic""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"TkVGM05lby5Db21waWxlci5DU2hhcnAgMy45LjErNWZhOTU2NmU1MTY1ZWRlMjE2NWE5YmUxZjRhMDEyMGMxNzYuLi4AAAgb9XWrEYlohBNhCjWhKIbN4LZscgZzaGEyNTYBAAEPwO85zuDk6SXGwqBqeeFEDdhvzqwLZGVzZXJpYWxpemUBAAEPwO85zuDk6SXGwqBqeeFEDdhvzqwJc2VyaWFsaXplAQABDxv1dasRiWiEE2EKNaEohs3gtmxyCXJpcGVtZDE2MAEAAQ8b9XWrEYlohBNhCjWhKIbN4LZscglrZWNjYWsyNTYBAAEPG/V1qxGJaIQTYQo1oSiGzeC2bHIPdmVyaWZ5V2l0aEVDRHNhBAABD1iHFxF+CqgQcq+rcdLdif58S5L+B3JlcXVlc3QFAAAP/aP6Q0bqUyolj8SX3a3bZDfJ/f8GdXBkYXRlAwAADwAA/elOVwAFfHt6eXg0A0BXBwV4Ne8AAAB8e3p5NRkBAABYQZv2Z84SwHB4NUUCAABowUVTi1BBkl3oMXFpC5ckGwwWQWNjb3VudCBhbHJlYWR5IGV4aXN0c+BBLVEIMHJqE85zeUrYJgRFwnQJdRB2IkJsbs5rlyYICEp1RSI7bkqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3ZFbmzKtSS8baomBWxrz3oQtyQFCSIGemzKtiYFeiIDEXZubHg1DgQAAHx7eDXyBwAAeDV+CgAAa3gSwAwOQWNjb3VudENyZWF0ZWRBlQFvYUBXAAF4C5gkBQkiBnjKELckBQkiCHjKAYAAtiQWDBFJbnZhbGlkIGFjY291bnRJZOBAykBXAQR4C5gkBQkiBnjKELcmMHl4NGtwaCQoDCNVbmF1dGhvcml6ZWQgYWNjb3VudCBpbml0aWFsaXphdGlvbuB6C5gkBQkiBnrKELcmMHt6NC9waCQoDCNVbmF1dGhvcml6ZWQgbWFuYWdlciBpbml0aWFsaXphdGlvbuBAykBXAgJ5ELYmBQgiBXgLlyYFCCIGeMoQlyYICSOGAAAAEHAQcSJyeGnOQfgn7IwmNWhKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9wRWlKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9xRWl4yrUkjGh5uCICQEH4J+yMQM5AEsBAQZv2Z85AwUVTi1BBkl3oMUBXBAF42zBwaDQ5cWnbKHJqNc4BAAAmBWoiJXg14AEAAHNr2zBpNeoBAAAmBWoiEGs1rgEAACYFayIFaiICQNswQFcAAXjKAD+2Jgp4WRLANBQiEXjbKDcAANswWhLANAUiAkBXBgEQcBBxImxoeGnOyp5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfSnBFaUqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaXjKtSSSaIhxEHIQcyPnAAAAeGvOdBB1Im5sbc5KaWptnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVtSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfdUVtbMq1JJBqbMqeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn0pyRWtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWt4yrUlGv///2kiAkA3AABA2yhAVwEBWEGb9mfOEsBweGjBRVOLUEGSXegxC5giAkBXAAF4ygA/tiYFeCIIeDcAACICQFcBAnjKecqYJgUJIk4QcCJBeGjOeWjOmCYFCSI+aEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3BFaHjKtSS9CCICQEEtUQgwQMJAz0BXBAN5C5gkBQkiBnnKELckGQwUQWRtaW5zIGFyZSBtYW5kYXRvcnngeXBoNRMBAAB6aMq2JAUJIgV6ELckFgwRSW52YWxpZCB0aHJlc2hvbGTgeDUcAgAAcRByIj54aWrONT8CAABqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqacq1JMAQciI+eGhqzjWwAgAAakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFamjKtSTAWEGb9mfOEsByXEGb9mfOEsBzaDcCAHg1kfz//2rBRVOLUEHmPxiEeng1f/z//2vBRVOLUEHmPxiEemgMBkFkbWluc3gUwAwLUm9sZVVwZGF0ZWRBlQFvYUBXAwF4C5cmByMRAQAAEHAjAQEAAHhoznFpC5gkBQkiGmkMFAAAAAAAAAAAAAAAAAAAAAAAAAAAmCQZDBRJbnZhbGlkIHJvbGUgYWNjb3VudOBoEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfciJUaXhqzpgkGgwVRHVwbGljYXRlIHJvbGUgbWVtYmVy4GpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWp4yrUkqmhKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9wRWh4yrUlAP///0AMFAAAAAAAAAAAAAAAAAAAAAAAAAAAQFcCAVhBm/ZnzhLAcHg1Efv//2jBRVOLUEGSXegxcWkLlyYFwiIIaTcBACICQDcBAEBXBQJbQZv2Z84SwHB4aMFFU4tQQZJd6DFxaQuXJgQidmk3AQBywnMQdCJBamzOeZgmB2tqbM7PbEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3RFbGrKtSS9a8oQlyYQeGjBRVOLUEEvWMXtIhJrNwIAeGjBRVOLUEHmPxiEQMJAzkDPQMpAwUVTi1BBL1jF7UDBRVOLUEHmPxiEQDcCAEBXBQJbQZv2Z84SwHB4aMFFU4tQQZJd6DFxaQuXJgXCIgZpNwEAcglzEHQiQmpsznmXJggISnNFIjtsSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfdEVsasq1JLxrqiYFannPajcCAHhowUVTi1BB5j8YhEDBRVOLUEHmPxiEQFcEA3kLlyYGwkqBRXlwaDVD/f//aMoQlyYdehCXJBYMEUludmFsaWQgdGhyZXNob2xk4CIkemjKtiQFCSIFehC3JBYMEUludmFsaWQgdGhyZXNob2xk4Hg17gAAAHEQciI+eGlqzjUNAQAAakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFamnKtSTAEHIiPnhoas41XAEAAGpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWpoyrUkwF1Bm/ZnzhLAcl8HQZv2Z84SwHNoNwIAeDWf+P//asFFU4tQQeY/GIR6eDWN+P//a8FFU4tQQeY/GIR6aAwITWFuYWdlcnN4FMAMC1JvbGVVcGRhdGVkQZUBb2FAVwIBXUGb9mfOEsBweDVO+P//aMFFU4tQQZJd6DFxaQuXJgXCIghpNwEAIgJAVwUCXkGb9mfOEsBweGjBRVOLUEGSXegxcWkLlyYEInZpNwEAcsJzEHQiQWpsznmYJgdramzOz2xKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ90RWxqyrUkvWvKEJcmEHhowUVTi1BBL1jF7SISazcCAHhowUVTi1BB5j8YhEBXBQJeQZv2Z84SwHB4aMFFU4tQQZJd6DFxaQuXJgXCIgZpNwEAcglzEHQiQmpsznmXJggISnNFIjtsSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfdEVsasq1JLxrqiYFannPajcCAHhowUVTi1BB5j8YhEBXAQFfCEGb9mfOEsBwQbfDiAN4Nfz2//9owUVTi1BB5j8YhHg0CUBBt8OIA0BXCwF4Nd72//9wXwlBm/ZnzhLAcV8KQZv2Z84SwHJfC0Gb9mfOEsBzXwxBm/ZnzhLAdF8NQZv2Z84SwHVfDkGb9mfOEsB2Xw9Bm/ZnzhLAdwdfEEGb9mfOEsB3CF8RQZv2Z84SwHcJXxJBm/ZnzhLAdwpoacFFU4tQQS9Yxe1oasFFU4tQQS9Yxe1oa8FFU4tQQS9Yxe1obMFFU4tQQS9Yxe1obcFFU4tQQS9Yxe1obsFFU4tQQS9Yxe1obwfBRVOLUEEvWMXtaG8IwUVTi1BBL1jF7WhvCcFFU4tQQS9Yxe1obwrBRVOLUEEvWMXtQFcABn18e3p4NYrz//95eDQDQFcEAng10QAAAHk1DAEAAHl4NUQBAABfFUGb9mfOEsBweWjBRVOLUEGSXegxcWkLmCYnaXiXJCIMHUFjY291bnQgYWRkcmVzcyBhbHJlYWR5IGJvdW5k4F8WQZv2Z84SwHJ4NX/1//9qwUVTi1BBkl3oMXNrC5gmP2tK2CQJSsoAFCgDOnmXJC8MKkFjY291bnQgYWxyZWFkeSBib3VuZCB0byBkaWZmZXJlbnQgYWRkcmVzc+B4eWjBRVOLUEHmPxiEeXg1HfX//2rBRVOLUEHmPxiEQFcBAXg1mvP//1hBm/ZnzhLAcHg1+fT//2jBRVOLUEGSXegxC5gkGwwWQWNjb3VudCBkb2VzIG5vdCBleGlzdOBAVwABeAuYJAUJIhp4DBQAAAAAAAAAAAAAAAAAAAAAAAAAAJgkGwwWSW52YWxpZCBhY2NvdW50QWRkcmVzc+BAVwECeDRJcGjbMHnbMDWO9v//JDoMNUFjY291bnQgYWRkcmVzcyBtdXN0IG1hdGNoIGRldGVybWluaXN0aWMgdmVyaWZ5IHByb3h54EBXAgF4NCVwaNsoNwAANwMA2zBxaTXTAAAA2yhK2CQJSsoAFCgDOiICQFcBAXjbMHBoygH/ALYkFgwRSW52YWxpZCBhY2NvdW50SWTgXxM0RtswDAIMFNswDAZ2ZXJpZnnbMAwFEcAfDAbbMGgSiEoQHNBKEWjKShAuBCIISgH/ADIGAf8AkdAXwDUZ9P//IgJA2zBAVwEAXxRBm/ZnzkGSXegxcGgLmCQFCSIHaMoAFJcmEGhK2CQJSsoAFCgDOiIJQdv+qHQiAkBBkl3oMUBB2/6odEA3AwBA2yhK2CQJSsoAFCgDOkBXAgF4yohwEHEjogAAAHh4yhGfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn2mfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaGlR0EVpSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpeMq1JV////9oIgJAVwEFeAuYJAUJIgZ4yhC3JBkMFEFjY291bnQgSURzIHJlcXVpcmVk4BBwIkF8e3p5eGjONQzw//9oSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEVoeMq1JL1AVwYBeDUe/f//Qel9OKAAQJcmG0E5U248eDXmAAAAJggII9cAAAAJI9EAAABB6X04oAAglyfBAAAANQwBAACqJggJI7YAAAB4NRUIAABwaAuYJAUJIhpoDBQAAAAAAAAAAAAAAAAAAAAAAAAAAJgmFngRwBUMBnZlcmlmeWhBYn1bUiJ2eDUpCAAAeDWF9v//NeHw//9xaSYFCCJeeDVjCAAAeDUw+f//Ncnw//9yaiYFCCJGeDWTCAAAeDXVCAAANbHw//9zayYueDX0CAAAdGwQtyYieDUdCQAAdUG3w4gDbWyeuCQFCSIIeDU9CQAAJgUIIgUJIgJAQel9OKBAVwICXxdBm/ZnzhLAcHg1IfH//2jBRVOLUEGSXegxcWkLlyYFCCIFeQuXJgUJIhJpStgkCUrKABQoAzp5lyICQEE5U248QDU+/f//2zBBLVEIMBfO2zA0BSICQFcBAngLlyYFCCIFeQuXJgUIIgd5ygAUmCYFCCIGeMoQlyYFCSIoXxN4NCQRmCYFCSIcXxN5DAIMFNswE8A1+vD//3BoeDXtBQAAIgJAVwUCeAuXJgUIIgV5C5cmBQgiBnnKFZgmBQgiBnjKEJcmCBAjwQUAABBwEHFpeMq1J7EFAAB4ac5yahyXJ9wAAABpEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfeMq4JggQI2wFAABpEnhpEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzp5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9KcUUjGf///2odlydCAQAAaRKeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3jKuCYIECONBAAAeGkRnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OeGkSnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OGKhKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfknNpE2ueSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn55KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfSnFFI9T9//9qHpcnFgIAAGkUnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ94yrgmCBAjSAMAAHhpEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfznhpEp5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzhioSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn5J4aROeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn84gqEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ+SeGkUnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OABioSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn5JzaxC1JggQI9wBAABpFWueSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn55KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfSnFFI7v7//9qeRDOlycuAQAAaRSeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3jKuCYIECMtAQAACHMRdCJ0eGlsnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OeWzOmCYICUpzRSI7bEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3RFbHnKtSSKayY1aEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAA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bkrYJgZFECIE2yF3CG8IELYmBQgiB28Hbwi2JB0MGEFtb3VudCBleGNlZWRzIG1heCBsaW1pdOBAVwECeQuYJAUJIgZ5yhC3JBMMDkludmFsaWQgbWV0aG9k4HhB2/6odJdweQwIdHJhbnNmZXKXJgcjbwMAAHkMCWJhbGFuY2VPZpcmByNbAwAAeQwGc3ltYm9slyYHI0oDAAB5DAhkZWNpbWFsc5cmByM3AwAAeQwLdG90YWxTdXBwbHmXJgcjIQMAAHkMCWFsbG93YW5jZZcmByMNAwAAeQwHYXBwcm92ZZcmByP7AgAAeQwIZ2V0Tm9uY2WXJgUIIhh5DBJnZXROb25jZUZvckFjY291bnSXJgUIIhh5DBJnZXROb25jZUZvckFkZHJlc3OXJgUIIht5DBVzZXRXaGl0ZWxpc3RCeUFkZHJlc3OXJgUIIh95DBlzZXRXaGl0ZWxpc3RNb2RlQnlBZGRyZXNzlyYFCCISeQwMc2V0V2hpdGVsaXN0lyYFCCIWeQwQc2V0V2hpdGVsaXN0TW9kZZcmBQgiG3kMFXNldEJsYWNrbGlzdEJ5QWRkcmVzc5cmBQgiEnkMDHNldEJsYWNrbGlzdJcmBQgiHXkMF3NldE1heFRyYW5zZmVyQnlBZGRyZXNzlyYFCCIUeQwOc2V0TWF4VHJhbnNmZXKXJgUIIhh5DBJzZXRBZG1pbnNCeUFkZHJlc3OXJgUIIg95DAlzZXRBZG1pbnOXJgUIIhp5DBRzZXRNYW5hZ2Vyc0J5QWRkcmVzc5cmBQgiEXkMC3NldE1hbmFnZXJzlyYFCCIYeQwSYmluZEFjY291bnRBZGRyZXNzlyYFCCIeeQwYc2V0RG9tZUFjY291bnRzQnlBZGRyZXNzlyYFCCIVeQwPc2V0RG9tZUFjY291bnRzlyYFCCIceQwWc2V0RG9tZU9yYWNsZUJ5QWRkcmVzc5cmBQgiE3kMDXNldERvbWVPcmFjbGWXJgUIIiJ5DBxzZXRWZXJpZmllckNvbnRyYWN0QnlBZGRyZXNzlyYFCCIZeQwTc2V0VmVyaWZpZXJDb250cmFjdJcmBQgiJHkMHnJlcXVlc3REb21lQWN0aXZhdGlvbkJ5QWRkcmVzc5cmBQgiG3kMFXJlcXVlc3REb21lQWN0aXZhdGlvbpcmBQgiHHkMFmRvbWVBY3RpdmF0aW9uQ2FsbGJhY2uXJi5oJCkMJEludGVybmFsIG1ldGhvZCByZXF1aXJlcyBzZWxmIHRhcmdldOAiJAkkIQwcTWV0aG9kIG5vdCBhbGxvd2VkIGJ5IHBvbGljeeBAVwECeQuYJBEMDEludmFsaWQgYXJnc+B5cHgMCHRyYW5zZmVylyYxaMoTuCQFCSIHaBLO2SEkHAwXSW52YWxpZCB0cmFuc2ZlciBhbW91bnTgaBLOIktoyhK4JAUJIgdoEc7ZISYHaBHOIjZoyhO4JAUJIgdoEs7ZISYHaBLOIiEJJBsMFkludmFsaWQgYXBwcm92ZSBhbW91bnTgECICQFcDAV8dQZv2Z84SwHB4NQnV//9xaWjBRVOLUEGSXegxcmoLlyQaDBVFeGVjdXRpb24gaW4gcHJvZ3Jlc3PgXx5Bm/ZnzkGSXegxC5ckGgwVRXhlY3V0aW9uIGluIHByb2dyZXNz4AwBAdsw2yhpaMFFU4tQQeY/GIQMAQHbMNsoXx5Bm/ZnzkHmPxiEQFcBAl8XQZv2Z84SwHB5eDV71P//aMFFU4tQQeY/GIRAVwADenk0DHl4QWJ9W1IiAkBXAAF4NA0mBl8lIgRfJiICQFcAAXgMCWJhbGFuY2VPZpcmBQgiDHgMBnN5bWJvbJcmBQgiDngMCGRlY2ltYWxzlyYFCCIReAwLdG90YWxTdXBwbHmXJgUIIg94DAlhbGxvd2FuY2WXJgUIIg54DAhnZXROb25jZZcmBQgiGHgMEmdldE5vbmNlRm9yQWNjb3VudJcmBQgiGHgMEmdldE5vbmNlRm9yQWRkcmVzc5ciAkBXAQFfF0Gb9mfOEsBweDWa0///aMFFU4tQQS9Yxe1AVwEBXx1Bm/ZnzhLAcHg1e9P//2jBRVOLUEEvWMXtXx5Bm/ZnzkEvWMXtQEEvWMXtQFcBBHg1r/D//3B7enloNZP2//8iAkBXBgV4NTLe//94NWfp//9waAuYJAUJIhpoDBQAAAAAAAAAAAAAAAAAAAAAAAAAAJgmRXgRwBUMBnZlcmlmeWhBYn1bUnFpJCQMH1VuYXV0aG9yaXplZCBieSBjdXN0b20gdmVyaWZpZXLgeDXI2///I/IAAAB5eDVL6f//eDWn1///NfPu//9xeXg1iun//3g1V9r//zXg7v//cmkmBQgiA2omDXg1jtv//yO4AAAAeXg1q+n//3g17en//zW57v//c2skEQwMVW5hdXRob3JpemVk4Hg1/en//3RsELckIAwbRG9tZSBhY2NvdW50IG5vdCBjb25maWd1cmVk4Hg1xOz//3VBt8OIA21snrgkIAwbRG9tZSBhY2NvdW50IG5vdCBhY3RpdmUgeWV04Hg1Der//yQoDCNEb21lIGFjY291bnQgbm90IHVubG9ja2VkIGJ5IG9yYWNsZeB4Ndba//98e3p4NdT2//9AVwYDeRC2JgUIIgV4C5cmBQgiBnjKEJcmCAkjnwAAABBwEHEjiAAAAHpKcspzEHQiRWpsznV4ac5tlyY3aEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3BFIglsnHRsazC7aUqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaXjKtSV5////aHm4IgJAVwABXyd4NRbR//+LIgJAVwABeHg0BSICQFcCAng043BoQZv2Z85Bkl3oMXFpC5cmBRAiDWlK2CYGRRAiBNshIgJAVwECeDUx7v//cHloNMsiAkBXAgF4NKlwDBQAAAAAAAAAAAAAAAAAAAAAAAAAAHg0qHFpEZ5oQZv2Z85B5j8YhEBB5j8YhEBXAQF4NwIA2zBwaNsoNwQAIgJANwQAQFcACX8Ifwd+fXx7enl4NAUiAkBXDgl4NVnb//95C5gkBQkiBn8IC5gkFAwPTWlzc2luZyBzaWduZXJz4HlwfwhxaMppypckJgwhTWlzbWF0Y2hlZCBwdWJrZXlzIGFuZCBzaWduYXR1cmVz4GnKELckJAwfQXQgbGVhc3Qgb25lIHNpZ25hdHVyZSByZXF1aXJlZOAQciJgaGrOC5gkBQkiCWhqzsoAQZckGgwVSW52YWxpZCBwdWJrZXkgbGVuZ3Ro4GpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWpoyrUknn4QuCQSDA1JbnZhbGlkIG5vbmNl4H8HNfEBAAByQbfDiANqtiQWDBFTaWduYXR1cmUgZXhwaXJlZOAMFAAAAAAAAAAAAAAAAAAAAAAAAAAAeDUs/v//c35rlyQSDA1JbnZhbGlkIE5vbmNl4AwYSW52YWxpZCBhcmdzIGhhc2ggbGVuZ3RofTW0AQAAdHw1X/7//9swdW1sNffQ//8kFwwSQXJncyBoYXNoIG1pc21hdGNo4EHb/qh0QcX7oOA1kQEAAHZ/B35te3p4NbUDAAB3B28HbgwCGQHbMBPANQbP//93CGnKxAB3CRB3CiOyAAAAaW8KztswdwtvC8oAQJckHQwYSW52YWxpZCBzaWduYXR1cmUgbGVuZ3Ro4GhvCs41mwMAAHcMAHppbwrObwxvCNsoNwUAdw1vDSQeDBlJbnZhbGlkIEVJUC03MTIgc2lnbmF0dXJl4GhvCs41BwUAAEpvCW8KUdBFbwpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ93CkVvCmnKtSVO////eDUN/f//fHt6bwl4NYn6//94Na74//9vCXg17gUAAHp4NSz5//87ACV8e3p4FMAMB0V4ZWN1dGVBlQFvYXx7ejUt+f//IgQ9Fz0VeDXj+f//eDVPBwAAeDX2+f//P0BXAAF4ELckFQwQSW52YWxpZCBkZWFkbGluZeB4AwAQpdToAAAAtSYJeAHoA6AiBXgiAkBXAQJ42zBwaMoAIJckBHngaCICQFcBAnk0IXg1+gAAAF8oXylfKhXANYDN//9waNsoNwQA2zAiAkBXAwF42zBwaMoAFJckGwwWSW52YWxpZCBhZGRyZXNzIGxlbmd0aOAAIIhxEHIjogAAAGgAE2qfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaRxqnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqABS1JV////9pIgJAVwQBeBC4JBQMD0ludmFsaWQgdWludDI1NuB42zBwaMpxaRC3JAUJIjdoaRGfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn84QlyY1aUqdSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaQAgtiQVDBB1aW50MjU2IG92ZXJmbG934AAgiHIQcyJvaGvOSmoAH2ufSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWtptSSQaiICQEHF+6DgQFcDBno3BADbMHB4NwQA2zBxfTW+/v//fDW4/v//e2h5NdT9//9pXysXwDU5y///cmrbKDcEANswIgJAQFcDAXjbMHBoygBAlyeKAAAAAEGIcRRKaRBR0EUQciJuaGrOSmlqEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFagBAtSSQaUpwRWjKAEGXJAUJIgdoEM4UlyQqDCVJbnZhbGlkIHB1YmtleSBsZW5ndGggZm9yIGNvbXByZXNzaW9u4AAhiHFoAEDOEqIQlyYFEiIDE0ppEFHQRRByI6EAAABoahGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaWoRnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqACC1JWD///9p2yhK2CQJSsoAISgDOiICQDcFAEBXBAF42zBwaMoAQZckBQkiB2gQzhSXJ4MAAAAAQIhxEHIibmhqEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkppalHQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAQLUkkGlKcEVoygBAlyQaDBVJbnZhbGlkIHB1YmtleSBsZW5ndGjgaNsoNwQA2zBxABSIchBzIm9pAB9rn0oCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OSmprUdBFa0qcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3NFawAUtSSPatsoStgkCUrKABQoAzoiAkBXAgJ5C5gkBQkiBnnKELckHAwXTWlzc2luZyBtZXRhLXR4IHNpZ25lcnPgeTQicF8fQZv2Z84SwHFo2yh4NZLH//9pwUVTi1BB5j8YhEBXBQF4ygAUoEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ+IcBBxIwQBAAB4ac7bMHJqygAUlyQYDBNJbnZhbGlkIHNpZ25lciBoYXNo4GkAFKBKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcxB0Im5qbM5KaGtsnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVsSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfdEVsABS1JJBpSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpeMq1Jf3+//9oIgJAVwEBXx9Bm/ZnzhLAcHg1KMb//2jBRVOLUEEvWMXtQFcBCXg1buP//3B/CH8Hfn18e3p5aDWZ9f//IgJAVwMBeDV23P//eDXSyv//NS7F//8mBQgiE3g1stz//3g1f83//zUYxf//JgUIIhN4NeTc//94NSbd//81AsX//3BoJgQid3g1fuD//3FpyhC3JAUJIg1BOVNuPEHb/qh0lyZIaXg1Fdz//3g1ccr//zW94f//JgUIIhRpeDVQ3P//eDUdzf//Nabh//8mBQgiFGl4NYHc//94NcPc//81j+H//3JqJgQiFAkkEQwMVW5hdXRob3JpemVk4EBXAQF4C5cmBQgiBngMAJcmCQwAI4cAAAB4Nbfd//9waBC1JgUIIjZoEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfeMq4JgYMACI7eGgRnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9LykufjCICQFcCAng1kd3//18cQZv2Z84SwHB4NY/E//9xeQuXJgUIIgZ5DACXJhBpaMFFU4tQQS9Yxe0iD3lpaMFFU4tQQeY/GIR4NX3N//9AVwECeDWw4f//cHloNKpAVw0BeDU6z///eDVB3v//eDVA/v//eDXE2///cGgQtyQgDBtEb21lIGFjY291bnQgbm90IGNvbmZpZ3VyZWTgeDWL3v//cUG3w4gDaWieuCQgDBtEb21lIGFjY291bnQgbm90IGFjdGl2ZSB5ZXTgeDXaw///cl8cQZv2Z84SwHNqa8FFU4tQQZJd6DF0bAuXJgULIgNsdW01E9z//3ZtNW3+//93B24MAJgkHgwZT3JhY2xlIFVSTCBub3QgY29uZmlndXJlZOB4NXvb//+qJCIMHURvbWUgYWNjb3VudCBhbHJlYWR5IHVubG9ja2Vk4F8KQZv2Z84SwHcIam8IwUVTi1BBkl3oMQuXJCQMH0RvbWUgYWN0aXZhdGlvbiBhbHJlYWR5IHBlbmRpbmfgXyxBm/ZnzhLAdwlqbwnBRVOLUEGSXegxdwpvCguXJgURIhBvCkrYJgZFECIE2yERnncLbwtqbwnBRVOLUEHmPxiEbwtqbwjBRVOLUEHmPxiEbm8LeBPANwIAdwwCgJaYAG8MDBZkb21lQWN0aXZhdGlvbkNhbGxiYWNrbwduNwYAQDcGAEBXAQF4Nezf//9waDVA/v//QFcCAXgLlyYFCCIGeMoQlyYICSPMAAAAEHB4yhGfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FoabYkBQkiCnhozjWIAAAAJjdoSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEUiu2louCQFCSIHeGnONEEmN2lKnUoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9xRSK+aWh4NCciAkBXAAF4ACCXJgUIIgV4GpcmBQgiBXgdlyYFCCIFeBmXIgJAVwIDeXq3JggJI0IEAAB6eZ9KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfEZcmF3h5znBoEZcmBQgiBmgAMZcjyAMAAHp5n0oCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ8RnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ8UlyfRAAAAAHR4ec41VwMAACQFCSI8AHJ4eRGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn841GAMAACQFCSI8AHV4eRKeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn8412QIAACQFCSI8AGV4eROeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn841mgIAACOUAgAAenmfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAnxGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAnxaXJAUJIgh4ec4AIpckBQkiCHh6zgAilycBAQAAAHR4eRGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn8413QEAACQFCSI8AHJ4eRKeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn841ngEAACQFCSI8AHV4eROeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn841XwEAACQFCSI8AGV4eRSeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn841IAEAACMaAQAAeHnOAFuXJAUJIgh4es4AXZcnAQEAAHkRnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9wehGfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FoabYkBQkiCnhozjUj/P//JjdoSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEUiu2louCQFCSIKeGnONdz7//8mN2lK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").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Events

    public delegate void delAccountCreated(byte[]? accountId, UInt160? creator);

    [DisplayName("AccountCreated")]
    public event delAccountCreated? OnAccountCreated;

    public delegate void delExecute(byte[]? accountId, UInt160? target, string? method, IList<object>? args);

    [DisplayName("Execute")]
    public event delExecute? OnExecute;

    public delegate void delPolicyUpdated(byte[]? accountId, string? policyType, UInt160? target, byte[]? value);

    [DisplayName("PolicyUpdated")]
    public event delPolicyUpdated? OnPolicyUpdated;

    public delegate void delRoleUpdated(byte[]? accountId, string? role, IList<object>? members, BigInteger? threshold);

    [DisplayName("RoleUpdated")]
    public event delRoleUpdated? OnRoleUpdated;

    #endregion

    #region Safe methods

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("computeArgsHash")]
    public abstract byte[]? ComputeArgsHash(IList<object>? args);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountAddress")]
    public abstract UInt160? GetAccountAddress(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountIdByAddress")]
    public abstract byte[]? GetAccountIdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountsByAdmin")]
    public abstract IList<object>? GetAccountsByAdmin(UInt160? address);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountsByManager")]
    public abstract IList<object>? GetAccountsByManager(UInt160? address);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountAddressesByAdmin")]
    public abstract IList<object>? GetAccountAddressesByAdmin(UInt160? address);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountAddressesByManager")]
    public abstract IList<object>? GetAccountAddressesByManager(UInt160? address);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdmins")]
    public abstract IList<object>? GetAdmins(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminsByAddress")]
    public abstract IList<object>? GetAdminsByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminThreshold")]
    public abstract BigInteger? GetAdminThreshold(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminThresholdByAddress")]
    public abstract BigInteger? GetAdminThresholdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeAccounts")]
    public abstract IList<object>? GetDomeAccounts(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeAccountsByAddress")]
    public abstract IList<object>? GetDomeAccountsByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeThreshold")]
    public abstract BigInteger? GetDomeThreshold(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeThresholdByAddress")]
    public abstract BigInteger? GetDomeThresholdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeTimeout")]
    public abstract BigInteger? GetDomeTimeout(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getDomeTimeoutByAddress")]
    public abstract BigInteger? GetDomeTimeoutByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getLastActiveTimestamp")]
    public abstract BigInteger? GetLastActiveTimestamp(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getLastActiveTimestampByAddress")]
    public abstract BigInteger? GetLastActiveTimestampByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagers")]
    public abstract IList<object>? GetManagers(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagersByAddress")]
    public abstract IList<object>? GetManagersByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagerThreshold")]
    public abstract BigInteger? GetManagerThreshold(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagerThresholdByAddress")]
    public abstract BigInteger? GetManagerThresholdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonce")]
    public abstract BigInteger? GetNonce(UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonceForAccount")]
    public abstract BigInteger? GetNonceForAccount(byte[]? accountId, UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonceForAddress")]
    public abstract BigInteger? GetNonceForAddress(UInt160? accountAddress, UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getVerifierContract")]
    public abstract UInt160? GetVerifierContract(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getVerifierContractByAddress")]
    public abstract UInt160? GetVerifierContractByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("isDomeOracleUnlocked")]
    public abstract bool? IsDomeOracleUnlocked(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("verify")]
    public abstract bool? Verify(byte[]? accountId);

    #endregion

    #region Unsafe methods

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("bindAccountAddress")]
    public abstract void BindAccountAddress(byte[]? accountId, UInt160? accountAddress);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("createAccount")]
    public abstract void CreateAccount(byte[]? accountId, IList<object>? admins, BigInteger? adminThreshold, IList<object>? managers, BigInteger? managerThreshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("createAccountBatch")]
    public abstract void CreateAccountBatch(IList<object>? accountIds, IList<object>? admins, BigInteger? adminThreshold, IList<object>? managers, BigInteger? managerThreshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("createAccountWithAddress")]
    public abstract void CreateAccountWithAddress(byte[]? accountId, UInt160? accountAddress, IList<object>? admins, BigInteger? adminThreshold, IList<object>? managers, BigInteger? managerThreshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("domeActivationCallback")]
    public abstract void DomeActivationCallback(string? url, object? userData, BigInteger? responseCode, byte[]? result);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("execute")]
    public abstract object? Execute(byte[]? accountId, UInt160? targetContract, string? method, IList<object>? args);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeByAddress")]
    public abstract object? ExecuteByAddress(UInt160? accountAddress, UInt160? targetContract, string? method, IList<object>? args);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeMetaTx")]
    public abstract object? ExecuteMetaTx(byte[]? accountId, IList<object>? uncompressedPubKeys, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, IList<object>? signatures);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeMetaTxByAddress")]
    public abstract object? ExecuteMetaTxByAddress(UInt160? accountAddress, IList<object>? uncompressedPubKeys, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, IList<object>? signatures);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("onNEP11Payment")]
    public abstract void OnNEP11Payment(UInt160? from, BigInteger? amount, byte[]? tokenId, object? data = null);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("onNEP17Payment")]
    public abstract void OnNEP17Payment(UInt160? from, BigInteger? amount, object? data = null);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("requestDomeActivation")]
    public abstract void RequestDomeActivation(byte[]? accountId);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("requestDomeActivationByAddress")]
    public abstract void RequestDomeActivationByAddress(UInt160? accountAddress);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setAdmins")]
    public abstract void SetAdmins(byte[]? accountId, IList<object>? admins, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setAdminsByAddress")]
    public abstract void SetAdminsByAddress(UInt160? accountAddress, IList<object>? admins, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setBlacklist")]
    public abstract void SetBlacklist(byte[]? accountId, UInt160? target, bool? isBlacklisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setBlacklistByAddress")]
    public abstract void SetBlacklistByAddress(UInt160? accountAddress, UInt160? target, bool? isBlacklisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setDomeAccounts")]
    public abstract void SetDomeAccounts(byte[]? accountId, IList<object>? domes, BigInteger? threshold, BigInteger? timeoutPeriod);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setDomeAccountsByAddress")]
    public abstract void SetDomeAccountsByAddress(UInt160? accountAddress, IList<object>? domes, BigInteger? threshold, BigInteger? timeoutPeriod);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setDomeOracle")]
    public abstract void SetDomeOracle(byte[]? accountId, string? url);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setDomeOracleByAddress")]
    public abstract void SetDomeOracleByAddress(UInt160? accountAddress, string? url);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setManagers")]
    public abstract void SetManagers(byte[]? accountId, IList<object>? managers, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setManagersByAddress")]
    public abstract void SetManagersByAddress(UInt160? accountAddress, IList<object>? managers, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setMaxTransfer")]
    public abstract void SetMaxTransfer(byte[]? accountId, UInt160? token, BigInteger? maxAmount);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setMaxTransferByAddress")]
    public abstract void SetMaxTransferByAddress(UInt160? accountAddress, UInt160? token, BigInteger? maxAmount);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setVerifierContract")]
    public abstract void SetVerifierContract(byte[]? accountId, UInt160? verifierContract);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setVerifierContractByAddress")]
    public abstract void SetVerifierContractByAddress(UInt160? accountAddress, UInt160? verifierContract);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelist")]
    public abstract void SetWhitelist(byte[]? accountId, UInt160? target, bool? isWhitelisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistByAddress")]
    public abstract void SetWhitelistByAddress(UInt160? accountAddress, UInt160? target, bool? isWhitelisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistMode")]
    public abstract void SetWhitelistMode(byte[]? accountId, bool? enabled);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistModeByAddress")]
    public abstract void SetWhitelistModeByAddress(UInt160? accountAddress, bool? enabled);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("update")]
    public abstract void Update(byte[]? nefFile, string? manifest);

    #endregion
}
