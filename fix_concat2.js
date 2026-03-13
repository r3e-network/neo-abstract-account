const fs = require('fs');

let file = 'contracts/AbstractAccount.StorageAndContext.cs';
let content = fs.readFileSync(file, 'utf8');

// Refactor BuildVerifyProxyScript
content = content.replace(/ConcatBytes\(\s*new byte\[\] \{ \(byte\)OpCode\.PUSHDATA1, \(byte\)accountIdBytes\.Length \},\s*accountIdBytes,\s*new byte\[\] \{ 0x11, 0xC0, 0x1F, \(byte\)OpCode\.PUSHDATA1, 0x06 \},\s*new byte\[\] \{ \(byte\)'v', \(byte\)'e', \(byte\)'r', \(byte\)'i', \(byte\)'f', \(byte\)'y' \},\s*new byte\[\] \{ \(byte\)OpCode\.PUSHDATA1, 0x14 \},\s*\(byte\[\]\)GetWalletContractHash\(\),\s*ContractCallSyscall\s*\)/g, 
'Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(new byte[] { (byte)OpCode.PUSHDATA1, (byte)accountIdBytes.Length }, accountIdBytes), new byte[] { 0x11, 0xC0, 0x1F, (byte)OpCode.PUSHDATA1, 0x06 }), new byte[] { (byte)\'v\', (byte)\'e\', (byte)\'r\', (byte)\'i\', (byte)\'f\', (byte)\'y\' }), new byte[] { (byte)OpCode.PUSHDATA1, 0x14 }), (byte[])GetWalletContractHash()), ContractCallSyscall)');

// Refactor GetCanonicalStorageKeyBytes
content = content.replace(/ConcatBytes\(CanonicalShortAccountIdKeyPrefix, accountId\)/g, 'Helper.Concat(CanonicalShortAccountIdKeyPrefix, accountId)');
content = content.replace(/ConcatBytes\(CanonicalLongAccountIdKeyPrefix, \(byte\[\]\)CryptoLib\.Sha256\(\(ByteString\)accountId\)\)/g, 'Helper.Concat(CanonicalLongAccountIdKeyPrefix, (byte[])CryptoLib.Sha256((ByteString)accountId))');

// Refactor BuildProxyMethodSuffix
content = content.replace(/ConcatBytes\(\s*new byte\[\] \{ \(byte\)OpCode\.PUSHDATA1, \(byte\)methodBytes\.Length \},\s*methodBytes,\s*new byte\[\] \{ \(byte\)OpCode\.PUSHDATA1, 0x14 \},\s*contractHash,\s*ContractCallSyscall\s*\)/g,
'Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(new byte[] { (byte)OpCode.PUSHDATA1, (byte)methodBytes.Length }, methodBytes), new byte[] { (byte)OpCode.PUSHDATA1, 0x14 }), contractHash), ContractCallSyscall)');

// Refactor ValidateVerifyProxyScript
content = content.replace(/ConcatBytes\(\s*new byte\[\] \{ \(byte\)OpCode\.PUSHDATA1, \(byte\)accountIdBytes\.Length \},\s*accountIdBytes,\s*new byte\[\] \{ 0x11, 0xC0, 0x1F \}\s*\)/g,
'Helper.Concat(Helper.Concat(new byte[] { (byte)OpCode.PUSHDATA1, (byte)accountIdBytes.Length }, accountIdBytes), new byte[] { 0x11, 0xC0, 0x1F })');

// Remove ConcatBytes entirely
content = content.replace(/\s*private static byte\[\] ConcatBytes\(params byte\[\]\[\] chunks\)\s*\{\s*int total = 0;\s*for \(int i = 0; i < chunks\.Length; i\+\+\)\s*\{\s*total \+= chunks\[i\]\.Length;\s*\}\s*byte\[\] result = new byte\[total\];\s*int offset = 0;\s*for \(int i = 0; i < chunks\.Length; i\+\+\)\s*\{\s*byte\[\] chunk = chunks\[i\];\s*for \(int j = 0; j < chunk\.Length; j\+\+\)\s*\{\s*result\[offset \+ j\] = chunk\[j\];\s*\}\s*offset \+= chunk\.Length;\s*\}\s*return result;\s*\}/g, '');

fs.writeFileSync(file, content);

file = 'contracts/AbstractAccount.MetaTx.cs';
content = fs.readFileSync(file, 'utf8');

// Refactor MetaTx ConcatBytes
content = content.replace(/ConcatBytes\(new byte\[\] \{ 0x19, 0x01 \}, domainSeparator, structHash\)/g,
'Helper.Concat(Helper.Concat(new byte[] { 0x19, 0x01 }, domainSeparator), structHash)');

content = content.replace(/ConcatBytes\(\s*structTypeHash,\s*accountAddressWord,\s*targetContractWord,\s*methodHash,\s*argsHash,\s*nonceWord,\s*deadlineWord\s*\)/g,
'Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(structTypeHash, accountAddressWord), targetContractWord), methodHash), argsHash), nonceWord), deadlineWord)');

content = content.replace(/ConcatBytes\(\s*domainTypeHash,\s*contractNameHash,\s*contractVersionHash,\s*chainIdWord,\s*verifyingContractWord\s*\)/g,
'Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat(domainTypeHash, contractNameHash), contractVersionHash), chainIdWord), verifyingContractWord)');

content = content.replace(/\s*private static byte\[\] ConcatBytes\(params byte\[\]\[\] chunks\)\s*\{\s*int total = 0;\s*for \(int i = 0; i < chunks\.Length; i\+\+\)\s*\{\s*total \+= chunks\[i\]\.Length;\s*\}\s*byte\[\] result = new byte\[total\];\s*int offset = 0;\s*for \(int i = 0; i < chunks\.Length; i\+\+\)\s*\{\s*byte\[\] chunk = chunks\[i\];\s*for \(int j = 0; j < chunk\.Length; j\+\+\)\s*\{\s*result\[offset \+ j\] = chunk\[j\];\s*\}\s*offset \+= chunk\.Length;\s*\}\s*return result;\s*\}/g, '');

fs.writeFileSync(file, content);
