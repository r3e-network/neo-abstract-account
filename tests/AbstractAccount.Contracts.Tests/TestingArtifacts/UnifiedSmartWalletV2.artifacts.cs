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

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""UnifiedSmartWalletV2"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""createAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""createAccountWithAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":1241,""safe"":false},{""name"":""verify"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":1593,""safe"":true},{""name"":""setAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3569,""safe"":false},{""name"":""setAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3587,""safe"":false},{""name"":""getAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":2067,""safe"":true},{""name"":""getAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":3689,""safe"":true},{""name"":""getAdminThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":1985,""safe"":true},{""name"":""getAdminThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":3705,""safe"":true},{""name"":""setManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3721,""safe"":false},{""name"":""setManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3739,""safe"":false},{""name"":""getManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":2187,""safe"":true},{""name"":""getManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":3755,""safe"":true},{""name"":""getManagerThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":2116,""safe"":true},{""name"":""getManagerThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":3774,""safe"":true},{""name"":""setDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":3793,""safe"":false},{""name"":""setDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4063,""safe"":false},{""name"":""getDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":2304,""safe"":true},{""name"":""getDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":4083,""safe"":true},{""name"":""getDomeThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":2232,""safe"":true},{""name"":""getDomeThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4102,""safe"":true},{""name"":""getDomeTimeout"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":2350,""safe"":true},{""name"":""getDomeTimeoutByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4121,""safe"":true},{""name"":""setBlacklist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4140,""safe"":false},{""name"":""setBlacklistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4259,""safe"":false},{""name"":""setWhitelistMode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4278,""safe"":false},{""name"":""setWhitelistModeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4423,""safe"":false},{""name"":""setWhitelist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4441,""safe"":false},{""name"":""setWhitelistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4558,""safe"":false},{""name"":""setMaxTransfer"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4577,""safe"":false},{""name"":""setMaxTransferByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4681,""safe"":false},{""name"":""bindAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":4697,""safe"":false},{""name"":""setVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":4714,""safe"":false},{""name"":""setVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":4920,""safe"":false},{""name"":""getAccountIdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":4938,""safe"":true},{""name"":""getAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":4972,""safe"":true},{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5053,""safe"":false},{""name"":""onNEP17Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":5089,""safe"":false},{""name"":""onNEP11Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""tokenId"",""type"":""ByteArray""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":5096,""safe"":false},{""name"":""execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":5101,""safe"":false},{""name"":""executeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":7155,""safe"":false},{""name"":""getNonce"",""parameters"":[{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":7821,""safe"":true},{""name"":""getNonceForAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":7831,""safe"":true},{""name"":""getNonceForAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":7878,""safe"":true},{""name"":""computeArgsHash"",""parameters"":[{""name"":""args"",""type"":""Array""}],""returntype"":""ByteArray"",""offset"":7949,""safe"":true},{""name"":""executeMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":7972,""safe"":false},{""name"":""executeMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":10995,""safe"":false},{""name"":""setDomeOracle"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":11212,""safe"":false},{""name"":""setDomeOracleByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":11286,""safe"":false},{""name"":""requestDomeActivation"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Void"",""offset"":11301,""safe"":false},{""name"":""requestDomeActivationByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":11708,""safe"":false},{""name"":""domeActivationCallback"",""parameters"":[{""name"":""url"",""type"":""String""},{""name"":""userData"",""type"":""Any""},{""name"":""responseCode"",""type"":""Integer""},{""name"":""result"",""type"":""ByteArray""}],""returntype"":""Void"",""offset"":12384,""safe"":false},{""name"":""isDomeOracleUnlocked"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":2455,""safe"":true},{""name"":""getLastActiveTimestamp"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":2403,""safe"":true},{""name"":""getLastActiveTimestampByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":12704,""safe"":true},{""name"":""getVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":1904,""safe"":true},{""name"":""getVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Hash160"",""offset"":12723,""safe"":true},{""name"":""update"",""parameters"":[{""name"":""nefFile"",""type"":""ByteArray""},{""name"":""manifest"",""type"":""String""}],""returntype"":""Void"",""offset"":12742,""safe"":false},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":12803,""safe"":false}],""events"":[{""name"":""Execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}]},{""name"":""AccountCreated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""creator"",""type"":""Hash160""}]},{""name"":""RoleUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""role"",""type"":""String""},{""name"":""members"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}]},{""name"":""PolicyUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""policyType"",""type"":""String""},{""name"":""target"",""type"":""Hash160""},{""name"":""value"",""type"":""ByteArray""}]}]},""permissions"":[{""contract"":""0x726cb6e0cd8628a1350a611384688911ab75f51b"",""methods"":[""keccak256"",""sha256"",""verifyWithECDsa""]},{""contract"":""0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0"",""methods"":[""deserialize"",""serialize""]},{""contract"":""0xfe924b7cfe89ddd271abaf7210a80a7e11178758"",""methods"":[""request""]},{""contract"":""0xfffdc93764dbaddd97c48f252a53ea4643faa3fd"",""methods"":[""update""]},{""contract"":""*"",""methods"":[""allowance"",""approve"",""balanceOf"",""bindAccountAddress"",""decimals"",""domeActivationCallback"",""getNonce"",""getNonceForAccount"",""getNonceForAddress"",""requestDomeActivation"",""requestDomeActivationByAddress"",""setAdmins"",""setAdminsByAddress"",""setBlacklist"",""setBlacklistByAddress"",""setDomeAccounts"",""setDomeAccountsByAddress"",""setDomeOracle"",""setDomeOracleByAddress"",""setManagers"",""setManagersByAddress"",""setMaxTransfer"",""setMaxTransferByAddress"",""setVerifierContract"",""setVerifierContractByAddress"",""setWhitelist"",""setWhitelistByAddress"",""setWhitelistMode"",""setWhitelistModeByAddress"",""symbol"",""totalSupply"",""transfer""]}],""trusts"":[],""extra"":{""Author"":""R3E Network"",""Email"":""jimmy@r3e.network"",""Description"":""A global, unified permission-controlling programmable account gateway."",""nef"":{""optimization"":""Basic""}}}");

    /// <summary>
    /// Optimization: "Basic"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"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eQwLdG90YWxTdXBwbHmXJgcjIQMAAHkMCWFsbG93YW5jZZcmByMNAwAAeQwHYXBwcm92ZZcmByP7AgAAeQwIZ2V0Tm9uY2WXJgUIIhh5DBJnZXROb25jZUZvckFjY291bnSXJgUIIhh5DBJnZXROb25jZUZvckFkZHJlc3OXJgUIIht5DBVzZXRXaGl0ZWxpc3RCeUFkZHJlc3OXJgUIIh95DBlzZXRXaGl0ZWxpc3RNb2RlQnlBZGRyZXNzlyYFCCISeQwMc2V0V2hpdGVsaXN0lyYFCCIWeQwQc2V0V2hpdGVsaXN0TW9kZZcmBQgiG3kMFXNldEJsYWNrbGlzdEJ5QWRkcmVzc5cmBQgiEnkMDHNldEJsYWNrbGlzdJcmBQgiHXkMF3NldE1heFRyYW5zZmVyQnlBZGRyZXNzlyYFCCIUeQwOc2V0TWF4VHJhbnNmZXKXJgUIIhh5DBJzZXRBZG1pbnNCeUFkZHJlc3OXJgUIIg95DAlzZXRBZG1pbnOXJgUIIhp5DBRzZXRNYW5hZ2Vyc0J5QWRkcmVzc5cmBQgiEXkMC3NldE1hbmFnZXJzlyYFCCIYeQwSYmluZEFjY291bnRBZGRyZXNzlyYFCCIeeQwYc2V0RG9tZUFjY291bnRzQnlBZGRyZXNzlyYFCCIVeQwPc2V0RG9tZUFjY291bnRzlyYFCCIceQwWc2V0RG9tZU9yYWNsZUJ5QWRkcmVzc5cmBQgiE3kMDXNldERvbWVPcmFjbGWXJgUIIiJ5DBxzZXRWZXJpZmllckNvbnRyYWN0QnlBZGRyZXNzlyYFCCIZeQwTc2V0VmVyaWZpZXJDb250cmFjdJcmBQgiJHkMHnJlcXVlc3REb21lQWN0aXZhdGlvbkJ5QWRkcmVzc5cmBQgiG3kMFXJlcXVlc3REb21lQWN0aXZhdGlvbpcmBQgiHHkMFmRvbWVBY3RpdmF0aW9uQ2FsbGJhY2uXJi5oJCkMJEludGVybmFsIG1ldGhvZCByZXF1aXJlcyBzZWxmIHRhcmdldOAiJAkkIQwcTWV0aG9kIG5vdCBhbGxvd2VkIGJ5IHBvbGljeeBAVwACeQuYJBEMDEludmFsaWQgYXJnc+B4DAh0cmFuc2ZlcpcmMXnKE7gkBQkiB3kSztkhJBwMF0ludmFsaWQgdHJhbnNmZXIgYW1vdW504HkSziJLecoSuCQFCSIHeRHO2SEmB3kRziI2ecoTuCQFCSIHeRLO2SEmB3kSziIhCSQbDBZJbnZhbGlkIGFwcHJvdmUgYW1vdW504BAiAkBXAwFfD0Gb9mfOEsBweDVu5v//cWlowUVTi1BBkl3oMXJqC5ckGgwVRXhlY3V0aW9uIGluIHByb2dyZXNz4AwBAdsw2yhpaMFFU4tQQeY/GIRAVwECXwlBm/ZnzhLAcHl4NRvm//9owUVTi1BB5j8YhEBXAAN6XxZ5eEFifVtSIgJAVwEBXwlBm/ZnzhLAcHg17OX//2jBRVOLUEEvWMXtQFcBAV8PQZv2Z84SwHB4Nc3l//9owUVTi1BBL1jF7UBXAQR4NRny//9we3p5aDXs9///IgJAVwYFeDWs6f//eDVd6///cGgLmCQFCSIaaAwUAAAAAAAAAAAAAAAAAAAAAAAAAACYJkV4EcAVDAZ2ZXJpZnloQWJ9W1JxaSQkDB9VbmF1dGhvcml6ZWQgYnkgY3VzdG9tIHZlcmlmaWVy4Hg18+f//yPyAAAAeXg1Qev//3g1jev//zXqAAAAcXl4NbHr//94NfLr//811wAAAHJpJgUIIgNqJg14Nbnn//8juAAAAHl4Nf7r//94NUDs//81sAAAAHNrJBEMDFVuYXV0aG9yaXplZOB4NVDs//90bBC3JCAMG0RvbWUgYWNjb3VudCBub3QgY29uZmlndXJlZOB4NW3u//91QbfDiANtbJ64JCAMG0RvbWUgYWNjb3VudCBub3QgYWN0aXZlIHlldOB4NV/s//8kKAwjRG9tZSBhY2NvdW50IG5vdCB1bmxvY2tlZCBieSBvcmFjbGXgeDUB5///fHt6eDUt+P//QFcHA3kQtiYFCCIFeAuXJgUIIgZ4yhCXJggJI+4AAAAQcBBxI9cAAAAJcnoLmCZWekpzynQQdSJJa23Odnhpzm6XJjtoSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEUISnJFIgltnHVtbDC3aqokBQkiCnhpzkH4J+yMJjVoSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEVpSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpeMq1JSr///9oebgiAkBXAAFfF3g1K+P//4siAkBXAAF4eDQFIgJAVwICeDTjcGhBm/ZnzkGSXegxcWkLlyYFECINaUrYJgZFECIE2yEiAkBBkl3oMUBXAQJ4NUbv//9weWg0xSICQFcCAXg0o3AMFAAAAAAAAAAAAAAAAAAAAAAAAAAAeDSicWkRnmhBm/ZnzkHmPxiEQEHmPxiEQFcBAXg3AQDbMHBo2yg3AwAiAkA3AwBAVwAJfwh/B359fHt6eXg0BSICQFcMCXg1fub//3kLmCQFCSIGfwgLmCQUDA9NaXNzaW5nIHNpZ25lcnPgecp/CMqXJCYMIU1pc21hdGNoZWQgcHVia2V5cyBhbmQgc2lnbmF0dXJlc+B/CMoQtyQkDB9BdCBsZWFzdCBvbmUgc2lnbmF0dXJlIHJlcXVpcmVk4H4QuCQSDA1JbnZhbGlkIG5vbmNl4H8HNfMBAABwQbfDiANotiQWDBFTaWduYXR1cmUgZXhwaXJlZOAMFAAAAAAAAAAAAAAAAAAAAAAAAAAAeDWR/v//cX5plyQSDA1JbnZhbGlkIE5vbmNl4AwYSW52YWxpZCBhcmdzIGhhc2ggbGVuZ3RofTW2AQAAcnw1yv7//9swc2tqNbkBAAAkFwwSQXJncyBoYXNoIG1pc21hdGNo4EHb/qh0QcX7oOA17QEAAHR/B35re3p4NYgFAAB1bWwMAhkB2zATwDX1AQAAdn8IysQAdwcQdwgjswAAAH8IbwjO2zB3CW8JygBAlyQdDBhJbnZhbGlkIHNpZ25hdHVyZSBsZW5ndGjgeW8IzjVxBQAAdwoAen8IbwjObwpu2yg3BAB3C28LJB4MGUludmFsaWQgRUlQLTcxMiBzaWduYXR1cmXgeW8IzjXdBgAASm8HbwhR0EVvCEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3cIRW8IfwjKtSVM////eDV4/f//fHt6bwd4NZ/6//94NcP5//9vB3g1wwcAAHp4NQb6//87ACV8e3p4FMAMB0V4ZWN1dGVBlQFvYXx7ejUH+v//IgQ9Fz0VeDUL+v//eDUkCQAAeDUe+v//P0DKQFcAAXgQtyQVDBBJbnZhbGlkIGRlYWRsaW5l4HgDABCl1OgAAAC1Jgl4AegDoCIFeCICQFcBAnjbMHBoygAglyQEeeBoIgJAVwECeMp5ypgmBQkiThBwIkF4aM55aM6YJgUJIj5oSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcEVoeMq1JL0IIgJAVwECeTWVAQAAeDVuAgAAXxhfGV8aFcA0DnBo2yg3AwDbMCICQFcGARBwEHEibGh4ac7KnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9KcEVpSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpeMq1JJJoiHEQchBzI+cAAAB4a850EHUibmxtzkppam2eSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRW1KnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ91RW1syrUkkGpsyp5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfSnJFa0qcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3NFa3jKtSUa////aSICQFcDAXjbMHBoygAUlyQbDBZJbnZhbGlkIGFkZHJlc3MgbGVuZ3Ro4AAgiHEQciOiAAAAaAATap9KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkppHGqeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAFLUlX////2kiAkDbMEBXBAF4ELgkFAwPSW52YWxpZCB1aW50MjU24HjbMHBoynFpELckBQkiN2hpEZ9KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzhCXJjVpSp1KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpACC2JBUMEHVpbnQyNTYgb3ZlcmZsb3fgACCIchBzIm9oa85KagAfa59KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFa0qcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3NFa2m1JJBqIgJAQcX7oOBAVwMGejcDANswcHg3AwDbMHF9Nb7+//98Nbj+//97aHk10f3//2lfGxfANVP8//9yatsoNwMA2zAiAkBAzkBXAwF42zBwaMoAQJcnigAAAABBiHEUSmkQUdBFEHIibmhqzkppahGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAQLUkkGlKcEVoygBBlyQFCSIHaBDOFJckKgwlSW52YWxpZCBwdWJrZXkgbGVuZ3RoIGZvciBjb21wcmVzc2lvbuAAIYhxaABAzhKiEJcmBRIiAxNKaRBR0EUQciOhAAAAaGoRnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OSmlqEZ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFagAgtSVg////adsoStgkCUrKACEoAzoiAkA3BABAVwQBeNswcGjKAEGXJAUJIgdoEM4UlyeDAAAAAECIcRByIm5oahGeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaWpR0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqAEC1JJBpSnBFaMoAQJckGgwVSW52YWxpZCBwdWJrZXkgbGVuZ3Ro4GjbKDcDANswcQAUiHIQcyJvaQAfa59KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkpqa1HQRWtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWsAFLUkj2rbKErYJAlKygAUKAM6IgJAVwICeQuYJAUJIgZ5yhC3JBwMF01pc3NpbmcgbWV0YS10eCBzaWduZXJz4Hk0InBfEEGb9mfOEsBxaNsoeDU32P//acFFU4tQQeY/GIRAVwUBeMoAFKBKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfiHAQcSMEAQAAeGnO2zByasoAFJckGAwTSW52YWxpZCBzaWduZXIgaGFzaOBpABSgSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3MQdCJuamzOSmhrbJ5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFbEqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3RFbAAUtSSQaUqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaXjKtSX9/v//aCICQFcBAV8QQZv2Z84SwHB4Nc3W//9owUVTi1BBL1jF7UBXAQl4NRnj//9wfwh/B359fHt6eWg1L/T//yICQFcDAXg1rdz//3g1+dz//zXR1f//JgUIIhN4NRrd//94NVvd//81u9X//yYFCCITeDV43f//eDW63f//NaXV//9waCYEInd4NWfg//9xacoQtyQFCSINQTlTbjxB2/6odJcmSGl4NUzc//94NZjc//81t+H//yYFCCIUaXg1uNz//3g1+dz//zWg4f//JgUIIhRpeDUV3f//eDVX3f//NYnh//9yaiYEIhQJJBEMDFVuYXV0aG9yaXplZOBAVwICeDUp3v//Xw5Bm/ZnzhLAcHg1z9X//3F5C5cmBQgiBnkMAJcmEGlowUVTi1BBL1jF7SIPeWlowUVTi1BB5j8YhHg1g9j//0BXAQJ4Nfbh//9weWg0qkBXCgF4NZDZ//94NeH+//94Nfnc//9waBC3JCAMG0RvbWUgYWNjb3VudCBub3QgY29uZmlndXJlZOB4NRbf//9xQbfDiANpaJ64JCAMG0RvbWUgYWNj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").AsSerializable<Neo.SmartContract.NefFile>();

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
