const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// The neo compiler has a well-known bug with "ByteString? data" syntax. Wait, the nullable ByteString `ByteString? data` was compiling before!
// The error is: System.NullReferenceException at ConvertReturnStatement -> ConvertExpression -> ConvertNonConstantExpression
// This usually means I'm returning something the compiler can't infer the type of, or the Contract.Call is improperly cast, or there's an issue with the "void" vs "object" return.
// Wait! `ExecuteUserOp` has `public static object ExecuteUserOp(...)` but it returns `DispatchContractCall(...)`.
// Let's check DispatchContractCall...

