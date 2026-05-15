#!/usr/bin/env python3
"""Add LinkedIn RSS input field alongside JobServe RSS input in Reactive Resume."""

client_route = "/opt/reactive-resume/.output/public/assets/route-DNUWPzmn.js"
client_store = "/opt/reactive-resume/.output/public/assets/store-DUD47Fhv.js"
client_ssr = "/opt/reactive-resume/.output/server/_ssr/client-COD2Xpmr.mjs"
server_route = "/opt/reactive-resume/.output/server/_ssr/route-Calewq7U.mjs"

# 1. STORE - add linkedinRssUrl
with open(client_store) as f:
    c = f.read()

if ",linkedinRssUrl:" not in c:
    c = c.replace(
        ",jobServeRssUrl:`https://www.jobserve",
        ",linkedinRssUrl:`http://192.168.0.178:9099/feed`,jobServeRssUrl:`https://www.jobserve"
    )
    c = c.replace(
        "jobServeRssUrl:state.jobServeRssUrl",
        "jobServeRssUrl:state.jobServeRssUrl,linkedinRssUrl:state.linkedinRssUrl"
    )
    with open(client_store, "w") as f:
        f.write(c)
    print("1. Store: linkedinRssUrl added")
else:
    print("1. Store: already patched")


# 2. CLIENT ROUTE - add linkedinRssUrl to destructuring and add second input
with open(client_route) as f:
    line = f.read()

changes = 0

# Add linkedinRssUrl to destructuring
old_dest = "rapidApiKey:n,jobServeRssUrl:r,testStatus:a"
new_dest = "rapidApiKey:n,jobServeRssUrl:r,linkedinRssUrl:o,testStatus:a"
if old_dest in line:
    line = line.replace(old_dest, new_dest)
    changes += 1

if changes:
    # Add second input field
    old_end = "autoCapitalize:`off`}),(0,H.jsx)(`p`,{className:`text-xs text-muted-foreground`"
    new_block = (
        "autoCapitalize:`off`}),(0,H.jsx)(`div`,{className:`mt-2`}),"
        "(0,H.jsx)(M,{htmlFor:`linkedin-rss-url`,children:`LinkedIn RSS URL`}),"
        "(0,H.jsx)(T,{id:`linkedin-rss-url`,name:`linkedin-rss-url`,type:`url`,"
        "value:o,onChange:t=>e(e=>{e.linkedinRssUrl=t.target.value}),"
        "placeholder:`http://192.168.0.178:9099/feed`,autoCorrect:`off`,"
        "autoComplete:`off`,spellCheck:`false`,autoCapitalize:`off`}),"
        "(0,H.jsx)(`div`,{className:`mt-2`}),"
        "(0,H.jsx)(`p`,{className:`text-xs text-muted-foreground`"
    )

    if old_end in line:
        line = line.replace(old_end, new_block)
        changes += 1

    with open(client_route, "w") as f:
        f.write(line)
    print(f"2. Client route: {changes} changes made")
else:
    print("2. Client route: already patched or destructuring not found")


# 3. CLIENT SSR - same changes
with open(client_ssr) as f:
    line = f.read()

changes = 0

old_dest2 = "rapidApiKey:n,jobServeRssUrl:r,testStatus:a"
new_dest2 = "rapidApiKey:n,jobServeRssUrl:r,linkedinRssUrl:o,testStatus:a"
if old_dest2 in line:
    line = line.replace(old_dest2, new_dest2)
    changes += 1

if changes:
    old_end2 = 'autoCapitalize:"off"}),(0,H.jsx)("p",{className:"text-xs text-muted-foreground"'
    new_block2 = (
        'autoCapitalize:"off"}),(0,H.jsx)("div",{className:"mt-2"}),'
        '(0,H.jsx)(A,{htmlFor:"linkedin-rss-url",children:"LinkedIn RSS URL"}),'
        '(0,H.jsx)(N,{id:"linkedin-rss-url",name:"linkedin-rss-url",type:"url",'
        "value:o,onChange:t=>e(e=>{e.linkedinRssUrl=t.target.value}),"
        'placeholder:"http://192.168.0.178:9099/feed",autoCorrect:"off"}),'
        '(0,H.jsx)("div",{className:"mt-2"}),'
        '(0,H.jsx)("p",{className:"text-xs text-muted-foreground"'
    )

    if old_end2 in line:
        line = line.replace(old_end2, new_block2)
        changes += 1

    with open(client_ssr, "w") as f:
        f.write(line)
    print(f"3. Client SSR: {changes} changes made")
else:
    print("3. Client SSR: already patched or destructuring not found")


# 4. SERVER ROUTE - add dropdown option
with open(server_route) as f:
    line = f.read()

if 'value: "linkedin-rss"' not in line:
    line = line.replace(
        'value: "jobserve-rss",',
        'value: "jobserve-rss",},{value: "linkedin-rss",'
    )
    with open(server_route, "w") as f:
        f.write(line)
    print("4. Server route: dropdown option added")
else:
    print("4. Server route: already has linkedin-rss option")

print("\nDone! Restart Reactive Resume to apply.")
