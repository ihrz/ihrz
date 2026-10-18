// W4 slice 91 battery: isInvalidSessionError detector exactness, verbatim.
// TS: response.errorCode === 9 || /session/i.test(response.message || "")
function isInvalidSessionError(response) {
	return (
		response.errorCode === 9 || /session/i.test(response.message || "")
	);
}

let pass = 0, fail = 0;
function eq(name, a, b) {
	if (a === b) { pass++; }
	else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
}

eq("I1 code9 any msg", isInvalidSessionError({ errorCode: 9, message: "whatever" }), true);
eq("I2 code9 undefined msg", isInvalidSessionError({ errorCode: 9 }), true);
eq("I3 code9 null msg", isInvalidSessionError({ errorCode: 9, message: null }), true);
eq("I4 code9 empty msg", isInvalidSessionError({ errorCode: 9, message: "" }), true);
eq("I5 lower session", isInvalidSessionError({ message: "Invalid session key" }), true);
eq("I6 upper SESSION", isInvalidSessionError({ message: "SESSION EXPIRED" }), true);
eq("I7 plural Sessions", isInvalidSessionError({ message: "Sessions expired, re-auth" }), true);
eq("I8 embedded obsession", isInvalidSessionError({ message: "obsession detected" }), true);
eq("I9 mixed SeSsIoN", isInvalidSessionError({ message: "SeSsIoN timeout" }), true);
eq("I10 code4 auth fail", isInvalidSessionError({ errorCode: 4, message: "Authentication Failed" }), false);
eq("I11 ok msg", isInvalidSessionError({ message: "ok" }), false);
eq("I12 empty msg", isInvalidSessionError({ message: "" }), false);
eq("I13 both missing", isInvalidSessionError({}), false);
eq("I14 null msg", isInvalidSessionError({ message: null }), false);
eq("I15 string code9 strict", isInvalidSessionError({ errorCode: "9", message: "ok" }), false);
eq("I16 code10 with session msg", isInvalidSessionError({ errorCode: 10, message: "Invalid session key" }), true);
eq("I17 code0 ok", isInvalidSessionError({ errorCode: 0, message: "ok" }), false);
eq("I18 no session phrase", isInvalidSessionError({ message: "No session" }), true);
eq("I19 multiline", isInvalidSessionError({ message: "Session\nkey invalid" }), true);
eq("I20 long-s no-fold", isInvalidSessionError({ message: "ſession expired" }), false);
eq("I21 dotted-capital-I", isInvalidSessionError({ message: "SESSİON" }), false);
eq("I22 dotless-i", isInvalidSessionError({ message: "sessıon" }), false);
eq("I23 fullwidth-s", isInvalidSessionError({ message: "ｓession" }), false);
eq("I24 SESSIONS upper plural", isInvalidSessionError({ message: "SESSIONS" }), true);
eq("I25 capital-sharp-s no-ss-fold", isInvalidSessionError({ message: "seẞion expired" }), false);
eq("I26 lowercase-sharp-s", isInvalidSessionError({ message: "seßion expired" }), false);
eq("I27 fullwidth-upper", isInvalidSessionError({ message: "ＳESSION" }), false);
eq("I28 cyrillic-ie", isInvalidSessionError({ message: "sеssion" }), false);

console.log(`slice-91 battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
