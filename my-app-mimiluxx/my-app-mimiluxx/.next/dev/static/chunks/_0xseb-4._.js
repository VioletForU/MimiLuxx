(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/signup/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SignupPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$authErrors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/authErrors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$AuthShell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/auth/AuthShell.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/auth/fields.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
// Matches the order of the fields on screen, so focus goes to the first problem.
const FIELD_ORDER = [
    "fullName",
    "username",
    "email",
    "password",
    "confirmPassword",
    "detailsConfirmed",
    "termsAgreed"
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;
function validate(v) {
    const errors = {};
    if (v.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!USERNAME_PATTERN.test(v.username.trim())) {
        errors.username = "Use 3 to 20 letters, numbers, dots or underscores.";
    }
    if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = "Enter a valid email address.";
    if (v.password.length < 8) errors.password = "Use at least 8 characters.";
    if (v.confirmPassword !== v.password) errors.confirmPassword = "Passwords don't match.";
    if (!v.detailsConfirmed) errors.detailsConfirmed = "Please confirm your details are correct.";
    if (!v.termsAgreed) errors.termsAgreed = "You need to agree to the Terms and Conditions.";
    return errors;
}
function focusField(key) {
    document.getElementById(key)?.focus();
}
function SignupPage() {
    _s();
    const [values, setValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        detailsConfirmed: false,
        termsAgreed: false
    });
    const [fieldErrors, setFieldErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [formError, setFormError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sentTo, setSentTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    function update(key, value) {
        setValues((prev)=>({
                ...prev,
                [key]: value
            }));
        // Clear a field's error as soon as the person starts fixing it.
        setFieldErrors((prev)=>prev[key] ? {
                ...prev,
                [key]: undefined
            } : prev);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        const errors = validate(values);
        setFieldErrors(errors);
        const firstInvalid = FIELD_ORDER.find((key)=>errors[key]);
        if (firstInvalid) {
            focusField(firstInvalid);
            return;
        }
        setLoading(true);
        const username = values.username.trim();
        const email = values.email.trim();
        // Usernames are unique, so say so up front instead of failing after submit.
        const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
        if (lookupError) {
            setFormError((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$authErrors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyAuthError"])(lookupError.message));
            setLoading(false);
            return;
        }
        if (existing) {
            setFieldErrors({
                username: "That username is already taken."
            });
            setLoading(false);
            focusField("username");
            return;
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password: values.password,
            options: {
                data: {
                    full_name: values.fullName.trim(),
                    username
                }
            }
        });
        setLoading(false);
        if (error) {
            setFormError((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$authErrors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyAuthError"])(error.message));
            return;
        }
        // With email confirmation on, Supabase answers an address that is already
        // registered with a user that has no identities, rather than an error.
        if (data.user && data.user.identities?.length === 0) {
            setFieldErrors({
                email: "An account with this email already exists."
            });
            focusField("email");
            return;
        }
        setSentTo(email);
    }
    if (sentTo) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$AuthShell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            title: "Check your inbox",
            subtitle: `We sent a confirmation link to ${sentTo}.`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-neutral-700",
                        children: "Click the link in that email to confirm your account, then log in. It can take a minute to arrive, and it may land in your spam folder."
                    }, void 0, false, {
                        fileName: "[project]/app/signup/page.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/login",
                        className: "flex w-full items-center justify-center rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black",
                        children: "Go to log in"
                    }, void 0, false, {
                        fileName: "[project]/app/signup/page.tsx",
                        lineNumber: 152,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setSentTo(null),
                        className: "w-full text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline",
                        children: "Used the wrong email? Start over"
                    }, void 0, false, {
                        fileName: "[project]/app/signup/page.tsx",
                        lineNumber: 158,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/signup/page.tsx",
                lineNumber: 147,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/signup/page.tsx",
            lineNumber: 146,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$AuthShell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        title: "Create your account",
        subtitle: "Join your organization on MimiLuxx.",
        footer: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                "Already have an account?",
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "/login",
                    className: "font-semibold text-neutral-900 underline underline-offset-4 hover:text-[#EA2323]",
                    children: "Log in"
                }, void 0, false, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 177,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/signup/page.tsx",
            lineNumber: 175,
            columnNumber: 9
        }, this),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            noValidate: true,
            className: "space-y-5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FormAlert"], {
                    message: formError
                }, void 0, false, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 187,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid gap-5 sm:grid-cols-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TextField"], {
                            id: "fullName",
                            label: "Full name",
                            autoComplete: "name",
                            value: values.fullName,
                            onChange: (e)=>update("fullName", e.target.value),
                            error: fieldErrors.fullName
                        }, void 0, false, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 190,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TextField"], {
                            id: "username",
                            label: "Username",
                            autoComplete: "username",
                            autoCapitalize: "none",
                            spellCheck: false,
                            value: values.username,
                            onChange: (e)=>update("username", e.target.value),
                            error: fieldErrors.username
                        }, void 0, false, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 198,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 189,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TextField"], {
                    id: "email",
                    type: "email",
                    label: "Institutional email",
                    autoComplete: "email",
                    value: values.email,
                    onChange: (e)=>update("email", e.target.value),
                    error: fieldErrors.email
                }, void 0, false, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 210,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PasswordField"], {
                            id: "password",
                            label: "Password",
                            autoComplete: "new-password",
                            hint: "At least 8 characters.",
                            value: values.password,
                            onChange: (e)=>update("password", e.target.value),
                            error: fieldErrors.password
                        }, void 0, false, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 221,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PasswordStrength"], {
                            password: values.password
                        }, void 0, false, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 230,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 220,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PasswordField"], {
                    id: "confirmPassword",
                    label: "Confirm password",
                    autoComplete: "new-password",
                    value: values.confirmPassword,
                    onChange: (e)=>update("confirmPassword", e.target.value),
                    error: fieldErrors.confirmPassword
                }, void 0, false, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 233,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckboxField"], {
                            id: "detailsConfirmed",
                            checked: values.detailsConfirmed,
                            onChange: (e)=>update("detailsConfirmed", e.target.checked),
                            error: fieldErrors.detailsConfirmed,
                            children: "I confirm that the details above are correct."
                        }, void 0, false, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 243,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckboxField"], {
                            id: "termsAgreed",
                            checked: values.termsAgreed,
                            onChange: (e)=>update("termsAgreed", e.target.checked),
                            error: fieldErrors.termsAgreed,
                            children: [
                                "I agree to the ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "Terms and Conditions"
                                }, void 0, false, {
                                    fileName: "[project]/app/signup/page.tsx",
                                    lineNumber: 257,
                                    columnNumber: 28
                                }, this),
                                "."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/signup/page.tsx",
                            lineNumber: 251,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 242,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$auth$2f$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SubmitButton"], {
                    loading: loading,
                    loadingText: "Creating account...",
                    children: "Create account"
                }, void 0, false, {
                    fileName: "[project]/app/signup/page.tsx",
                    lineNumber: 261,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/signup/page.tsx",
            lineNumber: 186,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/signup/page.tsx",
        lineNumber: 171,
        columnNumber: 5
    }, this);
}
_s(SignupPage, "K8JTZumiWUccp0sdG3gUDhma/IU=");
_c = SignupPage;
var _c;
__turbopack_context__.k.register(_c, "SignupPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/BrandLogo.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BrandLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
;
function BrandLogo({ tone = "dark", href = "/" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        "aria-label": "MimiLuxx home",
        className: "inline-flex items-center gap-1.5 no-underline",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "h-8 w-8",
                viewBox: "0 0 28 28",
                fill: "none",
                "aria-hidden": "true",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M4 18V8L9 13L14 8L19 13L24 8V18C24 21 21 24 17 24H11C7 24 4 21 4 18Z",
                        fill: "#EA2323"
                    }, void 0, false, {
                        fileName: "[project]/components/BrandLogo.tsx",
                        lineNumber: 17,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "9",
                        cy: "15",
                        r: "1.5",
                        fill: "#FFFFFF"
                    }, void 0, false, {
                        fileName: "[project]/components/BrandLogo.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "19",
                        cy: "15",
                        r: "1.5",
                        fill: "#FFFFFF"
                    }, void 0, false, {
                        fileName: "[project]/components/BrandLogo.tsx",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/BrandLogo.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `text-xl font-extrabold tracking-tight ${tone === "light" ? "text-white" : "text-neutral-900"}`,
                children: [
                    "Mimi",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[#EA2323]",
                        children: "Luxx"
                    }, void 0, false, {
                        fileName: "[project]/components/BrandLogo.tsx",
                        lineNumber: 29,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/BrandLogo.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/BrandLogo.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = BrandLogo;
var _c;
__turbopack_context__.k.register(_c, "BrandLogo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/auth/AuthShell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AuthShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$BrandLogo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/BrandLogo.tsx [app-client] (ecmascript)");
;
;
const HIGHLIGHTS = [
    {
        title: "Know what's next",
        body: "Tasks ranked by urgency, so the right work is always on top."
    },
    {
        title: "Sign-offs that keep moving",
        body: "Proposals pass through every approval stage with a clear owner."
    },
    {
        title: "Clear accountability",
        body: "See who is responsible for what, at a glance."
    }
];
function AuthShell({ title, subtitle, children, footer }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[#d4d4d4] p-4 text-neutral-900 lg:p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-xl lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1fr_1.1fr]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                    className: "relative hidden flex-col justify-between overflow-hidden bg-[#1f1f1f] p-10 text-white lg:flex",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            "aria-hidden": "true",
                            className: "absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-[#EA2323]/25 blur-3xl"
                        }, void 0, false, {
                            fileName: "[project]/components/auth/AuthShell.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$BrandLogo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                tone: "light"
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 40,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/auth/AuthShell.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-4xl font-extrabold leading-tight tracking-tight",
                                    children: [
                                        "sync your people,",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/components/auth/AuthShell.tsx",
                                            lineNumber: 46,
                                            columnNumber: 15
                                        }, this),
                                        "drive your mission."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/auth/AuthShell.tsx",
                                    lineNumber: 44,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "mt-10 space-y-6",
                                    children: HIGHLIGHTS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: "flex gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    "aria-hidden": "true",
                                                    className: "mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EA2323]"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/auth/AuthShell.tsx",
                                                    lineNumber: 52,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-semibold",
                                                            children: item.title
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/auth/AuthShell.tsx",
                                                            lineNumber: 57,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mt-0.5 text-sm text-neutral-400",
                                                            children: item.body
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/auth/AuthShell.tsx",
                                                            lineNumber: 58,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/auth/AuthShell.tsx",
                                                    lineNumber: 56,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, item.title, true, {
                                            fileName: "[project]/components/auth/AuthShell.tsx",
                                            lineNumber: 51,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/components/auth/AuthShell.tsx",
                                    lineNumber: 49,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/auth/AuthShell.tsx",
                            lineNumber: 43,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "relative text-xs text-neutral-500",
                            children: "© MimiLuxx"
                        }, void 0, false, {
                            fileName: "[project]/components/auth/AuthShell.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/auth/AuthShell.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                    className: "flex flex-col justify-center px-6 py-10 sm:px-12",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto w-full max-w-md",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-8 lg:hidden",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$BrandLogo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                    fileName: "[project]/components/auth/AuthShell.tsx",
                                    lineNumber: 72,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 71,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-extrabold tracking-tight",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 75,
                                columnNumber: 13
                            }, this),
                            subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-2 text-sm text-neutral-600",
                                children: subtitle
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 77,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-8",
                                children: children
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 80,
                                columnNumber: 13
                            }, this),
                            footer && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-8 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600",
                                children: footer
                            }, void 0, false, {
                                fileName: "[project]/components/auth/AuthShell.tsx",
                                lineNumber: 83,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/auth/AuthShell.tsx",
                        lineNumber: 70,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/auth/AuthShell.tsx",
                    lineNumber: 69,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/auth/AuthShell.tsx",
            lineNumber: 32,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/auth/AuthShell.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_c = AuthShell;
var _c;
__turbopack_context__.k.register(_c, "AuthShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/auth/fields.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CheckboxField",
    ()=>CheckboxField,
    "FormAlert",
    ()=>FormAlert,
    "PasswordField",
    ()=>PasswordField,
    "PasswordStrength",
    ()=>PasswordStrength,
    "SubmitButton",
    ()=>SubmitButton,
    "TextField",
    ()=>TextField,
    "scorePassword",
    ()=>scorePassword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const inputBase = "w-full rounded-xl border bg-neutral-100 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 outline-none transition focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";
function inputClasses(hasError) {
    return `${inputBase} ${hasError ? "border-[#EA2323] focus:border-[#EA2323] focus:ring-[#EA2323]/25" : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"}`;
}
function describedBy(id, error, hint) {
    if (error) return `${id}-error`;
    if (hint) return `${id}-hint`;
    return undefined;
}
function FieldMessage({ id, error, hint }) {
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            id: `${id}-error`,
            role: "alert",
            className: "mt-1.5 text-xs font-medium text-[#C41E1E]",
            children: error
        }, void 0, false, {
            fileName: "[project]/components/auth/fields.tsx",
            lineNumber: 32,
            columnNumber: 7
        }, this);
    }
    if (hint) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            id: `${id}-hint`,
            className: "mt-1.5 text-xs text-neutral-500",
            children: hint
        }, void 0, false, {
            fileName: "[project]/components/auth/fields.tsx",
            lineNumber: 39,
            columnNumber: 7
        }, this);
    }
    return null;
}
_c = FieldMessage;
function TextField({ id, label, hint, error, ...input }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                className: "mb-1.5 block text-sm font-medium text-neutral-800",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                id: id,
                name: id,
                "aria-invalid": error ? true : undefined,
                "aria-describedby": describedBy(id, error, hint),
                className: inputClasses(!!error),
                ...input
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldMessage, {
                id: id,
                error: error,
                hint: hint
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 61,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
_c1 = TextField;
function PasswordField({ id, label, hint, error, ...input }) {
    _s();
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                className: "mb-1.5 block text-sm font-medium text-neutral-800",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 71,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        id: id,
                        name: id,
                        type: visible ? "text" : "password",
                        "aria-invalid": error ? true : undefined,
                        "aria-describedby": describedBy(id, error, hint),
                        className: `${inputClasses(!!error)} pr-16`,
                        ...input
                    }, void 0, false, {
                        fileName: "[project]/components/auth/fields.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setVisible((v)=>!v),
                        "aria-label": visible ? "Hide password" : "Show password",
                        className: "absolute inset-y-0 right-0 rounded-r-xl px-4 text-xs font-semibold text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30",
                        children: visible ? "Hide" : "Show"
                    }, void 0, false, {
                        fileName: "[project]/components/auth/fields.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FieldMessage, {
                id: id,
                error: error,
                hint: hint
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
_s(PasswordField, "OGsIWlGlwYpVUqIrDReJ1GWx7rw=");
_c2 = PasswordField;
function CheckboxField({ id, error, children, ...input }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                className: "flex cursor-pointer items-start gap-3 text-sm text-neutral-700",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        id: id,
                        name: id,
                        type: "checkbox",
                        "aria-invalid": error ? true : undefined,
                        "aria-describedby": error ? `${id}-error` : undefined,
                        className: "mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 accent-[#1f1f1f]",
                        ...input
                    }, void 0, false, {
                        fileName: "[project]/components/auth/fields.tsx",
                        lineNumber: 111,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/components/auth/fields.tsx",
                        lineNumber: 120,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: `${id}-error`,
                role: "alert",
                className: "mt-1 pl-7 text-xs font-medium text-[#C41E1E]",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 123,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
_c3 = CheckboxField;
function FormAlert({ message }) {
    if (!message) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "alert",
        className: "rounded-xl border border-[#EA2323]/30 bg-[#EA2323]/10 px-4 py-3 text-sm text-[#9f1515]",
        children: message
    }, void 0, false, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 134,
        columnNumber: 5
    }, this);
}
_c4 = FormAlert;
function SubmitButton({ loading, loadingText, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "submit",
        disabled: loading,
        "aria-busy": loading,
        className: "flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        children: [
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": "true",
                className: "h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 160,
                columnNumber: 9
            }, this),
            loading ? loadingText : children
        ]
    }, void 0, true, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 153,
        columnNumber: 5
    }, this);
}
_c5 = SubmitButton;
function scorePassword(pw) {
    if (pw.length < 8) return 0;
    let score = 1;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}
const STRENGTH_LABELS = [
    "Too short",
    "Weak",
    "Okay",
    "Strong",
    "Very strong"
];
function PasswordStrength({ password }) {
    if (!password) return null;
    const score = scorePassword(password);
    const color = score <= 1 ? "bg-[#EA2323]" : score === 2 ? "bg-amber-500" : "bg-green-600";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-2 flex items-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-1 gap-1",
                "aria-hidden": "true",
                children: [
                    1,
                    2,
                    3,
                    4
                ].map((segment)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `h-1.5 flex-1 rounded-full ${segment <= score ? color : "bg-neutral-300"}`
                    }, segment, false, {
                        fileName: "[project]/components/auth/fields.tsx",
                        lineNumber: 192,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "w-20 text-right text-xs text-neutral-600",
                children: STRENGTH_LABELS[score]
            }, void 0, false, {
                fileName: "[project]/components/auth/fields.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/auth/fields.tsx",
        lineNumber: 189,
        columnNumber: 5
    }, this);
}
_c6 = PasswordStrength;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "FieldMessage");
__turbopack_context__.k.register(_c1, "TextField");
__turbopack_context__.k.register(_c2, "PasswordField");
__turbopack_context__.k.register(_c3, "CheckboxField");
__turbopack_context__.k.register(_c4, "FormAlert");
__turbopack_context__.k.register(_c5, "SubmitButton");
__turbopack_context__.k.register(_c6, "PasswordStrength");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/authErrors.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Turns the raw messages Supabase returns into something a person can act on.
 * Anything we don't recognise is passed through unchanged.
 */ __turbopack_context__.s([
    "friendlyAuthError",
    ()=>friendlyAuthError
]);
function friendlyAuthError(message) {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) {
        return "Incorrect email/username or password.";
    }
    if (m.includes("email not confirmed")) {
        return "Please confirm your email first. Check your inbox for the confirmation link.";
    }
    if (m.includes("user already registered")) {
        return "An account with this email already exists. Try logging in instead.";
    }
    if (m.includes("database error saving new user")) {
        return "We couldn't create your account. That username may already be taken, so try a different one.";
    }
    if (m.includes("error sending") && m.includes("email")) {
        return "We couldn't send the email. Please try again in a few minutes.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
        return "Too many attempts right now. Please wait a few minutes and try again.";
    }
    if (m.includes("auth session missing")) {
        return "This reset link is invalid or has expired. Request a new one.";
    }
    if (m.includes("different from the old password")) {
        return "Your new password must be different from your current one.";
    }
    if (m.includes("failed to fetch") || m.includes("network")) {
        return "Can't reach the server. Check your connection and try again.";
    }
    return message;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0xseb-4._.js.map