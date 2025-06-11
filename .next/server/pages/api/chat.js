"use strict";
(() => {
var exports = {};
exports.id = 170;
exports.ids = [170];
exports.modules = {

/***/ 730:
/***/ ((module) => {

module.exports = require("next/dist/server/api-utils/node.js");

/***/ }),

/***/ 76:
/***/ ((module) => {

module.exports = require("next/dist/server/future/route-modules/route-module.js");

/***/ }),

/***/ 23:
/***/ ((module) => {

module.exports = import("@google/generative-ai");;

/***/ }),

/***/ 219:
/***/ ((module) => {

module.exports = import("groq-sdk");;

/***/ }),

/***/ 586:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   config: () => (/* binding */ config),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   routeModule: () => (/* binding */ routeModule)
/* harmony export */ });
/* harmony import */ var next_dist_server_future_route_modules_pages_api_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(429);
/* harmony import */ var next_dist_server_future_route_modules_pages_api_module__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_pages_api_module__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(153);
/* harmony import */ var next_dist_build_webpack_loaders_next_route_loader_helpers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(305);
/* harmony import */ var private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(518);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__]);
private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = next_dist_server_future_route_modules_pages_api_module__WEBPACK_IMPORTED_MODULE_0__.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,next_dist_build_webpack_loaders_next_route_loader_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .l)(private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__, "default"));
// Re-export config.
const config = (0,next_dist_build_webpack_loaders_next_route_loader_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .l)(private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__/* .RouteKind */ .x.PAGES_API,
        page: "/api/chat",
        pathname: "/api/chat",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: private_next_pages_api_chat_js__WEBPACK_IMPORTED_MODULE_3__
});

//# sourceMappingURL=pages-api.js.map
__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 518:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var _google_generative_ai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(23);
/* harmony import */ var groq_sdk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(219);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_google_generative_ai__WEBPACK_IMPORTED_MODULE_0__, groq_sdk__WEBPACK_IMPORTED_MODULE_1__]);
([_google_generative_ai__WEBPACK_IMPORTED_MODULE_0__, groq_sdk__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);


const groq = new groq_sdk__WEBPACK_IMPORTED_MODULE_1__.Groq({
    apiKey: process.env.GROQ_API_KEY || ""
});
const genAI = new _google_generative_ai__WEBPACK_IMPORTED_MODULE_0__.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
        return res.status(400).json({
            error: "Missing or invalid message history"
        });
    }
    const cleanMessages = history.map((msg)=>({
            role: msg.role,
            parts: [
                {
                    text: msg.content
                }
            ]
        }));
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-pro"
        });
        const chat = model.startChat({
            history: cleanMessages
        });
        const result = await chat.sendMessage(history[history.length - 1].content);
        const text = result.response.text();
        return res.status(200).json({
            reply: text,
            source: "gemini"
        });
    } catch (geminiErr) {
        if (geminiErr?.response?.status !== 429) {
            return res.status(500).json({
                error: "Gemini failed",
                details: geminiErr.message
            });
        }
        try {
            const messages = history.map((msg)=>({
                    role: msg.role,
                    content: msg.content
                }));
            const completion = await groq.chat.completions.create({
                model: "llama3-70b-8192",
                messages
            });
            const reply = completion.choices[0]?.message?.content || "Sorry, no response.";
            return res.status(200).json({
                reply,
                source: "groq"
            });
        } catch (groqErr) {
            return res.status(503).json({
                error: "Groq failed",
                details: groqErr.message
            });
        }
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [172], () => (__webpack_exec__(586)));
module.exports = __webpack_exports__;

})();