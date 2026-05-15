#!/usr/bin/env python3
"""Patch Reactive Resume compiled chunks to add LinkedIn RSS provider option."""

import sys

# Use full paths from server
files = {
    "client_route": "/opt/reactive-resume/.output/public/assets/route-DNUWPzmn.js",
    "client_store": "/opt/reactive-resume/.output/public/assets/store-DUD47Fhv.js",
    "server_route": "/opt/reactive-resume/.output/server/_ssr/route-Calewq7U.mjs",
    "job_search_ssr": "/opt/reactive-resume/.output/server/_ssr/job-search-Co3V5Ke7.mjs",
    "client_ssr": "/opt/reactive-resume/.output/server/_ssr/client-COD2Xpmr.mjs",
    "job_search_client": "/opt/reactive-resume/.output/public/assets/job-search-DYJtXbUN.js",
}

# ---- 1. Client route (dropdown + LinkedIn input) ----
with open(files["client_route"]) as f:
    c = f.read()

# Add LinkedIn RSS option after JobServe
c = c.replace(
    'value:`jobserve-rss`,children:`JobServe RSS`',
    'value:`jobserve-rss`,children:`JobServe RSS`}),(0,H.jsx)(`option`,{value:`linkedin-rss`,children:`LinkedIn RSS`'
)
# Add LinkedIn RSS input
c = c.replace(
    'placeholder:`https://www.jobserve.com/MySearch/....rss`,autoCorrect:`off`',
    'placeholder:`https://www.jobserve.com/MySearch/....rss`,autoCorrect:`off`})]}),`linkedin-rss`===t&&(0,H.jsxs)(`div`,{className:`flex flex-col gap-y-2`,children:[(0,H.jsx)(M,{htmlFor:`linkedin-rss-url`,children:(0,H.jsx)(l,{id:`gahdj3`})}),(0,H.jsx)(T,{id:`linkedin-rss-url`,name:`linkedin-rss-url`,type:`url`,value:r,onChange:t=>e(e=>{e.jobServeRssUrl=t.target.value}),placeholder:`http://192.168.0.178:9099/feed`,autoCorrect:`off`})]})'
)
with open(files["client_route"], "w") as f:
    f.write(c)
print("✅ client_route: dropdown + LinkedIn input")

# ---- 2. Client store (add linkedin-rss type) ----
with open(files["client_store"]) as f:
    c = f.read()
c = c.replace('`jsearch`,rapidApiKey:`', '`jsearch`||`linkedin-rss`||`jobserve-rss`,rapidApiKey:`')
with open(files["client_store"], "w") as f:
    f.write(c)
print("✅ client_store: type added")

# ---- 3. Server route (add dropdown option + LinkedIn input) ----
with open(files["server_route"]) as f:
    c = f.read()
c = c.replace('value: "jobserve-rss",', 'value: "jobserve-rss",\n\t\t\t\t\t\t},{value: "linkedin-rss",')
# Add LinkedIn input after jobserve input section  
c = c.replace(
    'placeholder: "https://www.jobserve.com/MySearch/....rss",',
    'placeholder: "https://www.jobserve.com/MySearch/....rss",\n\t\t\t\t\t})\n\t\t\t\t]),`linkedin-rss`===t&&m.jsxs("div",{className:"flex flex-col gap-y-2",children:[m.jsx(A,{htmlFor:"linkedin-rss-url",children:m.jsx(y,{})}),m.jsx(N,{id:"linkedin-rss-url",name:"linkedin-rss-url",type:"url",value:r,onChange:t=>e(e=>{e.jobServeRssUrl=t.target.value}),placeholder:"http://192.168.0.178:9099/feed",autoCorrect:"off"})'
)
with open(files["server_route"], "w") as f:
    f.write(c)
print("✅ server_route: dropdown + LinkedIn input")

# ---- 4. Client SSR (factory + zod enum) ----
with open(files["client_ssr"]) as f:
    c = f.read()
# Factory: add linkedin-rss case
c = c.replace(
    'if (options.provider === "jobserve-rss")',
    'if (options.provider === "linkedin-rss") {return new jobserve_rss__WEBPACK_IMPORTED_MODULE_0__.JobServeRssProvider(options.rssUrl)} if (options.provider === "jobserve-rss")'
)
# Zod enum: add linkedin-rss
c = c.replace(
    'zod_default.enum(["jsearch", "jobserve-rss"]).default("jsearch")',
    'zod_default.enum(["jsearch", "jobserve-rss", "linkedin-rss"]).default("jsearch")'
)
with open(files["client_ssr"], "w") as f:
    f.write(c)
print("✅ client_ssr: factory + zod enum")

# ---- 5. Job search SSR + client (zod enum) ----
for key in ["job_search_ssr", "job_search_client"]:
    with open(files[key]) as f:
        c = f.read()
    c = c.replace(
        'zod_default.enum(["jsearch", "jobserve-rss"]).default("jsearch")',
        'zod_default.enum(["jsearch", "jobserve-rss", "linkedin-rss"]).default("jsearch")'
    )
    # Also update the provider check for job search
    c = c.replace(
        'provider === "jobserve-rss"',
        'provider === "jobserve-rss" || provider === "linkedin-rss"'
    )
    with open(files[key], "w") as f:
        f.write(c)
    print(f"✅ {key}: zod enum + provider check")

print("\n🎉 All patches applied! Restarting Reactive Resume...")
