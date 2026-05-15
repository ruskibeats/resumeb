#!/usr/bin/env python3
"""
Patch Reactive Resume client JS to add a second RSS input field.
Adds a LinkedIn RSS URL input below the JobServe RSS URL input.
"""

client_route = "/opt/reactive-resume/.output/public/assets/route-DNUWPzmn.js"
client_store = "/opt/reactive-resume/.output/public/assets/store-DUD47Fhv.js"
client_ssr = "/opt/reactive-resume/.output/server/_ssr/client-COD2Xpmr.mjs"
server_route = "/opt/reactive-resume/.output/server/_ssr/route-Calewq7U.mjs"

# ============================================================
# 1. PATCH CLIENT STORE - add linkedinRssUrl field
# ============================================================
with open(client_store) as f:
    c = f.read()

changes = 0

# Add linkedinRssUrl to defaults (after jobServeRssUrl)
if ",jobServeRssUrl:`https://www.jobserve" in c:
    c = c.replace(
        ",jobServeRssUrl:`https://www.jobserve",
        ",linkedinRssUrl:`http://192.168.0.178:9099/feed`,jobServeRssUrl:`https://www.jobserve"
    )
    changes += 1

# Add linkedinRssUrl to partialize/persist
if "jobServeRssUrl:state.jobServeRssUrl" in c:
    c = c.replace(
        "jobServeRssUrl:state.jobServeRssUrl",
        "jobServeRssUrl:state.jobServeRssUrl,linkedinRssUrl:state.linkedinRssUrl"
    )
    changes += 1

if changes:
    with open(client_store, "w") as f:
        f.write(c)
    print(f"✅ Store: added linkedinRssUrl ({changes} changes)")
else:
    print("⚠️  Store: no changes made (already patched?)")


# ============================================================
# 2. PATCH CLIENT ROUTE - add LinkedIn input after JobServe input
# ============================================================
with open(client_route) as f:
    line = f.read()

# The pattern right now:
#   <Input id="jobserve-rss-url" ... autoCapitalize:`off`}),
#   <p>description text</p>
# We want:
#   <Input id="jobserve-rss-url" ... autoCapitalize:`off`}),
#   <br/>
#   <Label>LinkedIn RSS URL</Label>
#   <Input id="linkedin-rss-url" ... value={linkedinRssUrl} ... />  
#   <p>description text</p>

# Find the exact insertion point: right after the jobserve input and before the paragraph
insert_before = "autoCapitalize:`off`}),(0,H.jsx)(`p`,{className:`text-xs text-muted-foreground`"

# New LinkedIn RSS input to insert
linkedin_input = """}),(0,H.jsx)(`div`,{className:`mt-2`}),(0,H.jsx)(M,{htmlFor:`linkedin-rss-url`,children:(0,H.jsx)(l,{id:`gahdj3`})}),(0,H.jsx)(T,{id:`linkedin-rss-url`,name:`linkedin-rss-url`,type:`url`,value:o,onChange:t=>e(e=>{e.linkedinRssUrl=t.target.value}),placeholder:`http://192.168.0.178:9099/feed`,autoCorrect:`off`,autoComplete:`off`,spellCheck:`false`,autoCapitalize:`off`}),(0,H.jsx)(`div`,{className:`mt-2`})"""

if insert_before in line:
    line = line.replace(insert_before, linkedin_input + "," + insert_before)
    with open(client_route, "w") as f:
        f.write(line)
    print("✅ Client route: added LinkedIn input field")
else:
    print("⚠️  Client route: insertion point not found")


# ============================================================
# 3. PATCH CLIENT SSR - also add LinkedIn input for server-side rendering
# ============================================================
with open(client_ssr) as f:
    line = f.read()

# Same pattern in SSR
insert_before2 = 'autoCapitalize:"off"}),(0,H.jsx)("p",{className:"text-xs text-muted-foreground"'
linkedin_input2 = '}),(0,H.jsx)("div",{className:"mt-2"}),(0,H.jsx)(A,{htmlFor:"linkedin-rss-url",children:(0,H.jsx)(y,{})}),(0,H.jsx)(N,{id:"linkedin-rss-url",name:"linkedin-rss-url",type:"url",value:o,onChange:t=>e(e=>{e.linkedinRssUrl=t.target.value}),placeholder:"http://192.168.0.178:9099/feed",autoCorrect:"off"}),(0,H.jsx)("div",{className:"mt-2"})'

if insert_before2 in line:
    line = line.replace(insert_before2, linkedin_input2 + "," + insert_before2)
    with open(client_ssr, "w") as f:
        f.write(line)
    print("✅ Client SSR: added LinkedIn input field")
else:
    print("⚠️  Client SSR: insertion point not found")

# ============================================================
# 4. PATCH SERVER ROUTE - add linkedin-rss to dropdown
# ============================================================
with open(server_route) as f:
    line = f.read()

# Add LinkedIn RSS option in the dropdown
old_dropdown = 'value: "jobserve-rss",'
new_dropdown = 'value: "jobserve-rss",},{value: "linkedin-rss",'
if old_dropdown in line:
    line = line.replace(old_dropdown, new_dropdown)
    with open(server_route, "w") as f:
        f.write(line)
    print("✅ Server route: added LinkedIn dropdown option")
else:
    print("⚠️  Server route: dropdown not found")

print("\nDone! Restart Reactive Resume for changes to take effect.")
