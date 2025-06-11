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

/***/ 163:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderkind_PAGES_API_page_2Fapi_2Fchat_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fchat_ts_middlewareConfigBase64_e30_3D_),
  routeModule: () => (/* binding */ routeModule)
});

// NAMESPACE OBJECT: ./pages/api/chat.ts
var chat_namespaceObject = {};
__webpack_require__.r(chat_namespaceObject);
__webpack_require__.d(chat_namespaceObject, {
  "default": () => (handler)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/pages-api/module.js
var pages_api_module = __webpack_require__(429);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-kind.js
var route_kind = __webpack_require__(153);
// EXTERNAL MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/helpers.js
var helpers = __webpack_require__(305);
;// CONCATENATED MODULE: ./pages/api/chat.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({
        error: "Method Not Allowed"
    });
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) return res.status(400).json({
            error: "Invalid messages payload"
        });
        if (GEMINI_API_KEY) {
            const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: messages.map((m)=>m.content).join("\n")
                                }
                            ]
                        }
                    ]
                })
            });
            const geminiData = await geminiResponse.json();
            const geminiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (geminiReply) return res.status(200).json({
                reply: geminiReply
            });
        }
        if (GROQ_API_KEY) {
            const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages
                })
            });
            const groqData = await groqResponse.json();
            const groqReply = groqData?.choices?.[0]?.message?.content;
            if (groqReply) return res.status(200).json({
                reply: groqReply
            });
        }
        throw new Error("No valid AI response from Gemini or Groq");
    } catch (err) {
        console.error("[API_CHAT_ERROR]", err);
        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES_API&page=%2Fapi%2Fchat&preferredRegion=&absolutePagePath=private-next-pages%2Fapi%2Fchat.ts&middlewareConfigBase64=e30%3D!
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = pages_api_module.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const next_route_loaderkind_PAGES_API_page_2Fapi_2Fchat_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fchat_ts_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(chat_namespaceObject, "default"));
// Re-export config.
const config = (0,helpers/* hoist */.l)(chat_namespaceObject, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: route_kind/* RouteKind */.x.PAGES_API,
        page: "/api/chat",
        pathname: "/api/chat",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: chat_namespaceObject
});

//# sourceMappingURL=pages-api.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [172], () => (__webpack_exec__(163)));
module.exports = __webpack_exports__;

})();