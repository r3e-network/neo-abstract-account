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

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""UnifiedSmartWalletV2"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""createAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""createAccountWithAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":956,""safe"":false},{""name"":""verify"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":1302,""safe"":true},{""name"":""setAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2164,""safe"":false},{""name"":""setAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2182,""safe"":false},{""name"":""getAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":1586,""safe"":true},{""name"":""getAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":2280,""safe"":true},{""name"":""getAdminThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":1519,""safe"":true},{""name"":""getAdminThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":2294,""safe"":true},{""name"":""setManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2308,""safe"":false},{""name"":""setManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2326,""safe"":false},{""name"":""getManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":1694,""safe"":true},{""name"":""getManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":2342,""safe"":true},{""name"":""getManagerThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":1627,""safe"":true},{""name"":""getManagerThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":2359,""safe"":true},{""name"":""setBlacklist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2376,""safe"":false},{""name"":""setBlacklistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2438,""safe"":false},{""name"":""setWhitelistMode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2454,""safe"":false},{""name"":""setWhitelistModeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2519,""safe"":false},{""name"":""setWhitelist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2534,""safe"":false},{""name"":""setWhitelistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2596,""safe"":false},{""name"":""setMaxTransfer"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2612,""safe"":false},{""name"":""setMaxTransferByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2672,""safe"":false},{""name"":""bindAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":2688,""safe"":false},{""name"":""getAccountIdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":2705,""safe"":true},{""name"":""getAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":2736,""safe"":true},{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2812,""safe"":false},{""name"":""execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":2841,""safe"":false},{""name"":""executeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":5105,""safe"":false},{""name"":""getNonce"",""parameters"":[{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":5221,""safe"":true},{""name"":""getNonceForAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":5229,""safe"":true},{""name"":""getNonceForAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":5266,""safe"":true},{""name"":""computeArgsHash"",""parameters"":[{""name"":""args"",""type"":""Array""}],""returntype"":""ByteArray"",""offset"":5308,""safe"":true},{""name"":""computeArgsHashForMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""ByteArray"",""offset"":5325,""safe"":true},{""name"":""computeArgsHashForMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""ByteArray"",""offset"":5332,""safe"":true},{""name"":""executeMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""Any"",""offset"":5339,""safe"":false},{""name"":""executeMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""Any"",""offset"":7571,""safe"":false},{""name"":""update"",""parameters"":[{""name"":""nefFile"",""type"":""ByteArray""},{""name"":""manifest"",""type"":""String""}],""returntype"":""Void"",""offset"":7598,""safe"":false},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":7655,""safe"":false}],""events"":[{""name"":""Execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}]},{""name"":""AccountCreated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""creator"",""type"":""Hash160""}]}]},""permissions"":[{""contract"":""0x726cb6e0cd8628a1350a611384688911ab75f51b"",""methods"":[""keccak256"",""sha256"",""verifyWithECDsa""]},{""contract"":""0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0"",""methods"":[""deserialize"",""serialize""]},{""contract"":""0xfffdc93764dbaddd97c48f252a53ea4643faa3fd"",""methods"":[""update""]},{""contract"":""*"",""methods"":[""allowance"",""approve"",""balanceOf"",""bindAccountAddress"",""decimals"",""getNonce"",""getNonceForAccount"",""getNonceForAddress"",""setAdmins"",""setAdminsByAddress"",""setBlacklist"",""setBlacklistByAddress"",""setManagers"",""setManagersByAddress"",""setMaxTransfer"",""setMaxTransferByAddress"",""setWhitelist"",""setWhitelistByAddress"",""setWhitelistMode"",""setWhitelistModeByAddress"",""symbol"",""totalSupply"",""transfer""]}],""trusts"":[],""extra"":{""Author"":""R3E Neo Explorer"",""Email"":""dev@neo.org"",""Description"":""A global, unified permission-controlling abstract account gateway."",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"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yhC3JBMMDkludmFsaWQgbWV0aG9k4HgMCHRyYW5zZmVylyYDQHgMCWJhbGFuY2VPZpcmA0B4DAZzeW1ib2yXJgNAeAwIZGVjaW1hbHOXJgNAeAwLdG90YWxTdXBwbHmXJgNAeAwJYWxsb3dhbmNllyYDQHgMB2FwcHJvdmWXJgNAeAwIZ2V0Tm9uY2WXJgNAeAwSZ2V0Tm9uY2VGb3JBY2NvdW50lyYDQHgMEmdldE5vbmNlRm9yQWRkcmVzc5cmA0B4DBVzZXRXaGl0ZWxpc3RCeUFkZHJlc3OXJgNAeAwZc2V0V2hpdGVsaXN0TW9kZUJ5QWRkcmVzc5cmA0B4DAxzZXRXaGl0ZWxpc3SXJgNAeAwQc2V0V2hpdGVsaXN0TW9kZZcmA0B4DBVzZXRCbGFja2xpc3RCeUFkZHJlc3OXJgNAeAwMc2V0QmxhY2tsaXN0lyYDQHgMF3NldE1heFRyYW5zZmVyQnlBZGRyZXNzlyYDQHgMDnNldE1heFRyYW5zZmVylyYDQHgMEnNldEFkbWluc0J5QWRkcmVzc5cmA0B4DAlzZXRBZG1pbnOXJgNAeAwUc2V0TWFuYWdlcnNCeUFkZHJlc3OXJgNAeAwLc2V0TWFuYWdlcnOXJgNAeAwSYmluZEFjY291bnRBZGRyZXNzlyYDQAkkIQwcTWV0aG9kIG5vdCBhbGxvd2VkIGJ5IHBvbGljeeBAVwMBXwhBm/ZnzhLAcHg1a/L//3FpaMFFU4tQQZJd6DFyatgkGgwVRXhlY3V0aW9uIGluIHByb2dyZXNz4AwBAdsw2yhpaMFFU4tQQeY/GIRAVwECXkGb9mfOEsBweXg1GvL//2jBRVOLUEHmPxiEQFcAA3kMCHRyYW5zZmVylyYVeh8MCHRyYW5zZmVyeEFifVtSQHkMCWJhbGFuY2VPZpcmFnofDAliYWxhbmNlT2Z4QWJ9W1JAeQwGc3ltYm9slyYTeh8MBnN5bWJvbHhBYn1bUkB5DAhkZWNpbWFsc5cmFXofDAhkZWNpbWFsc3hBYn1bUkB5DAt0b3RhbFN1cHBseZcmGHofDAt0b3RhbFN1cHBseXhBYn1bUkB5DAlhbGxvd2FuY2WXJhZ6HwwJYWxsb3dhbmNleEFifVtSQHkMB2FwcHJvdmWXJhR6HwwHYXBwcm92ZXhBYn1bUkB5DAhnZXROb25jZZcmFXofDAhnZXROb25jZXhBYn1bUkB5DBJnZXROb25jZUZvckFjY291bnSXJh96HwwSZ2V0Tm9uY2VGb3JBY2NvdW50eEFifVtSQHkMEmdldE5vbmNlRm9yQWRkcmVzc5cmH3ofDBJnZXROb25jZUZvckFkZHJlc3N4QWJ9W1JAeQwVc2V0V2hpdGVsaXN0QnlBZGRyZXNzlyYieh8MFXNldFdoaXRlbGlzdEJ5QWRkcmVzc3hBYn1bUkB5DBlzZXRXaGl0ZWxpc3RNb2RlQnlBZGRyZXNzlyYmeh8MGXNldFdoaXRlbGlzdE1vZGVCeUFkZHJlc3N4QWJ9W1JAeQwMc2V0V2hpdGVsaXN0lyYZeh8MDHNldFdoaXRlbGlzdHhBYn1bUkB5DBBzZXRXaGl0ZWxpc3RNb2RllyYdeh8MEHNldFdoaXRlbGlzdE1vZGV4QWJ9W1JAeQwVc2V0QmxhY2tsaXN0QnlBZGRyZXNzlyYieh8MFXNldEJsYWNrbGlzdEJ5QWRkcmVzc3hBYn1bUkB5DAxzZXRCbGFja2xpc3SXJhl6HwwMc2V0QmxhY2tsaXN0eEFifVtSQHkMF3NldE1heFRyYW5zZmVyQnlBZGRyZXNzlyYkeh8MF3NldE1heFRyYW5zZmVyQnlBZGRyZXNzeEFifVtSQHkMDnNldE1heFRyYW5zZmVylyYbeh8MDnNldE1heFRyYW5zZmVyeEFifVtSQHkMEnNldEFkbWluc0J5QWRkcmVzc5cmH3ofDBJzZXRBZG1pbnNCeUFkZHJlc3N4QWJ9W1JAeQwJc2V0QWRtaW5zlyYWeh8MCXNldEFkbWluc3hBYn1bUkB5DBRzZXRNYW5hZ2Vyc0J5QWRkcmVzc5cmIXofDBRzZXRNYW5hZ2Vyc0J5QWRkcmVzc3hBYn1bUkB5DAtzZXRNYW5hZ2Vyc5cmGHofDAtzZXRNYW5hZ2Vyc3hBYn1bUkB5DBJiaW5kQWNjb3VudEFkZHJlc3OXJh96HwwSYmluZEFjY291bnRBZGRyZXNzeEFifVtSQAkkIQwcTWV0aG9kIG5vdCBhbGxvd2VkIGJ5IHBvbGljeeALQFcBAV5Bm/ZnzhLAcHg1yu3//2jBRVOLUEEvWMXtQFcBAV8IQZv2Z84SwHB4Navt//9owUVTi1BBL1jF7UBXAQR4NZ70//9we3p5aDUa9///QFcCBXg1j/D//3l4Nd/x//94NRzy//81y/L//3B5eDU48v//eDV18v//Nbjy//9xaCYFCCIDaSQRDAxVbmF1dGhvcml6ZWTgfHt6eDVa9///QFcAAl8PeDUv7f//i3mLQFcAAXh4NANAVwICeXg05HBoQZv2Z85Bkl3oMXFp2CYEEEBpStgmBUUQQNshQFcBAng1/fP//3B5aDTPQFcCAnl4NLBweXg0wnFpnGhBm/ZnzkHmPxiEQFcBAXg3AQDbMHBo2yg3AwBAVwAJfDTrQFcACXw05EBXAAl/CH8Hfn18e3p5eDQDQFcKCXg1qO///3k1bwEAAHB+ELgkEgwNSW52YWxpZCBub25jZeB/BzWXAgAAcUG3w4gDabYkFgwRU2lnbmF0dXJlIGV4cGlyZWTgaHg1Nf///3J+apckEgwNSW52YWxpZCBOb25jZeAMGEludmFsaWQgYXJncyBoYXNoIGxlbmd0aH01bAIAAEV8NUf////bMHN/CNswdGzKAECXJB0MGEludmFsaWQgc2lnbmF0dXJlIGxlbmd0aOBB2/6odEHF+6DgNT4CAAB1fwd+a3t6eDXDBQAAdm5tDAIZAdswE8A1RAIAAHcHeTXkBQAAdwgAen8IbwhvB9soNwQAdwlvCSQeDBlJbnZhbGlkIEVJUC03MTIgc2lnbmF0dXJl4Gh4NZb+//98e3poEcB4Ne79//94NfX4//9oeDUwBwAAeng1OPn//zsAIXx7engUwAwHRXhlY3V0ZUGVAW9hfHt6NTj5//89FXg1Yv3//3g1HAcAAHg1dP3//z9AVwQBeNswcGjKAEGXJAUJIgdoEM4UlyZ9AECIcRByIm1oapxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkppalHQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAQLUkkWlwaMoAQJckGgwVSW52YWxpZCBwdWJrZXkgbGVuZ3Ro4GjbKDcDANswcQAUiHIQcyJvaQAfa59KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkpqa1HQRWtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWsAFLUkj2rbKErYJAlKygAUKAM6QFcAAXgQtyQVDBBJbnZhbGlkIGRlYWRsaW5l4HgDABCl1OgAAAC1Jgh4AegDoEB4QFcBAnjbMHBoygAglyQEeeBoQFcBAnk1jQEAAHg1YQIAAF8QXxFfEhXANAxwaNsoNwMA2zBAVwYBEHAQcSJqaHhpzsqeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3BpSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpeMq1JJRoiHEQchBzI+UAAAB4a850EHUibmxtzkppam2eSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRW1KnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ91RW1syrUkkGpsyp5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcmtKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9zRWt4yrUlHP///2lAVwMBeNswcGjKABSXJBsMFkludmFsaWQgYWRkcmVzcyBsZW5ndGjgACCIcRByI6IAAABoABNqn0oCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OSmkcap5KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFagAUtSVf////aUBXBAF4ELgkFAwPSW52YWxpZCB1aW50MjU24HjbMHBoynFpELckBQkiNmhpnUoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OEJcmNWlKnUoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9xRWkAILYkFQwQdWludDI1NiBvdmVyZmxvd+AAIIhyEHMib2hrzkpqAB9rn0oCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVrSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfc0VrabUkkGpAVwMGejcDANswcHg3AwDbMHF9Ncf+//98NcH+//97aHk13/3//2lfExfANWf8//9yatsoNwMA2zBAVwMBeNswcGjKAECXJ4cAAAAAQYhxFEppEFHQRRByIm1oas5KaWqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAQLUkkWlwaMoAQZckBQkiB2gQzhSXJCoMJUludmFsaWQgcHVia2V5IGxlbmd0aCBmb3IgY29tcHJlc3Npb27gACGIcWgAQM4SohCXJgUSIgMTSmkQUdBFEHIjnwAAAGhqnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ/OSmlqnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqACC1JWL///9p2yhK2CQJSsoAISgDOkBXAQJfB0Gb9mfOEsBweXg1KOT//2jBRVOLUEHmPxiEQFcBAV8HQZv2Z84SwHB4NQnk//9owUVTi1BBL1jF7UBXAQl4Nfzq//9wfwh/B359fHt6eWg1RPf//0BXAQJfDUGb9mfOQZJd6DFK2CQJSsoAFCgDOnBoQfgn7IwkEQwMTm90IERlcGxveWVy4At5eDcFAEBWFAwBANswZw0MAQHbMGAMAQLbMGEMAQPbMGIMAQTbMGMMAQXbMGcKDAEG2zBnCwwBB9swZwkMAQjbMGcMDAEJ2zBnDwwBCtswZgwBC9swZAwBDNswZQwBDdswZwgMAf/bMGcHDCCLc8PGm7j+PVEuzEz3Wcx5I597F5sP+sqpp11SKzlAD9swZxIMIC49OOoAVa2ZtVcuBmZYQx/0xA268+FuIVRjncbiY0gD2zBnEQwgyJ79qlTA8gx632Eogt8JUPWpUWN+AwfNy0xnLymLi8bbMGcQDCAQuOm9S1b5IjPGJd9HpOiKTu70kKAdPBq9IhrP31GQuNswZxNA7NqTLQ==").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Events

    public delegate void delAccountCreated(byte[]? accountId, UInt160? creator);

    [DisplayName("AccountCreated")]
    public event delAccountCreated? OnAccountCreated;

    public delegate void delExecute(byte[]? accountId, UInt160? target, string? method, IList<object>? args);

    [DisplayName("Execute")]
    public event delExecute? OnExecute;

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
    [DisplayName("computeArgsHashForMetaTx")]
    public abstract byte[]? ComputeArgsHashForMetaTx(byte[]? accountId, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("computeArgsHashForMetaTxByAddress")]
    public abstract byte[]? ComputeArgsHashForMetaTxByAddress(UInt160? accountAddress, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

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
    public abstract object? ExecuteMetaTx(byte[]? accountId, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeMetaTxByAddress")]
    public abstract object? ExecuteMetaTxByAddress(UInt160? accountAddress, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

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
