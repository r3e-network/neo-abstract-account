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

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""UnifiedSmartWalletV2"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""createAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""createAccountWithAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":1106,""safe"":false},{""name"":""verify"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":1454,""safe"":true},{""name"":""setAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4423,""safe"":false},{""name"":""setAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4441,""safe"":false},{""name"":""getAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":3019,""safe"":true},{""name"":""getAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":4540,""safe"":true},{""name"":""getAdminThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":2952,""safe"":true},{""name"":""getAdminThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4554,""safe"":true},{""name"":""setManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4568,""safe"":false},{""name"":""setManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4586,""safe"":false},{""name"":""getManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":3127,""safe"":true},{""name"":""getManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":4602,""safe"":true},{""name"":""getManagerThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":3060,""safe"":true},{""name"":""getManagerThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4619,""safe"":true},{""name"":""setDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4636,""safe"":false},{""name"":""setDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""domes"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""},{""name"":""timeoutPeriod"",""type"":""Integer""}],""returntype"":""Void"",""offset"":4901,""safe"":false},{""name"":""getDomeAccounts"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":3236,""safe"":true},{""name"":""getDomeAccountsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":4921,""safe"":true},{""name"":""getDomeThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":3168,""safe"":true},{""name"":""getDomeThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4938,""safe"":true},{""name"":""getDomeTimeout"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":3278,""safe"":true},{""name"":""getDomeTimeoutByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":4955,""safe"":true},{""name"":""setBlacklist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":4972,""safe"":false},{""name"":""setBlacklistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5089,""safe"":false},{""name"":""setWhitelistMode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5108,""safe"":false},{""name"":""setWhitelistModeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5253,""safe"":false},{""name"":""setWhitelist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5271,""safe"":false},{""name"":""setWhitelistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5388,""safe"":false},{""name"":""setMaxTransfer"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":5407,""safe"":false},{""name"":""setMaxTransferByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":5508,""safe"":false},{""name"":""bindAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":5524,""safe"":false},{""name"":""setVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":5541,""safe"":false},{""name"":""setVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""verifierContract"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":5745,""safe"":false},{""name"":""getAccountIdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":5763,""safe"":true},{""name"":""getAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":5795,""safe"":true},{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":5872,""safe"":false},{""name"":""onNEP17Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":5918,""safe"":false},{""name"":""onNEP11Payment"",""parameters"":[{""name"":""from"",""type"":""Hash160""},{""name"":""amount"",""type"":""Integer""},{""name"":""tokenId"",""type"":""ByteArray""},{""name"":""data"",""type"":""Any""}],""returntype"":""Void"",""offset"":5922,""safe"":false},{""name"":""execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":5926,""safe"":false},{""name"":""executeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":7931,""safe"":false},{""name"":""getNonce"",""parameters"":[{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8581,""safe"":true},{""name"":""getNonceForAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8589,""safe"":true},{""name"":""getNonceForAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":8625,""safe"":true},{""name"":""computeArgsHash"",""parameters"":[{""name"":""args"",""type"":""Array""}],""returntype"":""ByteArray"",""offset"":8687,""safe"":true},{""name"":""executeMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":8704,""safe"":false},{""name"":""executeMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKeys"",""type"":""Array""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signatures"",""type"":""Array""}],""returntype"":""Any"",""offset"":11294,""safe"":false},{""name"":""setDomeOracle"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":11507,""safe"":false},{""name"":""setDomeOracleByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""url"",""type"":""String""}],""returntype"":""Void"",""offset"":11580,""safe"":false},{""name"":""requestDomeActivation"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Void"",""offset"":11595,""safe"":false},{""name"":""requestDomeActivationByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":11993,""safe"":false},{""name"":""domeActivationCallback"",""parameters"":[{""name"":""url"",""type"":""String""},{""name"":""userData"",""type"":""Any""},{""name"":""responseCode"",""type"":""Integer""},{""name"":""result"",""type"":""ByteArray""}],""returntype"":""Void"",""offset"":12646,""safe"":false},{""name"":""isDomeOracleUnlocked"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":3373,""safe"":true},{""name"":""getLastActiveTimestamp"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":3326,""safe"":true},{""name"":""getLastActiveTimestampByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":12922,""safe"":true},{""name"":""getVerifierContract"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":2881,""safe"":true},{""name"":""getVerifierContractByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Hash160"",""offset"":12939,""safe"":true},{""name"":""update"",""parameters"":[{""name"":""nefFile"",""type"":""ByteArray""},{""name"":""manifest"",""type"":""String""}],""returntype"":""Void"",""offset"":12956,""safe"":false},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":13013,""safe"":false}],""events"":[{""name"":""Execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}]},{""name"":""AccountCreated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""creator"",""type"":""Hash160""}]},{""name"":""RoleUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""role"",""type"":""String""},{""name"":""members"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}]},{""name"":""PolicyUpdated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""policyType"",""type"":""String""},{""name"":""target"",""type"":""Hash160""},{""name"":""value"",""type"":""ByteArray""}]}]},""permissions"":[{""contract"":""0x726cb6e0cd8628a1350a611384688911ab75f51b"",""methods"":[""keccak256"",""sha256"",""verifyWithECDsa""]},{""contract"":""0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0"",""methods"":[""deserialize"",""serialize""]},{""contract"":""0xfe924b7cfe89ddd271abaf7210a80a7e11178758"",""methods"":[""request""]},{""contract"":""0xfffdc93764dbaddd97c48f252a53ea4643faa3fd"",""methods"":[""update""]},{""contract"":""*"",""methods"":[""allowance"",""approve"",""balanceOf"",""bindAccountAddress"",""decimals"",""domeActivationCallback"",""getNonce"",""getNonceForAccount"",""getNonceForAddress"",""requestDomeActivation"",""requestDomeActivationByAddress"",""setAdmins"",""setAdminsByAddress"",""setBlacklist"",""setBlacklistByAddress"",""setDomeAccounts"",""setDomeAccountsByAddress"",""setDomeOracle"",""setDomeOracleByAddress"",""setManagers"",""setManagersByAddress"",""setMaxTransfer"",""setMaxTransferByAddress"",""setVerifierContract"",""setVerifierContractByAddress"",""setWhitelist"",""setWhitelistByAddress"",""setWhitelistMode"",""setWhitelistModeByAddress"",""symbol"",""totalSupply"",""transfer""]}],""trusts"":[],""extra"":{""Author"":""R3E Network"",""Email"":""jimmy@r3e.network"",""Description"":""A global, unified permission-controlling programmable account gateway."",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"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Y2VGb3JBZGRyZXNzlyYFCCIbeQwVc2V0V2hpdGVsaXN0QnlBZGRyZXNzlyYFCCIfeQwZc2V0V2hpdGVsaXN0TW9kZUJ5QWRkcmVzc5cmBQgiEnkMDHNldFdoaXRlbGlzdJcmBQgiFnkMEHNldFdoaXRlbGlzdE1vZGWXJgUIIht5DBVzZXRCbGFja2xpc3RCeUFkZHJlc3OXJgUIIhJ5DAxzZXRCbGFja2xpc3SXJgUIIh15DBdzZXRNYXhUcmFuc2ZlckJ5QWRkcmVzc5cmBQgiFHkMDnNldE1heFRyYW5zZmVylyYFCCIYeQwSc2V0QWRtaW5zQnlBZGRyZXNzlyYFCCIPeQwJc2V0QWRtaW5zlyYFCCIaeQwUc2V0TWFuYWdlcnNCeUFkZHJlc3OXJgUIIhF5DAtzZXRNYW5hZ2Vyc5cmBQgiGHkMEmJpbmRBY2NvdW50QWRkcmVzc5cmBQgiHnkMGHNldERvbWVBY2NvdW50c0J5QWRkcmVzc5cmBQgiFXkMD3NldERvbWVBY2NvdW50c5cmBQgiHHkMFnNldERvbWVPcmFjbGVCeUFkZHJlc3OXJgUIIhN5DA1zZXREb21lT3JhY2xllyYFCCIieQwcc2V0VmVyaWZpZXJDb250cmFjdEJ5QWRkcmVzc5cmBQgiGXkME3NldFZlcmlmaWVyQ29udHJhY3SXJgUIIiR5DB5yZXF1ZXN0RG9tZUFjdGl2YXRpb25CeUFkZHJlc3OXJgUIIht5DBVyZXF1ZXN0RG9tZUFjdGl2YXRpb26XJgUIIhx5DBZkb21lQWN0aXZhdGlvbkNhbGxiYWNrlyYtaCQpDCRJbnRlcm5hbCBtZXRob2QgcmVxdWlyZXMgc2VsZiB0YXJnZXTgQAkkIQwcTWV0aG9kIG5vdCBhbGxvd2VkIGJ5IHBvbGljeeBAVwACedgmEQwMSW52YWxpZCBhcmdz4HgMCHRyYW5zZmVylyYwecoTuCQFCSIHeRLO2SEkHAwXSW52YWxpZCB0cmFuc2ZlciBhbW91bnTgeRLOQHnKErgkBQkiB3kRztkhJgZ5Ec5AecoTuCQFCSIHeRLO2SEmBnkSzkAJJBsMFkludmFsaWQgYXBwcm92ZSBhbW91bnTgEEBXAwFfEUGb9mfOEsBweDU54///cWlowUVTi1BBkl3oMXJq2CQaDBVFeGVj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aOAAIIhxEHIjogAAAGgAE2qfSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaRxqnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqABS1JV////9pQFcEAXgQuCQUDA9JbnZhbGlkIHVpbnQyNTbgeNswcGjKcWkQtyQFCSI2aGmdSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn84QlyY1aUqdSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaQAgtiQVDBB1aW50MjU2IG92ZXJmbG934AAgiHIQcyJvaGvOSmoAH2ufSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWtptSSQakBXAwZ6NwMA2zBweDcDANswcX01x/7//3w1wf7//3toeTXf/f//aV8dF8A1YuH//3Jq2yg3AwDbMEBXAwF42zBwaMoAQJcnhwAAAABBiHEUSmkQUdBFEHIibWhqzkppapxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFagBAtSSRaXBoygBBlyQFCSIHaBDOFJckKgwlSW52YWxpZCBwdWJrZXkgbGVuZ3RoIGZvciBjb21wcmVzc2lvbuAAIYhxaABAzhKiEJcmBRIiAxNKaRBR0EUQciOfAAAAaGqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaWqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAILUlYv///2nbKErYJAlKygAhKAM6QFcEAXjbMHBoygBBlyQFCSIHaBDOFJcmfQBAiHEQciJtaGqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaWpR0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqAEC1JJFpcGjKAECXJBoMFUludmFsaWQgcHVia2V5IGxlbmd0aOBo2yg3AwDbMHEAFIhyEHMib2kAH2ufSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KamtR0EVrSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfc0VrABS1JI9q2yhK2CQJSsoAFCgDOkBXAgJ52CYFCSIGecoQtyQcDBdNaXNzaW5nIG1ldGEtdHggc2lnbmVyc+B5NCJwXxJBm/ZnzhLAcWjbKHg14db//2nBRVOLUEHmPxiEQFcFAXjKABSgSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn4hwEHEjBAEAAHhpztswcmrKABSXJBgME0ludmFsaWQgc2lnbmVyIGhhc2jgaQAUoEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zEHQibmpszkpoa2yeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWxKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ90RWwAFLUkkGlKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9xRWl4yrUl/f7//2hAVwEBXxJBm/ZnzhLAcHg1edX//2jBRVOLUEEvWMXtQFcBCXg1ROX//3B/CH8Hfn18e3p5aDXe9f//QFcDAXg1S9///3g1iN///zWk1P//JgUIIhN4NaHf//94Nd7f//81jtT//yYFCCITeDX33///eDU14P//NXjU//9w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").AsSerializable<Neo.SmartContract.NefFile>();

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
